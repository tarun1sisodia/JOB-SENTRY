# Local prototype services

This repository is documented as a locally run prototype, not as a deployed model service. The existing `render.yaml` describes a Node API service only; it does not provision the Python/FastAPI ML service or its model. It is not a full-stack model deployment configuration.

## Run the ML service

From the repository root, install the Python dependencies and start FastAPI:

```bash
python -m pip install -r ml_service/requirements.txt
python -m uvicorn ml_service.api:app --host 127.0.0.1 --port 8000
```

## Run the frontend and backend

In another terminal, install JavaScript dependencies and start the Express/Vite application:

```bash
npm install
npm run dev
```

The frontend and backend run together through `server.ts`. The backend expects the ML service at its local default address. If that service is unavailable, the backend uses its deterministic rule-engine fallback.

## Train and export

```bash
python ml_service/train.py --pipeline research
python ml_service/train.py --pipeline deployed
python ml_service/train.py --pipeline all
python scripts/export-metrics.py
```

Training metrics are written under `ml_service/reports/`. The export script generates `public/research-metrics.json` for the dashboard.
