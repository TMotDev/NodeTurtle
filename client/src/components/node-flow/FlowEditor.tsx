import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  getOutgoers,
  useKeyPress,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type {
  Connection,
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "@xyflow/react";
import type { Project } from "@/api/projects";
import { ContextMenu } from "@/components/node-flow/ContextMenu";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import NodeBase from "@/components/node-flow/baseNode";
import NodeSiderbar from "@/components/node-flow/NodeSiderbar";
import { DevTools } from "@/components/devtools";
import { MouseProvider, useMousePosition } from "@/hooks/FlowMousePosition";
import { useClipboard } from "@/hooks/FlowClipBoardContext";
import { useNodeOperations } from "@/hooks/NodeActionsContext";
import { FlowManagerProvider, useFlowManagerContext } from "@/hooks/FlowManager";
import StartNode from "@/components/node-flow/StartNode";
import LoopNode from "@/components/node-flow/LoopNode";
import MoveNode from "@/components/node-flow/MoveNode";
import { DnDProvider, useDragDrop } from "@/hooks/FlowDragAndDropContext";
import { useCutTool } from "@/hooks/CutTool";
import { useLazyConnect } from "@/hooks/LazyConnect";
import MouseTrail from "@/components/MouseTrail";
import MouseLine from "@/components/MouseLine";
import RotateNode from "@/components/node-flow/RotateNode";

export const nodeTypes = {
  nodeBase: NodeBase,
  startNode: StartNode,
  moveNode: MoveNode,
  loopNode: LoopNode,
  rotateNode: RotateNode,
};

type AppState = {
  nodes: Array<Node>;
  edges: Array<Edge>;
  onNodesChange: OnNodesChange<Node>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: Array<Node>) => void;
  setEdges: (edges: Array<Edge>) => void;
  setData: (nodes: Array<Node>, edges: Array<Edge>) => void;
};

const useStore = create<AppState>((set, get) => ({
  nodes: [],
  edges: [],
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  setNodes: (nodes) => {
    set({ nodes });
  },
  setEdges: (edges) => {
    set({ edges });
  },
  setData: (nodes: Array<Node>, edges: Array<Edge>) => {
    set({ nodes, edges });
  },
}));

const selector = (state: AppState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  setEdges: state.setEdges,
  setNodes: state.setNodes,
  setData: state.setData,
});

