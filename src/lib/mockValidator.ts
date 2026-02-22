// PoQ Sentinel — Hardened Validation Engine v2.0
// Gated scoring model with adversarial content analysis.
// Designed for economic systems with staking/slashing.

export interface ScoreBreakdown {
  relevance: number;
  completeness: number;
  clarity: number;
  spam: number;
}

export interface GateFailure {
  gate: string;
  reason: string;
  forced: "REJECT" | "REVIEW";
}

export interface ValidationResult {
  qualityScore: number;
  breakdown: ScoreBreakdown;
  verdict: "ACCEPT" | "REVIEW" | "REJECT";
  gateFailures: GateFailure[];
  attestation: {
    version: string;
    timestamp: string;
    taskHash: string;
    submissionHash: string;
    qualityScore: number;
    breakdown: ScoreBreakdown;
    verdict: string;
    gateFailures: GateFailure[];
    validatorId: string;
    signature: string;
  };
}

// --- Anti-gaming content analysis ---

const VAGUE_PATTERNS = [
  /\bslightly\b/i, /\bsomewhat\b/i, /\bkind of\b/i, /\bsort of\b/i,
  /\bmaybe\b/i, /\bprobably\b/i, /\bmight\b/i, /\bcould be\b/i,
  /\bpossibly\b/i, /\bi think\b/i, /\bi guess\b/i, /\bnot sure\b/i,
  /\bperhaps\b/i, /\bgenerally\b/i, /\busually\b/i, /\btypically\b/i,
];

const TEMPLATE_PHRASES = [
  /\bplease find (below|attached|herein)\b/i,
  /\bas per (your|the) (request|instructions)\b/i,
  /\bi have completed the (task|assignment)\b/i,
  /\bhere is (my|the) (submission|response|answer)\b/i,
  /\bthe (answer|result|output) is as follows\b/i,
  /\blorem ipsum\b/i,
  /\btest test\b/i,
  /\basdf\b/i,
  /\bfoo bar\b/i,
];

const FILLER_PATTERNS = [
  /\bin (order|terms) (of|to)\b/i,
  /\bit (is|should be) (noted|mentioned) that\b/i,
  /\bas (we|you) (can|know|may) (see|know|understand)\b/i,
  /\bat the end of the day\b/i,
  /\bmoving forward\b/i,
  /\bthat being said\b/i,
];

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((c, p) => c + (p.test(text) ? 1 : 0), 0);
}

