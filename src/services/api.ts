import { AnalyzeRequest, AnalyzeResponse, JobCheckRecord, RiskLevel } from '../types';

const STORAGE_KEY = 'jobsentry_checks_db';

// Validation helper functions
export function validateJobInput(data: AnalyzeRequest): { isValid: boolean; error?: string; field?: string } {
  if (!data.job_text || data.job_text.trim().length === 0) {
    return {
      isValid: false,
      error: 'Job description text is required. Please paste or enter the job posting.',
      field: 'job_text',
    };
  }

  if (data.email && data.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      return {
        isValid: false,
        error: 'Please enter a valid email address (e.g. recruiter@company.com).',
        field: 'email',
      };
    }
  }

  if (data.salary && data.salary.trim().length > 0) {
    // Check if it's numeric or valid number
    const cleanSalary = data.salary.trim().replace(/[$,,\s]/g, '');
    const isNum = !isNaN(Number(cleanSalary)) && cleanSalary.length > 0;
    if (!isNum) {
      return {
        isValid: false,
        error: 'Salary must be a valid numeric value or left blank.',
        field: 'salary',
      };
    }
  }

  return { isValid: true };
}

// Frozen contract default response according to README specification
export const FROZEN_MVP_RESPONSE: AnalyzeResponse = {
  risk_level: 'High',
  score: 0.78,
  red_flags: ['Free email domain', 'Asks for registration fee'],
  advice: ['Never pay for a job', 'Verify the company website'],
};

// Heuristic analysis engine (when enabled for testing various risk levels)
export function analyzeWithHeuristics(req: AnalyzeRequest): AnalyzeResponse {
  const text = req.job_text.toLowerCase();
  const email = (req.email || '').toLowerCase().trim();
  const company = (req.company || '').trim();
  const salaryNum = req.salary ? parseFloat(req.salary.replace(/[$,,\s]/g, '')) : null;

  const redFlags: string[] = [];
  const advice: string[] = [];
  let score = 0.15; // baseline low risk

  // 1. Email checks
  const freeEmailProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com', 'proton.me', 'aol.com'];
  const emailDomain = email.split('@')[1];
  if (emailDomain && freeEmailProviders.includes(emailDomain)) {
    redFlags.push('Recruiter uses a free public email domain rather than a corporate domain');
    advice.push('Authentic corporate recruiters almost always communicate from an official corporate domain (e.g., @microsoft.com)');
    score += 0.35;
  }

  // 2. Upfront payment / Registration fee
  if (
    text.includes('registration fee') ||
    text.includes('processing fee') ||
    text.includes('security deposit') ||
    text.includes('training fee') ||
    text.includes('laptop deposit') ||
    text.includes('equipment fee')
  ) {
    redFlags.push('Demands upfront payment, registration fee, or equipment deposit');
    advice.push('Legitimate employers NEVER ask candidates to pay any registration, interview, or equipment fees');
    score += 0.45;
  }

  // 3. Telegram / WhatsApp messaging
  if (
    text.includes('telegram') ||
    text.includes('whatsapp') ||
    text.includes('wa.me') ||
    text.includes('signal')
  ) {
    redFlags.push('Directs communication exclusively via Telegram or WhatsApp messaging apps');
    advice.push('Avoid job offers conducted solely over encrypted chat channels with no formal video or in-person interview');
    score += 0.3;
  }

  // 4. Guaranteed high salary for low effort
  if (
    text.includes('no experience required') &&
    (text.includes('daily payout') || text.includes('earn $500/day') || text.includes('earn 5000/day') || text.includes('part-time high pay'))
  ) {
    redFlags.push('Unrealistic earnings promised for minimal skills or low commitment');
    advice.push('Compare compensation with industry benchmarks on Glassdoor, Levels.fyi, or LinkedIn');
    score += 0.25;
  }

  // 5. Crypto / wire transfer / check cashing
  if (
    text.includes('crypto') ||
    text.includes('bitcoin') ||
    text.includes('usdt') ||
    text.includes('cashiers check') ||
    text.includes('wire transfer')
  ) {
    redFlags.push('Mentions cryptocurrency payouts, cashier checks, or money transferring');
    advice.push('Check-cashing and crypto-purchasing assignments are common money mule scams');
    score += 0.4;
  }

  // 6. Generic or missing company
  if (!company || company.toLowerCase() === 'confidential' || company.toLowerCase() === 'hiring agency') {
    redFlags.push('Company identity is vague or not clearly disclosed');
    advice.push('Always demand verifiable company credentials, registered address, and official LinkedIn page');
    score += 0.15;
  }

  // 7. Salary anomaly
  if (salaryNum && salaryNum > 350000 && text.includes('entry level')) {
    redFlags.push('Salary offered is abnormally high compared to entry-level market standards');
    score += 0.2;
  }

  // Normalize score between 0.05 and 0.98
  score = Math.min(0.98, Math.max(0.08, parseFloat(score.toFixed(2))));

  let risk_level: RiskLevel = 'Low';
  if (score >= 0.65) {
    risk_level = 'High';
  } else if (score >= 0.35) {
    risk_level = 'Medium';
  }

  if (redFlags.length === 0) {
    advice.push('The posting does not show prominent red flags, but always verify contract terms');
    advice.push('Verify recruiter on LinkedIn and check official careers portal before sending private data');
  } else {
    advice.push('Do not share bank credentials, OTPs, or passport copies until identity is confirmed');
    advice.push('Look up the company on cybercrime warning lists or job board fraud reports');
  }

  return {
    risk_level,
    score,
    red_flags: redFlags.length > 0 ? redFlags : ['No overt automated red flags detected'],
    advice: Array.from(new Set(advice)),
  };
}

