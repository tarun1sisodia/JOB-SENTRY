"""JobSentry inference using the trained fraud model and keyword checks."""

import csv
import json
import logging
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib

# Add this folder first so local shared models and preprocessing are imported.
SERVICE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SERVICE_DIR))

from preprocess import clean_text, create_prediction_frame, transform_prediction_features
from shared.models import (
    JobCheckInput,
    JobCheckOutput,
    RiskFactorDetail,
    RiskLevel,
    RiskSeverity,
)


LOGGER = logging.getLogger(__name__)
FREE_EMAIL_PROVIDERS = (
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "rediffmail.com",
    "proton.me",
    "protonmail.com",
    "aol.com",
    "zoho.com",
    "mail.com",
    "yandex.com",
)
PAYMENT_KEYWORDS = (
    "registration fee",
    "processing fee",
    "security deposit",
    "training fee",
    "laptop deposit",
    "equipment fee",
    "refundable deposit",
    "activation fee",
)
MESSAGING_KEYWORDS = ("telegram", "whatsapp", "wa.me", "signal", "t.me/")
TASK_KEYWORDS = (
    "like youtube",
    "like videos",
    "rate hotels",
    "review products",
    "daily payout",
    "earn $500/day",
    "daily earning",
)
CRYPTO_KEYWORDS = (
    "usdt",
    "crypto",
    "bitcoin",
    "cashiers check",
    "wire transfer to vendor",
)
MODEL_DIR = SERVICE_DIR / "models"
REPORTS_DIR = SERVICE_DIR / "reports"
MODEL_PATH = MODEL_DIR / "model.joblib"
VECTORIZER_PATH = MODEL_DIR / "vectorizer.joblib"
SCALER_PATH = MODEL_DIR / "scaler.joblib"
THRESHOLD_PATH = MODEL_DIR / "threshold.json"
SAFE_WORDS_PATH = REPORTS_DIR / "user_safe_fraud_words.csv"


@dataclass(frozen=True)
class ModelArtifacts:
    """Model resources loaded once when the service starts."""

    model: Any | None
    vectorizer: Any | None
    scaler: Any | None
    threshold: float
    safe_words: frozenset[str]

    @property
    def available(self) -> bool:
        return (
            self.model is not None
            and self.vectorizer is not None
            and self.scaler is not None
        )


def load_safe_words() -> frozenset[str]:
    """Read only approved, non-company terms for user-facing red flags."""
    if not SAFE_WORDS_PATH.is_file():
        LOGGER.warning(
            "Safe fraud-word list is missing at %s; red flags will not echo "
            "posting terms.",
            SAFE_WORDS_PATH,
        )
        return frozenset()
    with SAFE_WORDS_PATH.open("r", encoding="utf-8", newline="") as safe_file:
        rows = csv.DictReader(safe_file)
        return frozenset(
            clean_text(row.get("word", ""))
            for row in rows
            if row.get("word")
            and str(row.get("is_company_token", "")).strip().lower() == "false"
            and clean_text(row.get("word", ""))
        )


def load_model_artifacts() -> ModelArtifacts:
    """Load all trained files once, or warn and leave rules-only inference active."""
    required_paths = (
        MODEL_PATH,
        VECTORIZER_PATH,
        SCALER_PATH,
        THRESHOLD_PATH,
    )
    missing_paths = [path for path in required_paths if not path.is_file()]
    safe_words = load_safe_words()
    if missing_paths:
        LOGGER.warning(
            "Trained model files are missing (%s); using keyword rules only.",
            ", ".join(str(path) for path in missing_paths),
        )
        return ModelArtifacts(None, None, None, 0.65, safe_words)

    try:
        model = joblib.load(MODEL_PATH)
        vectorizer = joblib.load(VECTORIZER_PATH)
        scaler = joblib.load(SCALER_PATH)
        with THRESHOLD_PATH.open("r", encoding="utf-8") as threshold_file:
            threshold_data = json.load(threshold_file)
        threshold = float(threshold_data["threshold_recall_at_least_0.80"])
        if not 0 < threshold <= 1:
            raise ValueError(f"Model threshold must be in (0, 1], got {threshold}.")
        return ModelArtifacts(model, vectorizer, scaler, threshold, safe_words)
    except (OSError, ValueError, KeyError, TypeError, EOFError) as error:
        LOGGER.warning(
            "Could not load trained model artifacts (%s); using keyword rules only.",
            error,
        )
        return ModelArtifacts(None, None, None, 0.65, safe_words)


