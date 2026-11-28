# JobSentry architecture

JobSentry is a locally run prototype with a React/TypeScript frontend, a Node.js/Express backend, and a Python/FastAPI ML service.

## Request flow

1. The frontend submits posting text and optional recruiter details to the Express API.
2. Express validates the request and asks the FastAPI service for an assessment.
3. The FastAPI service uses the app's text-only prototype model and applies deterministic rules for explanations.
4. If the FastAPI service is unavailable, Express evaluates the request with its deterministic rule engine.
5. Express stores the result in the local audit-history store and returns it to the frontend.

The rule-based fallback is separate from the model. The explanation layer reports detected indicators; it does not display per-posting model-feature contributions.

## Models

The research pipeline trains TF-IDF Logistic Regression with SMOTE and seven metadata features. The app uses a separate text-only prototype model stored under `ml_service/models/deployed/`. Training and inference are local workflows; this repository does not provision the Python service or model for deployment.

## Local commands

Run the FastAPI service from the repository root:

```bash
python -m pip install -r ml_service/requirements.txt
python -m uvicorn ml_service.api:app --host 127.0.0.1 --port 8000
```

Run the frontend and Express backend in another terminal:

```bash
npm install
npm run dev
```

Train the research or text-only pipeline:

```bash
python ml_service/train.py --pipeline research
python ml_service/train.py --pipeline deployed
python ml_service/train.py --pipeline all
```

Regenerate the dashboard data:

```bash
python scripts/export-metrics.py
```

The measured results are in `ml_service/reports/metrics.csv`, `ablation_metrics.csv`, `grouped_cv.csv`, and `deployed_metrics.csv`.
