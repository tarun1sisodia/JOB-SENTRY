# JobSentry

JobSentry is a locally run prototype for reviewing job-posting risk indicators. It consists of a React/TypeScript frontend, a Node.js/Express backend, and a Python/FastAPI ML service.

## What exists

- The research pipeline trains a TF-IDF Logistic Regression model with SMOTE and seven metadata features.
- The app uses a separate text-only prototype model from `ml_service/models/deployed/`.
- The ML service adds rule-based explanations to its prediction.
- If the FastAPI service is unavailable, the Express backend falls back to its deterministic rule engine.
- Research metrics are read from the CSV reports in `ml_service/reports/`; the dashboard JSON is generated from those reports and the deployed model coefficients.

This repository describes a local prototype. It does not configure deployment of the Python ML service or its model.

## Run locally

Install the JavaScript dependencies:

```bash
npm install
```

In one terminal, install the Python dependencies and run the FastAPI service from the repository root:

```bash
python -m pip install -r ml_service/requirements.txt
python -m uvicorn ml_service.api:app --host 127.0.0.1 --port 8000
```

In another terminal, run the React frontend and Express backend:

```bash
npm run dev
```

The local web application is available at `http://localhost:3000`. If the ML service is not running, the Express backend uses its deterministic rule-engine fallback.

## Train models and refresh metrics

Run the training pipeline you need:

```bash
python ml_service/train.py --pipeline research
python ml_service/train.py --pipeline deployed
python ml_service/train.py --pipeline all
```

Export the reports and deployed-model coefficients for the dashboard:

```bash
python scripts/export-metrics.py
```

The dashboard data is written to `public/research-metrics.json`. Measured results are recorded in:

- `ml_service/reports/metrics.csv`
- `ml_service/reports/ablation_metrics.csv`
- `ml_service/reports/grouped_cv.csv`
- `ml_service/reports/deployed_metrics.csv`

Build the frontend and backend bundle with `npm run build`.