# Loading here keeps deserialization out of the request path.
ARTIFACTS = load_model_artifacts()


def safe_matched_terms(text: str, company: str | None) -> list[str]:
    """Return approved terms that do not contain a company-name token."""
    normalized_text = clean_text(text)
    company_tokens = set(clean_text(company or "").split())
    matched = []
    for term in sorted(ARTIFACTS.safe_words, key=lambda value: (-len(value), value)):
        term_tokens = term.split()
        if set(term_tokens).isdisjoint(company_tokens) and re.search(
            rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", normalized_text
        ):
            matched.append(term)
    return matched


def assess_keyword_rules(
    text: str,
    company: str | None,
    email: str | None = None,
    salary: str | None = None,
) -> tuple[float, list[str], list[str], list[RiskFactorDetail]]:
    """Apply the same deterministic indicators, weights, and wording as backend."""
    normalized_text = text.lower()
    normalized_email = (email or "").lower().strip()
    normalized_company = (company or "").strip()
    salary_num = (
        float(re.sub(r"[\$,,\s]", "", salary))
        if salary
        else None
    )

    red_flags = []
    advice = []
    factors = []
    rule_score = 0.12

    email_domain = normalized_email.split("@")[1] if "@" in normalized_email else None
    if email_domain and email_domain in FREE_EMAIL_PROVIDERS:
        red_flags.append(
            "Recruiter uses free public email provider instead of corporate domain"
        )
        advice.append("Verify identity directly through the verified corporate website")
        factors.append(
            RiskFactorDetail(
                id="EMAIL_FREE_DOMAIN",
                severity=RiskSeverity.HIGH,
                category="Identity",
                description=f"Public email host detected: {email_domain}",
            )
        )
        rule_score += 0.35

    matched_payment = next(
        (keyword for keyword in PAYMENT_KEYWORDS if keyword in normalized_text),
        None,
    )
    if matched_payment:
        red_flags.append(
            f"Demands upfront financial transaction ({matched_payment})"
        )
        advice.append("Never transfer money or pay fees for any job opportunity")
        factors.append(
            RiskFactorDetail(
                id="PAYMENT_UPFRONT_DEMAND",
                severity=RiskSeverity.CRITICAL,
                category="Financial",
                description=f'Detected upfront fee keyword: "{matched_payment}"',
            )
        )
        rule_score += 0.45

    matched_messaging = next(
        (keyword for keyword in MESSAGING_KEYWORDS if keyword in normalized_text),
        None,
    )
    if matched_messaging:
        red_flags.append("Directs recruitment communication to private chat apps")
        advice.append(
            "Avoid employment processes conducted exclusively through chat channels"
        )
        factors.append(
            RiskFactorDetail(
                id="COMMUNICATION_PRIVATE_CHAT",
                severity=RiskSeverity.HIGH,
                category="Channel",
                description=(
                    f'Detected unmonitored communication tool: "{matched_messaging}"'
                ),
            )
        )
        rule_score += 0.3

    matched_task = next(
        (keyword for keyword in TASK_KEYWORDS if keyword in normalized_text),
        None,
    )
    if matched_task or (
        "no experience" in normalized_text and "high pay" in normalized_text
    ):
        red_flags.append(
            "Promises inflated daily earnings for trivial online tasks"
        )
        advice.append(
            "Task rating schemes frequently transition into crypto deposit traps"
        )
        factors.append(
            RiskFactorDetail(
                id="TASK_SCAM_MARKER",
                severity=RiskSeverity.HIGH,
                category="Structure",
                description=(
                    "Pattern matches standard click-farm and rating scam operations"
                ),
            )
        )
        rule_score += 0.3

    matched_crypto = next(
        (keyword for keyword in CRYPTO_KEYWORDS if keyword in normalized_text),
        None,
    )
    if matched_crypto:
        red_flags.append(
            "Instructs cryptocurrency transfers or third-party cheque cashing"
        )
        advice.append(
            "Cheque overpayment and crypto routing are common money mule schemes"
        )
        factors.append(
            RiskFactorDetail(
                id="FINANCIAL_LAUNDERING_RISK",
                severity=RiskSeverity.CRITICAL,
                category="Banking",
                description=(
                    "Contains non-standard settlement mechanism: "
                    f'"{matched_crypto}"'
                ),
            )
        )
        rule_score += 0.4

    if (
        not normalized_company
        or normalized_company.lower() in ("confidential", "hiring agency")
    ):
        red_flags.append("Company identity is masked or undisclosed")
        advice.append(
            "Demand registered business entity details and physical address verification"
        )
        factors.append(
            RiskFactorDetail(
                id="ENTITY_UNDISCLOSED",
                severity=RiskSeverity.MEDIUM,
                category="Governance",
                description="Absence of explicit corporate identity",
            )
        )
        rule_score += 0.15

    if salary_num and salary_num > 300000 and (
        "entry level" in normalized_text or "no experience" in normalized_text
    ):
        red_flags.append(
            "Compensation offered is disproportionate to role requirements"
        )
        rule_score += 0.2

    rule_score = min(0.98, max(0.08, round(rule_score, 2)))

    # Echo posting terms only when the explainability list explicitly allows them.
    matched_terms = safe_matched_terms(text, company)
    if matched_terms:
        red_flags.append(f"Approved warning terms found: {', '.join(matched_terms)}")

    if red_flags:
        advice.append(
            "Never send identity scans or banking credentials before signing formal verified agreements"
        )
    else:
        red_flags.append("No primary high-risk triggers detected in text")
        advice.append(
            "Verify recruiter on LinkedIn and confirm posting on official careers site"
        )

    return rule_score, red_flags, advice, factors


