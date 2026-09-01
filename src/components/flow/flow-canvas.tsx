"use client";

import { useCallback, useRef } from "react";
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

function FlowCanvasInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

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
        <Panel position="top-left">
          <Button size="sm" onClick={addNode}>
            + Add node
          </Button>
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
