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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  SaveIcon,
  FolderOpenIcon,
  DownloadIcon,
  UploadIcon,
  ChevronDownIcon,
  ScrollTextIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ArrowRightIcon,
} from "lucide-react";
import { DecisionNode, type DecisionNodeData } from "./decision-node";
import { YesEdge, NoEdge } from "./decision-edges";
import { RetryNodeContext } from "./flow-context";

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

const STORAGE_KEY = "ai-decision-flow:graph";

type StepResult = {
  nodeId: string;
  prompt: string;
  answer: "YES" | "NO";
  nextNodeId: string | null;
};

type RunState = {
  status: "running" | "done" | "error";
  startedAt: number;
  steps: StepResult[];
  error?: string;
  failedNodeId?: string;
};

type RunSummary = RunState & { runId: string };

type SavedGraph = {
  nodes: { id: string; position: { x: number; y: number }; data: { prompt: string } }[];
  edges: {
    id: string;
    source: string;
    sourceHandle: string | null;
    target: string;
    type: string;
  }[];
};

function serializeGraph(nodes: Node[], edges: Edge[]): SavedGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      position: n.position,
      data: { prompt: (n.data as DecisionNodeData).prompt },
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? null,
      target: e.target,
      type: e.type ?? (e.sourceHandle === "yes" ? "yes" : "no"),
    })),
  };
}

const MAX_HISTORY = 10;

function FlowCanvasInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [failedNodeId, setFailedNodeId] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<RunSummary[]>([]);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Keep each node's "terminal" flag (no outgoing edges) in sync with the graph.
  useEffect(() => {
    const sourceIds = new Set(edges.map((e) => e.source));
    setNodes((nds) =>
      nds.map((n) => {
        const isTerminal = !sourceIds.has(n.id);
        if ((n.data as DecisionNodeData).isTerminal === isTerminal) return n;
        return { ...n, data: { ...n.data, isTerminal } };
      }),
    );
  }, [edges, setNodes]);

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
    (steps: StepResult[], errorNodeId?: string) => {
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
            status: errorNodeId && n.id === errorNodeId
              ? "error"
              : n.id === currentNodeId
                ? "active"
                : visited.has(n.id)
                  ? "visited"
                  : "idle",
          },
        })),
      );
      setEdges((eds) =>
        eds.map((e) => ({ ...e, data: { ...e.data, active: activeEdgeIds.has(e.id) } })),
      );
    },
    [setNodes, setEdges],
  );

  const runFlowFrom = useCallback(
    async (startNodeId?: string) => {
      setRunStatus("running");
      setRunError(null);
      setFailedNodeId(null);
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
        ...(startNodeId ? { startNodeId } : {}),
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
        setRunHistory((hist) =>
          [
            { runId: newRunId, status: "running" as const, startedAt: Date.now(), steps: [] },
            ...hist,
          ].slice(0, MAX_HISTORY),
        );
        setRunId(newRunId);
      } catch {
        setRunStatus("error");
        setRunError("Could not reach the server");
      }
    },
    [nodes, edges, setNodes, setEdges],
  );

  const runFlow = useCallback(() => runFlowFrom(), [runFlowFrom]);
  const retryNode = useCallback((nodeId: string) => runFlowFrom(nodeId), [runFlowFrom]);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/run-status?runId=${runId}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as RunState;
        applySteps(data.steps, data.failedNodeId);
        setRunHistory((hist) =>
          hist.map((h) => (h.runId === runId ? { ...h, ...data } : h)),
        );
        if (data.status !== "running") {
          setRunStatus(data.status);
          if (data.status === "error") {
            setRunError(data.error ?? "Run failed");
            setFailedNodeId(data.failedNodeId ?? null);
          }
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

  const applyGraph = useCallback(
    (graph: SavedGraph) => {
      setNodes(
        graph.nodes.map((n) => ({
          id: n.id,
          type: "decision",
          position: n.position,
          data: { prompt: n.data.prompt },
        })),
      );
      setEdges(
        graph.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          type: e.type,
        })),
      );
      setRunStatus("idle");
      setRunError(null);
      setFailedNodeId(null);
    },
    [setNodes, setEdges],
  );

  const flash = useCallback((message: string) => {
    setSavedNotice(message);
    setTimeout(() => setSavedNotice(null), 2000);
  }, []);

  const saveToBrowser = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeGraph(nodes, edges)));
    flash("Saved to this browser");
  }, [nodes, edges, flash]);

  const loadFromBrowser = useCallback(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      flash("No saved workflow found");
      return;
    }
    try {
      applyGraph(JSON.parse(raw) as SavedGraph);
      flash("Loaded from this browser");
    } catch {
      flash("Saved data was corrupted");
    }
  }, [applyGraph, flash]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(serializeGraph(nodes, edges), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-decision-flow.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          applyGraph(JSON.parse(reader.result as string) as SavedGraph);
          flash("Workflow imported");
        } catch {
          flash("That file isn't a valid workflow export");
        }
      };
      reader.readAsText(file);
    },
    [applyGraph, flash],
  );

  return (
    <RetryNodeContext.Provider value={retryNode}>
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

          <Panel position="top-left" className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={addNode}>
              + Add node
            </Button>
            <Button size="sm" onClick={runFlow} disabled={runStatus === "running"}>
              {runStatus === "running" ? "Running…" : "▶ Run flow"}
            </Button>
            {runStatus === "done" && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2Icon className="h-3.5 w-3.5" /> Done
              </span>
            )}
            {runStatus === "error" && (
              <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                <XCircleIcon className="h-3.5 w-3.5" />
                {runError}
                {failedNodeId && ` (node ${failedNodeId})`}
              </span>
            )}
            {savedNotice && (
              <span className="text-xs font-medium text-muted-foreground">{savedNotice}</span>
            )}
          </Panel>

          <Panel position="top-right" className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="sm" variant="outline" className="gap-1">
                    File <ChevronDownIcon className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={saveToBrowser}>
                  <SaveIcon className="h-4 w-4" /> Save to browser
                </DropdownMenuItem>
                <DropdownMenuItem onClick={loadFromBrowser}>
                  <FolderOpenIcon className="h-4 w-4" /> Load from browser
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportJson}>
                  <DownloadIcon className="h-4 w-4" /> Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => importInputRef.current?.click()}>
                  <UploadIcon className="h-4 w-4" /> Import JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Sheet>
              <SheetTrigger
                render={
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <ScrollTextIcon className="h-3.5 w-3.5" /> Logs
                  </Button>
                }
              />
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Run logs & history</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-6rem)] px-4">
                  {runHistory.length === 0 && (
                    <p className="py-6 text-sm text-muted-foreground">
                      No runs yet — click &ldquo;Run flow&rdquo; to execute the workflow.
                    </p>
                  )}
                  <div className="space-y-4 pb-6">
                    {runHistory.map((run) => (
                      <div key={run.runId} className="rounded-md border p-3">
                        <div className="mb-2 flex items-center justify-between text-xs font-medium">
                          <span>{new Date(run.startedAt).toLocaleTimeString()}</span>
                          <span
                            className={
                              run.status === "done"
                                ? "text-emerald-600"
                                : run.status === "error"
                                  ? "text-red-600"
                                  : "text-blue-600"
                            }
                          >
                            {run.status}
                          </span>
                        </div>
                        <Separator className="mb-2" />
                        <div className="space-y-1.5">
                          {run.steps.map((s, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs">
                              <span
                                className={
                                  s.answer === "YES"
                                    ? "font-bold text-emerald-600"
                                    : "font-bold text-red-600"
                                }
                              >
                                {s.answer}
                              </span>
                              <span className="flex-1 text-muted-foreground">
                                {s.nodeId}: &ldquo;{s.prompt}&rdquo;
                              </span>
                              {s.nextNodeId && (
                                <span className="flex items-center gap-0.5 text-muted-foreground">
                                  <ArrowRightIcon className="h-3 w-3" /> {s.nextNodeId}
                                </span>
                              )}
                            </div>
                          ))}
                          {run.status === "error" && (
                            <p className="text-xs text-red-600">{run.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </Panel>
        </ReactFlow>
      </div>
    </RetryNodeContext.Provider>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
