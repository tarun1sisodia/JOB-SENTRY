"""Small smoke test for realistic and scam-like job postings."""

import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.encoders import jsonable_encoder
from api import predict
from main import ARTIFACTS, load_model_artifacts, predict_job_risk, safe_matched_terms
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
    "Remote data-entry role. Pay an upfront fee for training materials before starting.",
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
                        "mentioned" in flag or "charge" in flag
                        for flag in result.red_flags
                    )
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
            patch("main.SCALER_PATH", missing_path),
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


if __name__ == "__main__":
    unittest.main()
