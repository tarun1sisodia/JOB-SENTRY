import {
  NormalizedJobRequest,
  JobCheckOutput,
  RiskLevel,
  RiskFactorDetail,
} from './shared/contracts';

const FREE_EMAIL_PROVIDERS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'rediffmail.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'mail.com',
  'yandex.com',
];

const PAYMENT_KEYWORDS = [
  'registration fee',
  'processing fee',
  'security deposit',
  'training fee',
  'laptop deposit',
  'equipment fee',
  'refundable deposit',
  'activation fee',
];

const PAYMENT_NEGATION_PATTERNS = [
  /\bno\s+(?:(?:registration|processing|security|training|laptop|equipment|refundable|activation)\s+)?fees?\b(?:\s+(?:are\s+)?(?:charged|required|requested|collected))?/g,
  /\bnever\s+ask(?:s|ed)?\b.{0,80}\b(?:payment|fees?|deposits?)\b/g,
  /\bdo\s+not\s+ask\b.{0,80}\b(?:payment|fees?|deposits?)\b/g,
  /\bno\s+payment\s+(?:is\s+)?(?:required|requested|charged)\b/g,
];

const SENSITIVE_INFO_PATTERN =
  /\b(?:aadhaar|aadhar|pan(?:\s+(?:card|details|number))?|passport(?:\s+(?:copy|details))?|bank\s+details|bank\s+account(?:\s+(?:details|number))?|account\s+details|otp)\b/i;
const INFO_REQUEST_PATTERN =
  /\b(?:send|share|submit|provide|upload|email|forward|supply|request|need|required)\b/i;
const NO_INTERVIEW_PATTERN =
  /\bno\s+interviews?\b|\bwithout\s+(?:any\s+)?interviews?\b|\bselected\s+without\s+(?:any\s+)?interviews?\b/i;

/**
 * Deterministic Risk Engine within /backend
 * Uses local /backend/shared/contracts (synchronized from root /shared)
 */