def predict_job_risk(payload: JobCheckInput) -> JobCheckOutput:
    """Use trained probabilities when available, with keyword rules as support."""
    text = payload.canonical_job_text
    rule_score, red_flags, advice, factors = assess_keyword_rules(
        text, payload.company, payload.email, payload.salary
    )

    if ARTIFACTS.available:
        frame = create_prediction_frame(text, payload.salary)
        features = transform_prediction_features(
            frame, ARTIFACTS.vectorizer, ARTIFACTS.scaler
        )
        fake_class_index = list(ARTIFACTS.model.classes_).index(1)
        model_prob = float(
            ARTIFACTS.model.predict_proba(features)[0, fake_class_index]
        )
        score = 0.7 * model_prob + 0.3 * rule_score

        # Use the saved threshold to map model probability to the risk level.
        if model_prob >= ARTIFACTS.threshold:
            risk_level = RiskLevel.HIGH
        elif model_prob >= 0.5 * ARTIFACTS.threshold:
            risk_level = RiskLevel.MEDIUM
        else:
            risk_level = RiskLevel.LOW

        # A strong model signal must never be downgraded by score blending.
        if model_prob >= ARTIFACTS.threshold:
            risk_level = RiskLevel.HIGH
    else:
        # Preserve the old rule-based levels when trained files are unavailable.
        model_prob = rule_score
        score = rule_score
        risk_level = (
            RiskLevel.HIGH
            if rule_score >= 0.65
            else RiskLevel.MEDIUM
            if rule_score >= 0.35
            else RiskLevel.LOW
        )

    if not red_flags:
        red_flags.append("No primary scam triggers detected")
        advice.append("Verify recruiter credentials through official company channels")

    evaluated_at = datetime.now(timezone.utc).isoformat()
    return JobCheckOutput(
        riskLevel=risk_level,
        risk_level=risk_level,
        score=max(0.0, min(1.0, float(score))),
        redFlags=red_flags,
        red_flags=red_flags,
        advice=list(dict.fromkeys(advice)),
        factors=factors if payload.stage.value == "staging" else None,
        stage=payload.stage,
        evaluatedAt=evaluated_at,
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    sample_input = JobCheckInput(
        job_text="Immediate hiring on Telegram. Pay a laptop deposit before starting.",
        email="hr.agent@gmail.com",
        company="Global Logistics",
        salary="95000",
    )
    result = predict_job_risk(sample_input)
    print(f"Risk: {result.risk_level.value} (Score: {result.score:.3f})")
    print(f"Flags: {result.red_flags}")
