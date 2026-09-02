import { inngest } from "./client";
import { askYesNo } from "@/lib/llm";
import { appendStep, finishRun, failRun } from "@/lib/execution-store";

type FlowNode = { id: string; data: { prompt: string } };
type FlowEdge = {
  id: string;
  source: string;
  sourceHandle: string | null;
  target: string;
};

const MAX_STEPS = 25;

export const runFlow = inngest.createFunction(
  { id: "run-flow", triggers: { event: "flow/run.requested" } },
  async ({ event, step }) => {
    const { runId, nodes, edges, startNodeId } = event.data as {
      runId: string;
      nodes: FlowNode[];
      edges: FlowEdge[];
      startNodeId: string;
    };

    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    let currentId: string | null = startNodeId;
    let iterations = 0;

    try {
      while (currentId && iterations < MAX_STEPS) {
        const node = nodesById.get(currentId);
        if (!node) break;

        const nodeId = currentId;
        const stepIndex = iterations;

        const result: { nextNodeId: string | null } = await step.run(
          `decide-${stepIndex}-${nodeId}`,
          async () => {
            const answer = await askYesNo(node.data.prompt);
            const outgoing = edges.find(
              (e) => e.source === nodeId && e.sourceHandle === answer.toLowerCase(),
            );
            const nextNodeId = outgoing ? outgoing.target : null;

            appendStep(runId, {
              nodeId,
              prompt: node.data.prompt,
              answer,
              nextNodeId,
            });

            return { nextNodeId };
          },
        );

        currentId = result.nextNodeId;
        iterations += 1;
      }

      await step.run("finish-run", async () => {
        finishRun(runId);
      });
    } catch (err) {
      const failedNodeId = currentId ?? undefined;
      await step.run("fail-run", async () => {
        failRun(runId, err instanceof Error ? err.message : "Unknown error", failedNodeId);
      });
      throw err;
    }

    return { runId, steps: iterations };
  },
);