export function evaluateJobRisk(req: NormalizedJobRequest): JobCheckOutput {
  const text = req.jobText.toLowerCase();
  const paymentSearchText = PAYMENT_NEGATION_PATTERNS.reduce(
    (remainingText, pattern) => remainingText.replace(pattern, ' '),
    text
  );
  const email = (req.email || '').toLowerCase().trim();
  const company = (req.company || '').trim();
  const salaryNum = req.salary ? parseFloat(req.salary.replace(/[\$,₹,\s]/g, '')) : null;

  const redFlags: string[] = [];
  const advice: string[] = [];
  const factors: RiskFactorDetail[] = [];

  let score = 0.12;
  let hardRuleFired = false;

  // 1. Email Domain Legitimacy
  const emailDomain = email.split('@')[1];
  if (emailDomain && FREE_EMAIL_PROVIDERS.includes(emailDomain)) {
    redFlags.push('Recruiter uses free public email provider instead of corporate domain');
    advice.push('Verify identity directly through the verified corporate website');
    factors.push({
      id: 'EMAIL_FREE_DOMAIN',
      severity: 'high',
      category: 'Identity',
      description: `Public email host detected: ${emailDomain}`,
    });
    score += 0.35;
  }

  // 2. Upfront Payment / Registration / Deposit Fee
  const matchedPayment = PAYMENT_KEYWORDS.find((kw) => paymentSearchText.includes(kw));
  if (matchedPayment) {
    hardRuleFired = true;
    redFlags.push(`Demands upfront financial transaction (${matchedPayment})`);
    advice.push('Never transfer money or pay fees for any job opportunity');
    factors.push({
      id: 'PAYMENT_UPFRONT_DEMAND',
      severity: 'critical',
      category: 'Financial',
      description: `Detected upfront fee keyword: "${matchedPayment}"`,
    });
    score += 0.45;
  }

  // 3. Requests for sensitive identity, banking or authentication details
  if (SENSITIVE_INFO_PATTERN.test(text) && INFO_REQUEST_PATTERN.test(text)) {
    hardRuleFired = true;
    redFlags.push(
      'Requests sensitive identity, banking or authentication details before a formal offer'
    );
    advice.push(
      'Do not share identity documents, bank details or OTPs before verifying a formal offer'
    );
    factors.push({
      id: 'SENSITIVE_INFORMATION_REQUEST',
      severity: 'critical',
      category: 'Identity',
      description: 'The posting requests sensitive personal or account information',
    });
    score += 0.45;
  }

  // 4. Claims that an interview is not required
  if (NO_INTERVIEW_PATTERN.test(text)) {
    redFlags.push('Claims selection without an interview or a waived interview process');
    advice.push('Verify the recruitment process with the employer through official channels');
    factors.push({
      id: 'NO_INTERVIEW_CLAIM',
      severity: 'high',
      category: 'Recruitment',
      description: 'The posting claims selection without a normal interview',
    });
    score += 0.25;
  }

  // 5. Payments directed to a personal account
  const hasPersonalTransferMethod =
    (text.includes('upi') || text.includes('wire transfer')) &&
    /\bpersonal\s+(?:bank\s+)?account\b/.test(text);
  if (hasPersonalTransferMethod) {
    hardRuleFired = true;
    redFlags.push('Requests payment by UPI or wire transfer to a personal account');
    advice.push('Do not transfer recruitment fees to personal accounts or payment handles');
    factors.push({
      id: 'PERSONAL_ACCOUNT_PAYMENT',
      severity: 'critical',
      category: 'Financial',
      description: 'The posting directs payment through UPI or wire transfer to a personal account',
    });
    score += 0.4;
  }

  // 6. Encrypted Messaging Channels
  const messagingKeywords = ['telegram', 'whatsapp', 'wa.me', 'signal', 't.me/'];
  const matchedMessaging = messagingKeywords.find((kw) => text.includes(kw));
  if (matchedMessaging) {
    redFlags.push('Directs recruitment communication to private chat apps');
    advice.push('Avoid employment processes conducted exclusively through chat channels');
    factors.push({
      id: 'COMMUNICATION_PRIVATE_CHAT',
      severity: 'high',
      category: 'Channel',
      description: `Detected unmonitored communication tool: "${matchedMessaging}"`,
    });
    score += 0.3;
  }

  // 7. Task Rating Scams
  const taskKeywords = [
    'like youtube',
    'like videos',
    'rate hotels',
    'review products',
    'daily payout',
    'earn $500/day',
    'daily earning',
  ];
  const matchedTask = taskKeywords.find((kw) => text.includes(kw));
  if (matchedTask || (text.includes('no experience') && text.includes('high pay'))) {
    redFlags.push('Promises inflated daily earnings for trivial online tasks');
    advice.push('Task rating schemes frequently transition into crypto deposit traps');
    factors.push({
      id: 'TASK_SCAM_MARKER',
      severity: 'high',
      category: 'Structure',
      description: 'Pattern matches standard click-farm and rating scam operations',
    });
    score += 0.3;
  }

  // 8. Crypto Payouts or Cheque Cashing
  const cryptoKeywords = ['usdt', 'crypto', 'bitcoin', 'cashiers check', 'wire transfer to vendor'];
  const matchedCrypto = cryptoKeywords.find((kw) => text.includes(kw));
  if (matchedCrypto) {
    redFlags.push('Instructs cryptocurrency transfers or third-party cheque cashing');
    advice.push('Cheque overpayment and crypto routing are common money mule schemes');
    factors.push({
      id: 'FINANCIAL_LAUNDERING_RISK',
      severity: 'critical',
      category: 'Banking',
      description: `Contains non-standard settlement mechanism: "${matchedCrypto}"`,
    });
    score += 0.4;
  }

  // 9. Anonymous Company
  if (!company || company.toLowerCase() === 'confidential' || company.toLowerCase() === 'hiring agency') {
    redFlags.push('Company identity is masked or undisclosed');
    advice.push('Demand registered business entity details and physical address verification');
    factors.push({
      id: 'ENTITY_UNDISCLOSED',
      severity: 'medium',
      category: 'Governance',
      description: 'Absence of explicit corporate identity',
    });
    score += 0.15;
  }

  // 10. Salary Outlier
  if (salaryNum && salaryNum > 300000 && (text.includes('entry level') || text.includes('no experience'))) {
    redFlags.push('Compensation offered is disproportionate to role requirements');
    score += 0.2;
  }

  score = Math.min(0.98, Math.max(0.08, parseFloat(score.toFixed(2))));

  let riskLevel: RiskLevel = 'Low';
  if (hardRuleFired || score >= 0.65) {
    riskLevel = 'High';
  } else if (score >= 0.35) {
    riskLevel = 'Medium';
  }
  if (riskLevel === 'High') {
    score = Math.max(score, 0.65);
  }

  if (redFlags.length === 0) {
    redFlags.push('No primary high-risk triggers detected in text');
    advice.push('Verify recruiter on LinkedIn and confirm posting on official careers site');
  } else {
    advice.push('Never send identity scans or banking credentials before signing formal verified agreements');
  }

  const evaluatedAt = new Date().toISOString();

  return {
    riskLevel,
    risk_level: riskLevel,
    score,
    redFlags,
    red_flags: redFlags,
    advice: Array.from(new Set(advice)),
    factors: req.stage === 'staging' ? factors : undefined,
    modelType: 'deterministic-nlp-rules',
    stage: req.stage,
    evaluatedAt,
  };
}