// Database Layer (SQLite equivalent in browser localStorage)
export function getStoredChecks(): JobCheckRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getInitialSeedChecks();
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse stored checks', err);
    return [];
  }
}

export function saveCheckRecord(
  req: AnalyzeRequest,
  result: AnalyzeResponse
): JobCheckRecord {
  const current = getStoredChecks();
  const newRecord: JobCheckRecord = {
    id: 'chk_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    job_text: req.job_text.trim(),
    email: req.email?.trim() || null,
    company: req.company?.trim() || null,
    salary: req.salary?.trim() || null,
    risk_level: result.risk_level,
    score: result.score,
    created_at: new Date().toISOString(),
  };

  const updated = [newRecord, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newRecord;
}

export function clearStoredChecks(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Initial seed data so the table demonstrates features immediately if viewed
function getInitialSeedChecks(): JobCheckRecord[] {
  const sampleRecords: JobCheckRecord[] = [
    {
      id: 'chk_init_01',
      job_text: 'Data Entry Assistant: 3-4 hours daily. $45/hour. No prior experience required. Contact us on Telegram @HR_Recruitment_Direct. Laptop will be shipped after $150 security deposit.',
      email: 'recruitment.desk99@gmail.com',
      company: 'Global Horizon Logistics',
      salary: '95000',
      risk_level: 'High',
      score: 0.78,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'chk_init_02',
      job_text: 'Remote Social Media Evaluator: Review online ads from home. Payout via PayPal or crypto. Urgent hiring today.',
      email: 'hr-evaluations@outlook.com',
      company: 'Digital Sparks Agency',
      salary: '60000',
      risk_level: 'Medium',
      score: 0.52,
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
    {
      id: 'chk_init_03',
      job_text: 'Frontend Software Engineer: Join our Core UI engineering team. 3+ years experience with React, TypeScript, and modern state management. Comprehensive benefits package and stock options.',
      email: 'careers@acme-cloud.tech',
      company: 'Acme Cloud Technologies',
      salary: '145000',
      risk_level: 'Low',
      score: 0.12,
      created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    },
  ];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleRecords));
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return sampleRecords;
}

// API Service Function matching the frozen backend spec
export async function analyzeJobAPI(
  req: AnalyzeRequest,
  options: {
    useHeuristics?: boolean;
    simulateBackendDown?: boolean;
    latencyMs?: number;
  } = {}
): Promise<{ response: AnalyzeResponse; record: JobCheckRecord }> {
  const { useHeuristics = false, simulateBackendDown = false, latencyMs = 700 } = options;

  // 1. Validation (must fail before contacting model/saving)
  const validation = validateJobInput(req);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // 2. Simulate latency for network spinner
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  // 3. Simulate backend down state if toggled
  if (simulateBackendDown) {
    throw new Error('Connection failed: Backend service is currently unavailable (HTTP 503). Please verify backend status and try again.');
  }

  // 4. Return result based on mode
  let response: AnalyzeResponse;
  if (useHeuristics) {
    response = analyzeWithHeuristics(req);
  } else {
    // Frozen MVP dummy specification from README.md
    response = { ...FROZEN_MVP_RESPONSE };
  }

  // 5. Save every successful result to the database table
  const record = saveCheckRecord(req, response);

  return { response, record };
}
