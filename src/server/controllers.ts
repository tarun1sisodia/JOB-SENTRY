import { Request, Response } from 'express';
import {
  JobCheckInputSchema,
  normalizeJobRequest,
  JobCheckOutputSchema,
  ApiErrorResponse,
} from '../shared/contracts';
import { evaluateJobRisk } from './riskEngine';
import { auditStorage } from './storage';

/**
 * Controller: POST /api/analyze (and legacy POST /analyze)
 * Zero-fallback tolerance: schema enforcement before and after computation
 */
export async function analyzeJobController(req: Request, res: Response) {
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

    // 2. Canonical Normalization (camelCase domain logic)
    const normalized = normalizeJobRequest(parseResult.data);

    // 3. Risk Engine Execution
    const evaluation = evaluateJobRisk(normalized);

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
export async function getHistoryController(req: Request, res: Response) {
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
export async function clearHistoryController(_req: Request, res: Response) {
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
 * Controller: GET /api/health
 */
export async function getHealthController(_req: Request, res: Response) {
  return res.status(200).json({
    status: 'healthy',
    service: 'JobSentry Enterprise Risk Engine',
    contractVersion: '2.0.0-zero-fallback',
    stagesSupported: ['staging', 'production'],
    timestamp: new Date().toISOString(),
  });
}