function flattenToText(obj: unknown): string {
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
  if (Array.isArray(obj)) return obj.map(flattenToText).join(" ");
  if (obj && typeof obj === "object") return Object.values(obj).map(flattenToText).join(" ");
  return "";
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function uniqueWordRatio(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  return new Set(words).size / words.length;
}

// --- Scoring functions (0–100, higher = better, except spam where higher = worse) ---

function scoreRelevance(task: string, submission: string): number {
  const taskWords = new Set(task.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const subWords = submission.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (taskWords.size === 0 || subWords.length === 0) return 0;
  const hits = subWords.filter(w => taskWords.has(w)).length;
  const overlap = hits / taskWords.size;
  // Penalize if submission doesn't reference the task at all
  if (overlap < 0.05) return Math.round(overlap * 100);
  // Scale: need at least 30% keyword overlap for decent relevance
  return Math.min(100, Math.round(overlap * 120));
}

function scoreCompleteness(task: string, submission: string): number {
  const taskSentences = task.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const subLength = wordCount(submission);

  // Very short submissions are heavily penalized
  if (subLength < 10) return Math.min(15, subLength * 2);
  if (subLength < 25) return Math.min(35, 15 + subLength);
  if (subLength < 50) return Math.min(55, 30 + subLength / 2);

  // Check if submission addresses multiple aspects of the task
  const taskAspects = taskSentences.length || 1;
  const coverageBonus = Math.min(30, (subLength / (taskAspects * 20)) * 30);

  return Math.min(100, Math.round(40 + coverageBonus + uniqueWordRatio(submission) * 30));
}

function scoreClarity(submission: string): number {
  const words = wordCount(submission);
  if (words < 5) return 0;

  const vagueHits = countMatches(submission, VAGUE_PATTERNS);
  const fillerHits = countMatches(submission, FILLER_PATTERNS);
  const uniqueness = uniqueWordRatio(submission);

  let score = 70; // Base

  // Penalize vague language: -12 per instance
  score -= vagueHits * 12;

  // Penalize filler: -8 per instance
  score -= fillerHits * 8;

  // Reward lexical diversity
  if (uniqueness > 0.7) score += 15;
  else if (uniqueness < 0.4) score -= 20;

  // Penalize extremely short
  if (words < 15) score -= 25;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreSpam(submission: string): number {
  // Higher = MORE spam detected (bad)
  let score = 0;

  const templateHits = countMatches(submission, TEMPLATE_PHRASES);
  score += templateHits * 20;

  // Repetition detection
  const words = submission.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length > 5) {
    const ratio = uniqueWordRatio(submission);
    if (ratio < 0.3) score += 40; // Heavy repetition
    else if (ratio < 0.5) score += 20;
  }

  // Very short + template = high spam
  if (words.length < 10 && templateHits > 0) score += 25;

  // All caps detection
  const capsRatio = (submission.match(/[A-Z]/g) || []).length / Math.max(1, submission.length);
  if (capsRatio > 0.5 && submission.length > 20) score += 15;

  return Math.min(100, score);
}

// --- Gated verdict logic ---

function evaluateGates(breakdown: ScoreBreakdown, submissionText: string): GateFailure[] {
  const failures: GateFailure[] = [];

  // HARD REJECT gates
  if (breakdown.relevance < 15) {
    failures.push({ gate: "RELEVANCE_FLOOR", reason: "Relevance below 15 — submission does not address the task", forced: "REJECT" });
  }
  if (breakdown.clarity < 10) {
    failures.push({ gate: "CLARITY_FLOOR", reason: "Clarity below 10 — submission is incoherent or entirely vague", forced: "REJECT" });
  }
  if (breakdown.spam > 60) {
    failures.push({ gate: "SPAM_CEILING", reason: "Spam score exceeds 60 — high likelihood of template abuse or repetition", forced: "REJECT" });
  }
  if (wordCount(submissionText) < 8) {
    failures.push({ gate: "MIN_LENGTH", reason: "Submission under 8 words — insufficient content for evaluation", forced: "REJECT" });
  }

  // HARD REVIEW gates (cannot ACCEPT even if score is high)
  if (breakdown.spam > 30 && !failures.some(f => f.forced === "REJECT")) {
    failures.push({ gate: "SPAM_WARNING", reason: "Spam score exceeds 30 — cannot be auto-accepted, requires human review", forced: "REVIEW" });
  }
  if (breakdown.completeness < 40 && !failures.some(f => f.forced === "REJECT")) {
    failures.push({ gate: "COMPLETENESS_FLOOR", reason: "Completeness below 40 — submission is partial or superficial", forced: "REVIEW" });
  }
  if (countMatches(submissionText, VAGUE_PATTERNS) >= 3 && !failures.some(f => f.forced === "REJECT")) {
    failures.push({ gate: "VAGUE_LANGUAGE", reason: "3+ vague qualifiers detected — hedging language undermines confidence", forced: "REVIEW" });
  }

  return failures;
}

function computeVerdict(qualityScore: number, gateFailures: GateFailure[]): "ACCEPT" | "REVIEW" | "REJECT" {
  // Gate failures override score-based verdicts
  const hasReject = gateFailures.some(f => f.forced === "REJECT");
  if (hasReject) return "REJECT";

  const hasReview = gateFailures.some(f => f.forced === "REVIEW");

  // Score-based thresholds (strict)
  if (qualityScore < 50) return "REJECT";
  if (qualityScore < 75 || hasReview) return "REVIEW";

  // ACCEPT requires: score >= 75 AND no gate failures
  return "ACCEPT";
}

// --- Hash utility ---

function hash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return "0x" + Math.abs(h).toString(16).padStart(16, "0");
}

// --- Main entry point ---

export function runValidation(task: string, submission: object): ValidationResult {
  const submissionText = flattenToText(submission);
  const taskStr = typeof task === "string" ? task : JSON.stringify(task);

  const breakdown: ScoreBreakdown = {
    relevance: scoreRelevance(taskStr, submissionText),
    completeness: scoreCompleteness(taskStr, submissionText),
    clarity: scoreClarity(submissionText),
    spam: scoreSpam(submissionText),
  };

  // Weighted aggregation (spam is inverted: 100 - spam)
  // Relevance and completeness weighted higher as primary quality signals
  const qualityScore = Math.round(
    breakdown.relevance * 0.30 +
    breakdown.completeness * 0.30 +
    breakdown.clarity * 0.25 +
    (100 - breakdown.spam) * 0.15
  );

  const gateFailures = evaluateGates(breakdown, submissionText);
  const verdict = computeVerdict(qualityScore, gateFailures);

  return {
    qualityScore,
    breakdown,
    verdict,
    gateFailures,
    attestation: {
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      taskHash: hash(taskStr),
      submissionHash: hash(JSON.stringify(submission)),
      qualityScore,
      breakdown,
      verdict,
      gateFailures,
      validatorId: "poq-sentinel-v2",
      signature: hash(taskStr + JSON.stringify(submission) + qualityScore),
    },
  };
}
