export interface ScoreBreakdown {
  relevance: number;
  completeness: number;
  clarity: number;
  spam: number;
}

export interface ValidationResult {
  qualityScore: number;
  breakdown: ScoreBreakdown;
  verdict: "ACCEPT" | "REVIEW" | "REJECT";
  attestation: {
    version: string;
    timestamp: string;
    taskHash: string;
    submissionHash: string;
    qualityScore: number;
    breakdown: ScoreBreakdown;
    verdict: string;
    validatorId: string;
    signature: string;
  };
}

function hash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return "0x" + Math.abs(h).toString(16).padStart(16, "0");
}

function scoreComponent(seed: number, min = 40, max = 100): number {
  return Math.round(min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min));
}

export function runValidation(task: string, submission: object): ValidationResult {
  const taskStr = JSON.stringify(task);
  const subStr = JSON.stringify(submission);
  const seed = taskStr.length * 7 + subStr.length * 13;

  const breakdown: ScoreBreakdown = {
    relevance: scoreComponent(seed + 1, 50, 98),
    completeness: scoreComponent(seed + 2, 45, 95),
    clarity: scoreComponent(seed + 3, 55, 99),
    spam: scoreComponent(seed + 4, 0, 15),
  };

  const qualityScore = Math.round(
    (breakdown.relevance * 0.3 + breakdown.completeness * 0.3 + breakdown.clarity * 0.25 + (100 - breakdown.spam) * 0.15)
  );

  const verdict: ValidationResult["verdict"] =
    qualityScore >= 75 ? "ACCEPT" : qualityScore >= 50 ? "REVIEW" : "REJECT";

  return {
    qualityScore,
    breakdown,
    verdict,
    attestation: {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      taskHash: hash(taskStr),
      submissionHash: hash(subStr),
      qualityScore,
      breakdown,
      verdict,
      validatorId: "poq-sentinel-v1",
      signature: hash(taskStr + subStr + qualityScore),
    },
  };
}
