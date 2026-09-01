export type StepResult = {
  nodeId: string;
  prompt: string;
  answer: "YES" | "NO";
  nextNodeId: string | null;
};

export type RunState = {
  status: "running" | "done" | "error";
  steps: StepResult[];
  error?: string;
};

const runs = new Map<string, RunState>();

export function createRun(runId: string) {
  runs.set(runId, { status: "running", steps: [] });
}

export function appendStep(runId: string, step: StepResult) {
  const run = runs.get(runId);
  if (!run) return;
  run.steps.push(step);
}

export function finishRun(runId: string) {
  const run = runs.get(runId);
  if (!run) return;
  run.status = "done";
}

export function failRun(runId: string, error: string) {
  const run = runs.get(runId);
  if (!run) return;
  run.status = "error";
  run.error = error;
}

export function getRun(runId: string): RunState | undefined {
  return runs.get(runId);
}