function Flow({ project }: { project: Project }) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setData, setEdges } = useStore(
    useShallow(selector),
  );
    const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { markAsModified, hasUnsavedChanges } = useFlowManagerContext();

  useEffect(() => {
    if (project.data) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const n = project.data.nodes ?? [];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const e = project.data.edges ?? [];
      console.log("Project prop changed, updating Zustand store...");
      setData(n, e);
      setIsInitialLoad(true);
    }
  }, [project, setData]);

  // Watch for changes in nodes and edges to mark as modified
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    // Only mark as modified if we're not in initial load
    markAsModified();
  }, [nodes, edges, markAsModified, isInitialLoad]);


  const { copyElements, pasteElements } = useClipboard();
  const { reactFlowWrapper, handleMouseMove } = useMousePosition();
  const { duplicateNode, deleteNode, deleteSelection, duplicateSelection, muteSelection } =
    useNodeOperations();

  const { onDragOver, onDrop, onDragStart } = useDragDrop();

  const CtrlCPressed = useKeyPress(["Control+c"]);
  const CtrlVPressed = useKeyPress(["Control+v"]);
  const MPressed = useKeyPress(["m"]);

  const [contextMenu, setContextMenu] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);
  const [selectionContextMenu, setSelectionContextMenu] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // ------------------------------------
  // Cut Tool and Lazy Connect
  // ------------------------------------
  const [toolStates, setToolStates] = useState({
    cutTool: false,
    lazyConnect: false,
  });

  const inputStateRef = useRef({
    isRightMouseDown: false,
    isCtrlPressed: false,
    isAltPressed: false,
  });

  const updateToolStates = useCallback(() => {
    const cutActive = inputStateRef.current.isCtrlPressed && inputStateRef.current.isRightMouseDown;
    const lazyConnectActive =
      inputStateRef.current.isAltPressed && inputStateRef.current.isRightMouseDown;

    setToolStates(() => ({
      cutTool: cutActive,
      lazyConnect: lazyConnectActive,
    }));
  }, []);

  const { handleEdgeMouseEnter } = useCutTool({
    isActive: toolStates.cutTool,
    onEdgesCut: (edgeIds) => {
      setEdges(edges.filter((ed) => !edgeIds.includes(ed.id)));
    },
  });

  useEffect(() => {
    if (CtrlCPressed) {
      copyElements();
    } else if (CtrlVPressed) {
      pasteElements();
    } else if (MPressed) {
      muteSelection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CtrlCPressed, CtrlVPressed, MPressed]);

  const onLazyConnection = useCallback(
    (connection: Connection) => {
      const e = addEdge(connection, edges);
      setEdges(e);
    },
    [edges, setEdges],
  );

  const { connectionValid } = useLazyConnect({
    isActive: toolStates.lazyConnect,
    onConnection: onLazyConnection,
  });

  // ------------------------------------
  // Keyboard and Mouse Event Handlers
  // ------------------------------------
  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (event.button === 2) {
        inputStateRef.current.isRightMouseDown = true;
        updateToolStates();
      }
    },
    [updateToolStates],
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (event.button === 2) {
        inputStateRef.current.isRightMouseDown = false;
        updateToolStates();
      }
    },
    [updateToolStates],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      let stateChanged = false;

      if ((event.ctrlKey || event.metaKey) && !inputStateRef.current.isCtrlPressed) {
        inputStateRef.current.isCtrlPressed = true;
        stateChanged = true;
      }

      if (event.altKey && !inputStateRef.current.isAltPressed) {
        inputStateRef.current.isAltPressed = true;
        stateChanged = true;
      }

      if (stateChanged) {
        updateToolStates();
      }
    },
    [updateToolStates],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      let stateChanged = false;

      if (!event.ctrlKey && !event.metaKey && inputStateRef.current.isCtrlPressed) {
        inputStateRef.current.isCtrlPressed = false;
        stateChanged = true;
      }

      if (!event.altKey && inputStateRef.current.isAltPressed) {
        inputStateRef.current.isAltPressed = false;
        stateChanged = true;
      }

      if (stateChanged) {
        updateToolStates();
      }
    },
    [updateToolStates],
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [handleMouseDown, handleMouseUp, handleKeyDown, handleKeyUp]);

  // ------------------------------------
  // Context Menu handlers
  // ------------------------------------
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (toolStates.cutTool || toolStates.lazyConnect) return;
      event.preventDefault();
      setSelectionContextMenu(null);
      setContextMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
      });
    },
    [toolStates.cutTool, toolStates.lazyConnect],
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

  // ------------------------------------
  // Node, Edge and connection related handlers
  // ------------------------------------
  const isValidConnection = useCallback(
    (connectionOrEdge: Edge | Connection) => {
      if (
        typeof connectionOrEdge.source === "string" &&
        typeof connectionOrEdge.target === "string"
      ) {
        const connection = connectionOrEdge as Connection;
        const n = nodes;
        const e = edges;
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
    [nodes, edges],
  );

  const handleUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      // if (hasUnsavedChanges) {
      //   event.preventDefault();

      //   // legacy browser support
      //   event.returnValue = true;
      // }
    },
    [hasUnsavedChanges],
  );

  useEffect(() => {
    window.addEventListener("beforeunload", handleUnload, true);
    return () => {
      window.removeEventListener("beforeunload", handleUnload, true);
    };
  }, [handleUnload]);

  return (
    <main className="w-screen h-screen relative">
      <div
        className={`w-full h-full ${toolStates.cutTool ? "cursor-crosshair" : "cursor-default"}`}
      >
        <ReactFlow
          ref={reactFlowWrapper}
          onMouseMove={handleMouseMove}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragStart={onDragStart}
          zoomOnDoubleClick={false}
          onDragOver={onDragOver}
          onEdgeMouseEnter={(_, edge) => handleEdgeMouseEnter(edge)}
          onEdgeDoubleClick={(_, edge) => {
            setEdges(edges.filter((ed) => ed.id !== edge.id));
          }}
          isValidConnection={isValidConnection}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          onSelectionContextMenu={onSelectionContextMenu}
          fitView
          selectionOnDrag={!toolStates.cutTool && !toolStates.lazyConnect}
          panOnDrag={!toolStates.cutTool && !toolStates.lazyConnect && [1]}
          panOnScroll={!toolStates.cutTool && !toolStates.lazyConnect}
          deleteKeyCode={"Delete"}
          onPaneContextMenu={(e) => {
            e.preventDefault();
          }}
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode={"Shift"}
        >
          <Background />
          <DevTools position="top-left" />
          <MouseTrail isActive={toolStates.cutTool && !toolStates.lazyConnect} />
          <MouseLine
            isActive={toolStates.lazyConnect && !toolStates.cutTool}
            connectionValid={connectionValid}
          />
        </ReactFlow>
      </div>
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
    </main>
  );
}

export function FlowEditor({ project }: { project: Project }) {
  return (
    <ReactFlowProvider>
      <FlowManagerProvider>
        <DnDProvider>
          <SidebarProvider>
            <NodeSiderbar project={project} />
            <SidebarTrigger />
            <MouseProvider>
              <Flow project={project} />
            </MouseProvider>
          </SidebarProvider>
        </DnDProvider>
      </FlowManagerProvider>
    </ReactFlowProvider>
  );
}
