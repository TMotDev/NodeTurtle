import {
  Background,
  Panel,
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
import { FolderOpen } from "lucide-react";
import { TurtleArea } from "./TurtleArea";
import ToolboxIsland from "./ToolboxIsland";
import CommentNode from "./CommentNode";
import type {
  Connection,
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "@xyflow/react";
import type { Project } from "@/api/projects";
import PenNode from "@/components/node-flow/PenNode";
import { ContextMenu } from "@/components/node-flow/ContextMenu";
import NodeBase from "@/components/node-flow/baseNode";
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
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import useAuthStore from "@/lib/authStore";

export const nodeTypes = {
  nodeBase: NodeBase,
  startNode: StartNode,
  moveNode: MoveNode,
  loopNode: LoopNode,
  rotateNode: RotateNode,
  penNode: PenNode,
  commentNode: CommentNode
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


function Flow({
  project,
  onSwitchProject
}: {
  project: Project | null;
  onSwitchProject?: () => void;
}) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setData, setEdges } = useStore(
    useShallow(selector),
  );
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { markAsModified, hasUnsavedChanges } = useFlowManagerContext();
  const { user } = useAuthStore();

  const emptyProject: Project = project || {
    id: 'empty',
    title: 'New Project',
    created_at: new Date().toISOString(),
    last_edited_at: new Date().toISOString(),
    description: '',
    creator_id: '',
    creator_username: '',
    likes_count: 0,
    is_public: false,
    data: {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      nodeCount: 0,
    }
  };

  useEffect(() => {
    if (project?.data) {
      const n = project.data.nodes;
      const e = project.data.edges;
      setData(n, e);
      setIsInitialLoad(true);
    } else if (project === null) {
      setData([], []);
      setIsInitialLoad(true);
    }
  }, [project, setData]);

  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    if((user?.id === project?.creator_id || project?.creator_id === "-"))
    {
      markAsModified();
    }
  }, [nodes, edges, markAsModified, isInitialLoad]);

  const { copyElements, pasteElements } = useClipboard();
  const { reactFlowWrapper, handleMouseMove } = useMousePosition();
  const { duplicateNode, deleteNode, deleteSelection, duplicateSelection, muteSelection } =
    useNodeOperations();

  const { onDragOver, onDrop } = useDragDrop();

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
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = true;
      }
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
    <main className="w-screen h-screen relative bg-background">

      <ResizablePanelGroup direction="horizontal">

        <ResizablePanel defaultSize={70} minSize={30} className="relative">
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
              zoomOnDoubleClick={false}
              onDragOver={onDragOver}
              onEdgeMouseEnter={(_, edge) => handleEdgeMouseEnter(edge)}
              onEdgeDoubleClick={(_, edge) => {
                setEdges(edges.filter((ed) => ed.id !== edge.id));
              }}
              isValidConnection={isValidConnection}
              onNodeContextMenu={onNodeContextMenu}
              onEdgeContextMenu={(e)=>{ e.preventDefault()}}
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
              {/* <DevTools position="top-left" /> */}
              <MouseTrail isActive={toolStates.cutTool && !toolStates.lazyConnect} />
              <MouseLine
                isActive={toolStates.lazyConnect && !toolStates.cutTool}
                connectionValid={connectionValid}
              />
              <Panel position="center-left" className="text-secondary-foreground">
                <ToolboxIsland />
              </Panel>
              {onSwitchProject && (
                <Panel position="top-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSwitchProject}
                    className="bg-background/80 backdrop-blur-sm"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Switch Project
                  </Button>
                </Panel>
              )}
            </ReactFlow>

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
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={30} minSize={15}>
          <div className="w-full h-full overflow-hidden">
             <TurtleArea project={emptyProject} nodes={nodes} edges={edges} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}

export function FlowEditor({
  project,
  onSwitchProject
}: {
  project: Project | null;
  onSwitchProject?: () => void;
}) {
  return (
    <ReactFlowProvider>
      <FlowManagerProvider>
        <DnDProvider>
          <MouseProvider>
            <Flow project={project} onSwitchProject={onSwitchProject} />
          </MouseProvider>
        </DnDProvider>
      </FlowManagerProvider>
    </ReactFlowProvider>
  );
}