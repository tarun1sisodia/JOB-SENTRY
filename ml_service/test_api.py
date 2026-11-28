"""Small smoke test for realistic and scam-like job postings."""

import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.encoders import jsonable_encoder
from api import predict
from main import ARTIFACTS, load_model_artifacts, predict_job_risk, safe_matched_terms
from preprocess import transform_text_features
from shared.models import JobCheckInput, JobCheckOutput


REAL_POSTINGS = [
    "Senior software engineer at Northstar Analytics. Build internal reporting tools.",
    "Registered nurse role at Lakeside Medical Center. Apply through the careers portal.",
    "Public school teacher opening with the district. Full-time role with standard benefits.",
    "Mechanical engineer position at Alpine Manufacturing. Review drawings and test equipment.",
    "Library assistant role with County Library Services. Submit a resume through our website.",
]

SCAM_POSTINGS = [
    "Work from home today. Send a laptop deposit before we ship your equipment.",
    "Immediate hiring on Telegram. Pay a processing fee to reserve your position.",
    "Earn thousands weekly with no experience. Contact our recruiter on WhatsApp.",
    "Remote data-entry role. Pay a training fee before starting.",
    "We will hire instantly. Send a security deposit and message us on Telegram.",
]


class PredictionSmokeTests(unittest.TestCase):
    def test_five_real_and_five_scam_like_postings(self):
        """Check valid responses and rule flags for all ten sample postings."""
        for posting in REAL_POSTINGS:
            with self.subTest(kind="real", posting=posting):
                result = predict_job_risk(
                    JobCheckInput(job_text=posting, company="Northstar Analytics")
                )
                self.assertGreaterEqual(result.score, 0)
                self.assertLessEqual(result.score, 1)
                self.assertIsNotNone(result.risk_level)
                self.assertTrue(result.red_flags)

        for posting in SCAM_POSTINGS:
            with self.subTest(kind="scam", posting=posting):
                result = predict_job_risk(
                    JobCheckInput(job_text=posting, company="Sample Hiring Group")
                )
                self.assertGreaterEqual(result.score, 0)
                self.assertLessEqual(result.score, 1)
                self.assertTrue(
                    any(
                        flag
                        in {
                            "Directs recruitment communication to private chat apps",
                            "Demands upfront financial transaction (laptop deposit)",
                            "Demands upfront financial transaction (processing fee)",
                            "Demands upfront financial transaction (training fee)",
                            "Demands upfront financial transaction (security deposit)",
                        }
                        for flag in result.red_flags
                    )
                )

    def test_free_email_scam_posting_has_backend_rule_flags(self):
        """A free recruiter email and scam phrases retain the fallback flags."""
        request = JobCheckInput(
            job_text=(
                "Entry level role with no experience required. "
                "Pay a security deposit and contact the recruiter through wa.me."
            ),
            company="Confidential",
            email="recruiter@gmail.com",
            salary="350000",
            stage="staging",
        )

        result = predict_job_risk(request)

        self.assertIn(
            "Recruiter uses free public email provider instead of corporate domain",
            result.red_flags,
        )
        self.assertIn(
            "Demands upfront financial transaction (security deposit)",
            result.red_flags,
        )
        self.assertIn(
            "Directs recruitment communication to private chat apps",
            result.red_flags,
        )
        self.assertIn("Company identity is masked or undisclosed", result.red_flags)
        self.assertIn(
            "Compensation offered is disproportionate to role requirements",
            result.red_flags,
        )
        factor_ids = {factor.id for factor in result.factors or []}
        self.assertIn("EMAIL_FREE_DOMAIN", factor_ids)
        self.assertIn("PAYMENT_UPFRONT_DEMAND", factor_ids)
        self.assertIn("COMMUNICATION_PRIVATE_CHAT", factor_ids)
        self.assertIn("ENTITY_UNDISCLOSED", factor_ids)

    def test_s3_and_s4_style_postings_are_high_with_consistent_scores(self):
        """Hard payment and sensitive-information signals must force High."""
        postings = [
            JobCheckInput(
                job_text=(
                    "Congratulations! You are selected for Customer Support "
                    "Executive at a leading MNC without any interview. Pay a "
                    "security deposit of 5000 for laptop and ID card, refundable "
                    "after 3 months. Send your Aadhaar and bank details to confirm."
                ),
                email="recruitment.mnc.hr@outlook.com",
                company="",
                salary="45000",
            ),
            JobCheckInput(
                job_text=(
                    "Hiring freshers for back-office roles. Salary 60000 plus "
                    "incentives. No interview. Send your passport copy, bank "
                    "account details and a processing fee of 1500 via UPI to "
                    "receive your offer letter."
                ),
                email="hiring.office@gmail.com",
                company="",
                salary="60000",
            ),
        ]

        for request in postings:
            with self.subTest(posting=request.canonical_job_text):
                result = predict_job_risk(request)
                self.assertEqual(result.risk_level.value, "High")
                self.assertGreaterEqual(result.score, 0.65)

    def test_never_ask_for_payment_does_not_trigger_fee_rule(self):
        """Negated payment statements are excluded from the fee rule."""
        result = predict_job_risk(
            JobCheckInput(
                job_text="We never ask candidates for any payment.",
                company="Northstar Analytics",
            )
        )

        self.assertFalse(
            any("upfront financial transaction" in flag for flag in result.red_flags)
        )
        self.assertFalse(
            any(factor.id == "PAYMENT_UPFRONT_DEMAND" for factor in result.factors or [])
        )

    def test_model_warning_terms_are_limited_to_behavioral_allowlist(self):
        """Category words cannot be surfaced from trained model term reports."""
        matched = safe_matched_terms(
            "Earn money using this phone link; data entry assistant engineering hotel receptionist",
            None,
        )
        self.assertTrue(
            set(matched).issubset(
                {"earn", "money", "link", "url", "phone", "whatsapp", "telegram"}
            )
        )
        self.assertFalse(
            {"data entry", "assistant", "engineering", "hotel", "receptionist"}
            & set(matched)
        )

    def test_threshold_artifacts_are_used_when_model_is_available(self):
        """Confirm a loaded threshold is valid and model flags are coherent."""
        if ARTIFACTS.available:
            self.assertGreater(ARTIFACTS.threshold, 0)
            self.assertLessEqual(ARTIFACTS.threshold, 1)

    def test_company_name_terms_are_never_echoed_as_safe_matches(self):
        """Only approved terms outside the supplied company name may be shown."""
        company = "Remote Deposit Staffing"
        text = "Remote Deposit Staffing asks applicants to pay a fee."
        matches = safe_matched_terms(text, company)
        company_tokens = set(company.lower().split())
        self.assertTrue(set(matches).issubset(ARTIFACTS.safe_words))
        self.assertTrue(
            all(company_tokens.isdisjoint(set(term.split())) for term in matches)
        )

    def test_missing_model_file_uses_keyword_fallback(self):
        """Missing any required artifact should log a warning and disable ML."""
        missing_path = Path("missing-model-artifact")
        with (
            patch("main.MODEL_PATH", missing_path),
            patch("main.VECTORIZER_PATH", missing_path),
            patch("main.THRESHOLD_PATH", missing_path),
            patch("main.SAFE_WORDS_PATH", missing_path),
            self.assertLogs("main", level="WARNING"),
        ):
            artifacts = load_model_artifacts()
        self.assertFalse(artifacts.available)

    def test_predict_response_matches_shared_pydantic_contract(self):
        """Validate the serialized endpoint payload against JobCheckOutput."""
        request = JobCheckInput(
            job_text=(
                "Immediate hiring on Telegram. Pay a laptop deposit before starting."
            ),
            company="Global Logistics",
            email="hr.agent@gmail.com",
            salary="95000",
            stage="production",
        )
        endpoint_result = predict(request)
        # FastAPI removes None fields because the shared JSON schema does not allow null.
        response_payload = jsonable_encoder(
            endpoint_result,
            by_alias=True,
            exclude_none=True,
        )

        validated = JobCheckOutput.model_validate(response_payload)
        self.assertIn("riskLevel", response_payload)
        self.assertIn("risk_level", response_payload)
        self.assertNotIn("factors", response_payload)
        self.assertNotIn("modelType", response_payload)
        self.assertIn(validated.risk_level.value, {"Low", "Medium", "High"})
        self.assertGreaterEqual(validated.score, 0)
        self.assertLessEqual(validated.score, 1)

    def test_short_legitimate_postings_have_model_probability_below_threshold(self):
        """Check model-only scores for short software and bakery job text."""
        self.assertTrue(ARTIFACTS.available, "Deployed model artifacts must be trained.")
        postings = (
            "Software engineer builds and maintains reliable business software.",
            "Small bakery seeks a baker to prepare bread and pastries for customers.",
        )
        for posting in postings:
            with self.subTest(posting=posting):
                features = transform_text_features(posting, ARTIFACTS.vectorizer)
                probability = float(ARTIFACTS.model.predict_proba(features)[0, 1])
                self.assertLess(probability, ARTIFACTS.threshold)

    def test_fee_and_telegram_scam_is_high(self):
        """Hard fee and messaging rules keep a scam posting at High risk."""
        result = predict_job_risk(
            JobCheckInput(
                job_text=(
                    "Urgent hiring. Pay a processing fee to confirm your role "
                    "and contact HR on Telegram."
                ),
                company="Global Hiring",
            )
        )
        self.assertEqual(result.risk_level.value, "High")
        self.assertGreaterEqual(result.score, 0.65)


if __name__ == "__main__":
    unittest.main()
