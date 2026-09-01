"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { DecisionNode, type DecisionNodeData } from "./decision-node";
import { YesEdge, NoEdge } from "./decision-edges";

const nodeTypes: NodeTypes = { decision: DecisionNode };
const edgeTypes: EdgeTypes = { yes: YesEdge, no: NoEdge };

const initialNodes: Node<DecisionNodeData>[] = [
  {
    id: "1",
    type: "decision",
    position: { x: 250, y: 80 },
    data: { prompt: "Is this a support request?" },
  },
];

let nodeCounter = 1;

type StepResult = {
  nodeId: string;
  prompt: string;
  answer: "YES" | "NO";
  nextNodeId: string | null;
};

type RunState = {
  status: "running" | "done" | "error";
  steps: StepResult[];
  error?: string;
};

type RunStatus = "idle" | "running" | "done" | "error";

function FlowCanvasInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [runError, setRunError] = useState<string | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.sourceHandle) return;
      const edgeType = connection.sourceHandle === "yes" ? "yes" : "no";

      setEdges((eds) => {
        const withoutDuplicate = eds.filter(
          (e) =>
            !(
              e.source === connection.source &&
              e.sourceHandle === connection.sourceHandle
            ),
        );
        return addEdge(
          {
            ...connection,
            type: edgeType,
            id: `${connection.source}-${connection.sourceHandle}-${connection.target}`,
          },
          withoutDuplicate,
        );
      });
    },
    [setEdges],
  );

  const addNode = useCallback(() => {
    nodeCounter += 1;
    const id = `${Date.now()}-${nodeCounter}`;
    const position = wrapperRef.current
      ? screenToFlowPosition({
          x: wrapperRef.current.clientWidth / 2 + (Math.random() * 80 - 40),
          y: wrapperRef.current.clientHeight / 2 + (Math.random() * 80 - 40),
        })
      : { x: Math.random() * 400, y: Math.random() * 400 };

    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "decision",
        position,
        data: { prompt: "" },
      },
    ]);
  }, [screenToFlowPosition, setNodes]);

  const applySteps = useCallback(
    (steps: StepResult[]) => {
      const visited = new Set(steps.map((s) => s.nodeId));
      const currentNodeId = steps.length ? steps[steps.length - 1].nextNodeId : null;
      const activeEdgeIds = new Set(
        steps
          .filter((s) => s.nextNodeId)
          .map((s) => `${s.nodeId}-${s.answer.toLowerCase()}-${s.nextNodeId}`),
      );

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            status: n.id === currentNodeId ? "active" : visited.has(n.id) ? "visited" : "idle",
          },
        })),
      );
      setEdges((eds) =>
        eds.map((e) => ({ ...e, data: { ...e.data, active: activeEdgeIds.has(e.id) } })),
      );
    },
    [setNodes, setEdges],
  );

  const runFlow = useCallback(async () => {
    setRunStatus("running");
    setRunError(null);
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: "idle" } })));
    setEdges((eds) => eds.map((e) => ({ ...e, data: { ...e.data, active: false } })));

    const payload = {
      nodes: nodes.map((n) => ({
        id: n.id,
        data: { prompt: (n.data as DecisionNodeData).prompt },
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle ?? null,
        target: e.target,
      })),
    };

    try {
      const res = await fetch("/api/run-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setRunStatus("error");
        setRunError(body.error ?? "Failed to start run");
        return;
      }

      const { runId: newRunId } = (await res.json()) as { runId: string };
      setRunId(newRunId);
    } catch {
      setRunStatus("error");
      setRunError("Could not reach the server");
    }
  }, [nodes, edges, setNodes, setEdges]);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/run-status?runId=${runId}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as RunState;
        applySteps(data.steps);
        if (data.status !== "running") {
          setRunStatus(data.status);
          if (data.status === "error") setRunError(data.error ?? "Run failed");
          clearInterval(interval);
        }
      } catch {
        // transient network hiccup — next tick will retry
      }
    };

    const interval = setInterval(poll, 1000);
    poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [runId, applySteps]);

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
        <Panel position="top-left" className="flex items-center gap-2">
          <Button size="sm" onClick={addNode}>
            + Add node
          </Button>
          <Button size="sm" variant="default" onClick={runFlow} disabled={runStatus === "running"}>
            {runStatus === "running" ? "Running…" : "▶ Run flow"}
          </Button>
          {runStatus === "done" && (
            <span className="text-xs font-medium text-emerald-600">Done</span>
          )}
          {runStatus === "error" && (
            <span className="text-xs font-medium text-red-600">{runError}</span>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
