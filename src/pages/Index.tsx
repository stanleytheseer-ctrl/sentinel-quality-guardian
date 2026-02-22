import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScoreBadge } from "@/components/ScoreBadge";
import { VerdictBadge } from "@/components/VerdictBadge";
import { BreakdownBar } from "@/components/BreakdownBar";
import { runValidation, type ValidationResult } from "@/lib/mockValidator";
import { useToast } from "@/hooks/use-toast";
import { Shield, Play, Download, FileJson } from "lucide-react";

const Index = () => {
  const [task, setTask] = useState("");
  const [submission, setSubmission] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleValidate = async () => {
    if (!task.trim()) {
      toast({ title: "Missing task description", variant: "destructive" });
      return;
    }
    if (!submission.trim()) {
      toast({ title: "Missing submission JSON", variant: "destructive" });
      return;
    }

    let parsed: object;
    try {
      parsed = JSON.parse(submission);
    } catch {
      toast({ title: "Invalid JSON in submission", description: "Please enter valid JSON.", variant: "destructive" });
      return;
    }

    setLoading(true);
    // Simulate async processing
    await new Promise((r) => setTimeout(r, 1200));
    const res = runValidation(task, parsed);
    setResult(res);
    setLoading(false);
  };

  const handleExport = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.attestation, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poq-attestation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4 sm:px-6">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-mono text-lg font-bold tracking-tight text-foreground">
              PoQ Sentinel
            </h1>
            <p className="text-xs text-muted-foreground">Decentralized Quality Validator</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />
            <span className="text-xs font-mono text-muted-foreground">ONLINE</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Panel */}
          <div className="space-y-6">
            <div>
              <h2 className="mb-1 text-sm font-semibold text-foreground uppercase tracking-wider">Input</h2>
              <p className="text-xs text-muted-foreground">Provide task description and submission data</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-secondary-foreground">Task Description</label>
              <Textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe the task that was assigned..."
                className="min-h-[120px] resize-y bg-card font-sans text-sm border-border focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
                <FileJson className="h-4 w-4 text-muted-foreground" />
                Submission JSON
              </label>
              <Textarea
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
                placeholder={'{\n  "answer": "...",\n  "metadata": {}\n}'}
                className="min-h-[180px] resize-y bg-card font-mono text-sm border-border focus:ring-primary"
              />
            </div>

            <Button
              onClick={handleValidate}
              disabled={loading}
              className="w-full gap-2 bg-primary text-primary-foreground font-mono font-semibold hover:bg-primary/90 transition-colors"
              size="lg"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Validating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Validation
                </>
              )}
            </Button>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="mb-1 text-sm font-semibold text-foreground uppercase tracking-wider">Results</h2>
                <p className="text-xs text-muted-foreground">Quality assessment output</p>
              </div>
              {result && (
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 font-mono text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              )}
            </div>

            {!result ? (
              <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed border-border bg-card/50">
                <div className="text-center">
                  <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Run a validation to see results</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Score + Verdict */}
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-5">
                  <ScoreBadge score={result.qualityScore} />
                  <VerdictBadge verdict={result.verdict} />
                </div>

                {/* Gate Failures */}
                {result.gateFailures.length > 0 && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 space-y-3">
                    <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider">Gate Failures</h3>
                    {result.gateFailures.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${f.forced === "REJECT" ? "bg-destructive" : "bg-warning"}`} />
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">{f.gate}</span>
                          <p className="text-secondary-foreground">{f.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Breakdown */}
                <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score Breakdown</h3>
                  <BreakdownBar label="Relevance" value={result.breakdown.relevance} />
                  <BreakdownBar label="Completeness" value={result.breakdown.completeness} />
                  <BreakdownBar label="Clarity" value={result.breakdown.clarity} />
                  <BreakdownBar label="Spam Detection" value={result.breakdown.spam} inverted />
                </div>

                {/* Attestation JSON */}
                <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PoQ Attestation</h3>
                  <pre className="max-h-[300px] overflow-auto rounded-md bg-muted p-4 font-mono text-xs text-secondary-foreground leading-relaxed">
                    {JSON.stringify(result.attestation, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
