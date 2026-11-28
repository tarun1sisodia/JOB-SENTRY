import { Request, Response as ExpressResponse } from 'express';
import { readFile } from 'node:fs/promises';
import {
  JobCheckInputSchema,
  normalizeJobRequest,
  JobCheckOutputSchema,
  ApiErrorResponse,
  ResearchMetricsExport,
  NormalizedJobRequest,
  JobCheckOutput,
} from './shared/contracts';
import { evaluateJobRisk } from './riskEngine';
import { auditStorage } from './storage';

const ML_SERVICE_TIMEOUT_MS = 5_000;

function getMlServiceUrl(): string {
  return (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
}

async function requestMlPrediction(
  normalized: NormalizedJobRequest
): Promise<globalThis.Response> {
  return fetch(`${getMlServiceUrl()}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalized),
    signal: AbortSignal.timeout(ML_SERVICE_TIMEOUT_MS),
  });
}

function isMlServiceUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    error instanceof TypeError ||
    error.message.startsWith('ML service returned HTTP 5')
  );
}

/**
 * Controller: POST /api/analyze (and legacy POST /analyze)
 * ML service inference with a deterministic local fallback
 */
export async function analyzeJobController(req: Request, res: ExpressResponse) {
  try {
    // 1. Ingress Validation (Zero Fallback)
    const parseResult = JobCheckInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      const errorPayload: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The submitted request violated the hard schema contract.',
          details: errorDetails,
        },
        stage: (req.body?.stage as any) === 'staging' ? 'staging' : 'production',
        timestamp: new Date().toISOString(),
      };

      return res.status(400).json(errorPayload);
    }

    // 2. Canonical Normalization
    const normalized = normalizeJobRequest(parseResult.data);

    // 3. Ask the ML service, and use local rules only when it is unavailable.
    let evaluation: JobCheckOutput;
    try {
      const mlResponse = await requestMlPrediction(normalized);
      if (mlResponse.status >= 500) {
        throw new Error(`ML service returned HTTP ${mlResponse.status}`);
      }
      if (!mlResponse.ok) {
        return res.status(502).json({
          error: {
            code: 'ML_SERVICE_REQUEST_FAILED',
            message: `ML service rejected the request with HTTP ${mlResponse.status}.`,
          },
          stage: normalized.stage,
          timestamp: new Date().toISOString(),
        });
      }

      const rawMlResponse = await mlResponse.text();
      let mlPayload: unknown;
      try {
        mlPayload = JSON.parse(rawMlResponse);
      } catch {
        console.error(
          '[CRITICAL] ML service returned invalid JSON:',
          rawMlResponse
        );
        return res.status(502).json({
          error: {
            code: 'ML_CONTRACT_EGRESS_VIOLATION',
            message: 'ML service returned a payload incompatible with the shared contract.',
          },
          stage: normalized.stage,
          timestamp: new Date().toISOString(),
        });
      }

      const mlEgressCheck = JobCheckOutputSchema.safeParse(mlPayload);
      if (!mlEgressCheck.success) {
        console.error('[CRITICAL] ML service contract breach:', {
          issues: mlEgressCheck.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            expected: 'expected' in issue ? issue.expected : undefined,
            received: 'input' in issue ? issue.input : undefined,
          })),
          rawResponse: rawMlResponse,
        });
        return res.status(502).json({
          error: {
            code: 'ML_CONTRACT_EGRESS_VIOLATION',
            message: 'ML service returned a payload incompatible with the shared contract.',
          },
          stage: normalized.stage,
          timestamp: new Date().toISOString(),
        });
      }
      evaluation = mlEgressCheck.data;
    } catch (error: unknown) {
      if (!isMlServiceUnavailable(error)) {
        throw error;
      }
      console.warn(
        '[ML Service] Prediction unavailable; using deterministic risk engine:',
        error
      );
      evaluation = evaluateJobRisk(normalized);
    }

    // 4. Egress Validation (Zero Fallback Guarantee)
    const egressCheck = JobCheckOutputSchema.safeParse(evaluation);
    if (!egressCheck.success) {
      console.error('[CRITICAL] Egress Contract Breach:', egressCheck.error);
      return res.status(500).json({
        error: {
          code: 'CONTRACT_EGRESS_VIOLATION',
          message: 'Backend produced a payload incompatible with the shared contract.',
        },
        stage: normalized.stage,
        timestamp: new Date().toISOString(),
      });
    }

    // 5. Audit Logging Persistence
    const record = auditStorage.saveCheck(normalized, evaluation);

    // 6. Return verified response
    return res.status(200).json({
      success: true,
      data: evaluation,
      record,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMsg,
      },
      stage: 'production',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Controller: GET /api/history (and legacy GET /history)
 */
export async function getHistoryController(req: Request, res: ExpressResponse) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const records = auditStorage.listChecks(limit);
    return res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: {
        code: 'HISTORY_FETCH_FAILED',
        message: err instanceof Error ? err.message : 'Failed to retrieve audit history',
      },
      stage: 'production',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Controller: DELETE /api/history
 */
export async function clearHistoryController(_req: Request, res: ExpressResponse) {
  try {
    auditStorage.clear();
    return res.status(200).json({
      success: true,
      message: 'Inspection history database cleared successfully',
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: {
        code: 'CLEAR_FAILED',
        message: err instanceof Error ? err.message : 'Failed to clear history',
      },
      stage: 'production',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Controller: GET /api/research/metrics
 * Supplies academic empirical benchmarks and model evaluation metrics for research presentation
 */
export async function getResearchMetricsController(_req: Request, res: ExpressResponse) {
  try {
    const report = await readFile(
      new URL('../public/research-metrics.json', import.meta.url),
      'utf8'
    );
    const metrics = JSON.parse(report) as ResearchMetricsExport;
    return res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    console.error('Failed to load exported research metrics:', error);
    return res.status(503).json({
      success: false,
      error: 'Research metrics are unavailable. Export the reports before serving them.',
    });
  }
}

/**
 * Controller: GET /api/health
 */
export async function getHealthController(_req: Request, res: ExpressResponse) {
  return res.status(200).json({
    status: 'healthy',
    service: 'JobSentry Backend Service',
    contractVersion: '2.0.0-zero-fallback',
    stagesSupported: ['staging', 'production'],
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    sharedSource: '/backend/shared/contracts',
    timestamp: new Date().toISOString(),
  });
}
