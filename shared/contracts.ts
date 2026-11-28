import { z } from 'zod';

/**
 * JobSentry shared contracts (single source of truth)
 * Zero-fallback tolerance with dual casing support (camelCase domain <-> snake_case wire)
 */

export type AppStage = 'staging' | 'production';

// Strict RFC 5322 regex for email validation
export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Salary validator allowing numeric strings or positive numbers
export const salaryStringSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (val === '') return true;
      const cleaned = val.replace(/[\$,,\s]/g, '');
      return !isNaN(Number(cleaned)) && Number(cleaned) >= 0;
    },
    { message: 'Salary must be a positive numeric value or left blank' }
  )
  .optional();

/**
 * Shared Input Schema (supports both camelCase and snake_case without fallback)
 */
export const JobCheckInputSchema = z
  .object({
    jobText: z.string().trim().min(10, 'Job description must be at least 10 characters').optional(),
    job_text: z.string().trim().min(10, 'Job description must be at least 10 characters').optional(),

    email: z
      .string()
      .trim()
      .transform((val) => (val === '' ? undefined : val))
      .pipe(z.string().regex(emailRegex, 'Please provide a valid email format').optional())
      .optional(),

    company: z.string().trim().max(120, 'Company name too long').optional(),

    salary: salaryStringSchema,

    stage: z.enum(['staging', 'production']).default('production'),
  })
  .refine((data) => Boolean(data.jobText || data.job_text), {
    message: 'Job text is required (supply either jobText or job_text)',
    path: ['jobText'],
  });

export type JobCheckInput = z.infer<typeof JobCheckInputSchema>;

/**
 * Canonical Internal Domain Request (Strict camelCase)
 */
export interface NormalizedJobRequest {
  jobText: string;
  email?: string;
  company?: string;
  salary?: string;
  stage: AppStage;
}

/**
 * Normalization helper
 */
export function normalizeJobRequest(raw: JobCheckInput): NormalizedJobRequest {
  const text = (raw.jobText || raw.job_text || '').trim();
  return {
    jobText: text,
    email: raw.email ? raw.email.trim() : undefined,
    company: raw.company ? raw.company.trim() : undefined,
    salary: raw.salary ? raw.salary.trim() : undefined,
    stage: raw.stage || 'production',
  };
}

/**
 * Risk Assessment Output Schemas
 */
export const RiskLevelSchema = z.enum(['Low', 'Medium', 'High']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const RiskFactorDetailSchema = z.object({
  id: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string(),
  description: z.string(),
});
export type RiskFactorDetail = z.infer<typeof RiskFactorDetailSchema>;

export const JobCheckOutputSchema = z.object({
  riskLevel: RiskLevelSchema,
  risk_level: RiskLevelSchema, // wire compatibility
  score: z.number().min(0).max(1),
  redFlags: z.array(z.string()),
  red_flags: z.array(z.string()), // wire compatibility
  advice: z.array(z.string()),
  factors: z.array(RiskFactorDetailSchema).optional(),
  modelType: z.enum(['hybrid-gemini-2.5-flash', 'hybrid-gemini-3.8-flash', 'deterministic-nlp-rules', 'scikit-learn-tfidf']).default('hybrid-gemini-2.5-flash'),
  stage: z.enum(['staging', 'production']),
  evaluatedAt: z.string(),
});
export type JobCheckOutput = z.infer<typeof JobCheckOutputSchema>;

/**
 * Database Audit Record Interface
 */
export interface JobAuditRecord {
  id: string;
  jobText: string;
  email: string | null;
  company: string | null;
  salary: string | null;
  riskLevel: RiskLevel;
  score: number;
  redFlags: string[];
  advice: string[];
  stage: AppStage;
  createdAt: string;
}

export interface ResearchConfusionCounts {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface ResearchTestMetric {
  threshold_name: string;
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  pr_auc: number;
  confusion: ResearchConfusionCounts;
}

export interface ResearchAblationMetric {
  split: string;
  config: string;
  description: string;
  threshold_name: string;
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  pr_auc: number;
}

export interface ResearchCrossValidationMetric {
  cv_type: string;
  precision_mean: number;
  precision_std: number;
  recall_mean: number;
  recall_std: number;
  f1_mean: number;
  f1_std: number;
}

export interface ResearchDeployedMetric extends ResearchTestMetric {
  model: string;
}

export interface ResearchCoefficient {
  feature: string;
  coefficient: number;
}

export interface ResearchMetricsExport {
  testSet: {
    total_postings: number;
    fraudulent: number;
  };
  researchModel: {
    config: string;
    test_metrics: ResearchTestMetric[];
  };
  ablation_metrics: ResearchAblationMetric[];
  grouped_cv: ResearchCrossValidationMetric[];
  deployed_metrics: ResearchDeployedMetric[];
  deployed_coefficients: {
    positive: ResearchCoefficient[];
    negative: ResearchCoefficient[];
  };
}

/**
 * Standard API Error Response
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
  stage: AppStage;
  timestamp: string;
}
