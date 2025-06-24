import { createFileRoute } from "@tanstack/react-router";
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  getOutgoers,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import React, { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  Connection,
  Edge,
  EdgeChange,
  IsValidConnection,
  Node,
  NodeChange,
  NodeConnection,
} from "@xyflow/react";
import { ContextMenu } from "@/components/node-flow/ContextMenu";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import NodeBase from "@/components/node-flow/baseNode";
import NodeSiderbar from "@/components/node-flow/NodeSiderbar";
import { DevTools } from "@/components/devtools";
import { MouseProvider, useMousePosition } from "@/hooks/flowMousePosition";
import { useClipboard } from "@/hooks/flowClipBoardContext";
import { useNodeOperations } from "@/hooks/nodeActionsContext";
import { DnDProvider, useDragDrop } from "@/hooks/flowDragAndDropContext";
import {
  FlowManagerProvider,
  useFlowManagerContext,
} from "@/hooks/FlowManager";
import StartNode from "@/components/node-flow/StartNode";
import LoopNode from "@/components/node-flow/LoopNode";
import MoveNode from "@/components/node-flow/MoveNode";

export const Route = createFileRoute("/new")({
  component: Flow,
});

const initialNodes: Array<Node> = [
  {
    id: uuidv4(),
    type: "nodeBase",
    position: { x: 300, y: 300 },
    data: {},
  },
];

const initialEdges: Array<Edge> = [];

export const nodeTypes = {
  nodeBase: NodeBase,
  startNode: StartNode,
  moveNode: MoveNode,
  loopNode: LoopNode,
};

function FlowEditor() {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const { markAsModified } = useFlowManagerContext();
  const { copyElements, pasteElements } = useClipboard();
  const { reactFlowWrapper, handleMouseMove } = useMousePosition();

  const { duplicateNode, deleteNode, deleteSelection, duplicateSelection } =
    useNodeOperations();

  const { getNodes, getEdges } = useReactFlow();

  const { onDragOver, onDrop, onDragStart } = useDragDrop();

  const [contextMenu, setContextMenu] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);
  const [selectionContextMenu, setSelectionContextMenu] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === "c") {
          event.preventDefault();
          copyElements();
        } else if (event.key === "v") {
          event.preventDefault();
          pasteElements();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [copyElements, pasteElements]);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setSelectionContextMenu(null);
      setContextMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
      });
    },
    [setContextMenu],
  );

  const onSelectionContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setContextMenu(null);
      setSelectionContextMenu({
        top: event.clientY,
        left: event.clientX,
      });
    },
    [setSelectionContextMenu],
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    setSelectionContextMenu(null);
  }, []);

  const onNodesChange = useCallback(
    (changes: Array<NodeChange<Node>>) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      markAsModified();
    },
    [setNodes, markAsModified],
  );

  const onEdgesChange = useCallback(
    (changes: Array<EdgeChange<Edge>>) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      markAsModified();
    },
    [setEdges, markAsModified],
  );

  const isValidConnection = useCallback(
    (connectionOrEdge: Edge | Connection) => {
      if (
        typeof connectionOrEdge.source === "string" &&
        typeof connectionOrEdge.target === "string"
      ) {
        const connection = connectionOrEdge as Connection;
        const n = getNodes();
        const e = getEdges();
        const target = n.find((node) => node.id === connection.target);
        const hasCycle = (node: Node, visited = new Set<string>()) => {
          if (visited.has(node.id)) return false;

          visited.add(node.id);

          for (const outgoer of getOutgoers(node, n, e)) {
            if (outgoer.id === connection.source) return true;
            if (hasCycle(outgoer, visited)) return true;
          }
        };

        if (!target) return false;
        if (target.id === connection.source) return false;

        return !hasCycle(target);
      }
      return false;
    },
    [getNodes, getEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
      markAsModified();
    },
    [setEdges, markAsModified],
  );

  return (
    <SidebarProvider>
      <NodeSiderbar />
      <SidebarTrigger />
      <main className="w-screen h-screen">
        <div
          ref={reactFlowWrapper}
          onMouseMove={handleMouseMove}
          className="w-full h-full"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            isValidConnection={isValidConnection}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            onSelectionContextMenu={onSelectionContextMenu}
            fitView
            panOnScroll
            panOnDrag={[1, 2]}
            deleteKeyCode={"Delete"}
            selectionOnDrag
            selectionMode={SelectionMode.Partial}
            multiSelectionKeyCode={"Shift"}
          >
            <Background />
            <DevTools position="top-left" />
          </ReactFlow>
        </div>
      </main>
      {contextMenu && (
        <ContextMenu
          onClose={() => setContextMenu(null)}
          onDuplicate={() => duplicateNode(contextMenu.id)}
          onDelete={() => deleteNode(contextMenu.id)}
          data={contextMenu}
        />
      )}
      {selectionContextMenu && (
        <ContextMenu
          onClose={() => setSelectionContextMenu(null)}
          onDuplicate={duplicateSelection}
          onDelete={deleteSelection}
          data={selectionContextMenu}
        />
      )}
    </SidebarProvider>
  );
}

function Flow() {
  return (
    <ReactFlowProvider>
      <FlowManagerProvider>
        <DnDProvider>
          <MouseProvider>
            <FlowEditor />
          </MouseProvider>
        </DnDProvider>
      </FlowManagerProvider>
    </ReactFlowProvider>
  );
}
