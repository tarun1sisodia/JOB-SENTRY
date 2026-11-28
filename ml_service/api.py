"""HTTP endpoints for JobSentry's trained job-fraud predictor."""

import logging

from fastapi import FastAPI

if __package__:
    from .main import ARTIFACTS, predict_job_risk
    from .shared.models import JobCheckInput, JobCheckOutput
else:
    from main import ARTIFACTS, predict_job_risk
    from shared.models import JobCheckInput, JobCheckOutput


logging.basicConfig(level=logging.INFO)

app = FastAPI(title="JobSentry ML Service")


@app.post("/predict", response_model=JobCheckOutput, response_model_exclude_none=True)
def predict(payload: JobCheckInput) -> JobCheckOutput:
    """Score one job posting and return the shared JobSentry contract."""
    return predict_job_risk(payload)


@app.get("/health")
def health() -> dict[str, object]:
    """Report whether trained inference artifacts loaded at startup."""
    return {
        "status": "ok",
        "model_loaded": ARTIFACTS.available,
        "threshold": ARTIFACTS.threshold if ARTIFACTS.available else None,
    }
