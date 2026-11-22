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
    text: str, company: str | None
) -> tuple[float, list[str], list[str], list[RiskFactorDetail]]:
    """Keep the original scam triggers and return generic, privacy-safe flags."""
    normalized_text = text.lower()
    has_channel_trigger = "telegram" in normalized_text or "whatsapp" in normalized_text
    has_payment_trigger = "fee" in normalized_text or "deposit" in normalized_text
    rule_score = min(
        0.98,
        0.12 + (0.35 if has_channel_trigger else 0) + (0.45 if has_payment_trigger else 0),
    )
    red_flags = []
    advice = []
    factors = []

    if has_channel_trigger:
        red_flags.append("Unverified messaging channel mentioned in the posting")
        advice.append(
            "Verify recruiter contact details through the company's official channels"
        )
        factors.append(
            RiskFactorDetail(
                id="ML_CHAT_ISOLATION",
                severity=RiskSeverity.HIGH,
                category="Channel",
                description="The posting mentions a private messaging channel",
            )
        )

    if has_payment_trigger:
        red_flags.append("Possible upfront payment or equipment charge")
        advice.append("Do not pay fees or deposits to apply for or start a job")
        factors.append(
            RiskFactorDetail(
                id="ML_FEE_SOLICITATION",
                severity=RiskSeverity.CRITICAL,
                category="Financial",
                description="The posting may request money before work begins",
            )
        )

    # Echo posting terms only when the explainability list explicitly allows them.
    matched_terms = safe_matched_terms(text, company)
    if matched_terms:
        red_flags.append(f"Approved warning terms found: {', '.join(matched_terms)}")

    return rule_score, red_flags, advice, factors


def predict_job_risk(payload: JobCheckInput) -> JobCheckOutput:
    """Use trained probabilities when available, with keyword rules as support."""
    text = payload.canonical_job_text
    rule_score, red_flags, advice, factors = assess_keyword_rules(
        text, payload.company
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
