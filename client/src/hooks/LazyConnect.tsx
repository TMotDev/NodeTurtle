import { useCallback, useEffect, useRef, useState } from "react";

import { useReactFlow } from "@xyflow/react";

import { useMousePosition } from "./FlowMousePosition";

import type { Connection, Node, XYPosition } from "@xyflow/react";

interface UseLazyConnectOptions {
  onConnection?: (connection: Connection) => void;
  nodeOutlinedClassName?: string;
}

interface LazyConnectState {
  isActive: boolean;
  startPos: XYPosition | null;
  endPos: XYPosition | null;
  sourceNodeId: string | null;
  targetNodeId: string | null;
}

// Utility function to calculate distance between two points
function getDistance(p1: XYPosition, p2: XYPosition): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Find the closest node to a given point
function findClosestNode(point: XYPosition, nodes: Array<Node>): Node | null {
  if (nodes.length === 0) return null;

  let closestNode = nodes[0];

  let minDistance = getDistance(point, {
    x: closestNode.position.x + (closestNode.measured?.width || 0) / 2,
    y: closestNode.position.y + (closestNode.measured?.height || 0) / 2,
  });

  for (const node of nodes) {
    // Calculate node center point
    const nodeCenter = {
      x: node.position.x + (node.measured?.width || 0) / 2,
      y: node.position.y + (node.measured?.height || 0) / 2,
    };

    const distance = getDistance(point, nodeCenter);
    if (distance < minDistance) {
      minDistance = distance;
      closestNode = node;
    }
  }

  return closestNode;
}

export function useLazyConnect({
  onConnection,
  nodeOutlinedClassName = "lazy-connect-outline",
}: UseLazyConnectOptions = {}) {
  const [state, setState] = useState<LazyConnectState>({
    isActive: false,
    startPos: null,
    endPos: null,
    sourceNodeId: null,
    targetNodeId: null,
  });

  const { mousePosition } = useMousePosition();
  const { getNodes, setNodes, screenToFlowPosition } = useReactFlow();

  const inputStateRef = useRef({
    isRightMouseDown: false,
    isAltPressed: false,
  });

  const clearNodeOutlines = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        className: n.className?.replace(nodeOutlinedClassName, "").trim(),
      })),
    );
  }, [setNodes, nodeOutlinedClassName]);

  const connectNodes = useCallback(
    (startPoint: XYPosition, endPoint: XYPosition) => {
      const nodes = getNodes();
      const sourceNode = findClosestNode(startPoint, nodes);
      const targetNode = findClosestNode(endPoint, nodes);

      console.log(targetNode?.position, endPoint);

      if (sourceNode && targetNode && sourceNode.id !== targetNode.id) {
        const connection: Connection = {
          source: sourceNode.id,
          target: targetNode.id,
          sourceHandle: "out",
          targetHandle: "in",
        };

        onConnection?.(connection);
      }
    },

    [getNodes, onConnection],
  );

  const updateLazyConnectState = useCallback(() => {
    const shouldActivate = inputStateRef.current.isAltPressed && inputStateRef.current.isRightMouseDown;

    if (shouldActivate && !state.isActive) {
      const nodes = getNodes();
      const sourceNode = findClosestNode(screenToFlowPosition(mousePosition), nodes);

      setState({
        isActive: true,
        startPos: mousePosition,
        endPos: mousePosition,
        sourceNodeId: sourceNode?.id || null,
        targetNodeId: null,
      });
    } else if (!shouldActivate && state.isActive) {

      if (state.startPos && state.endPos) {
        connectNodes(screenToFlowPosition(state.startPos), screenToFlowPosition(state.endPos));
      }

      clearNodeOutlines();
      setState({
        isActive: false,
        startPos: null,
        endPos: null,
        sourceNodeId: null,
        targetNodeId: null,
      });
    }
  }, [
    state.isActive,
    state.startPos,
    state.endPos,
    getNodes,
    screenToFlowPosition,
    mousePosition,
    clearNodeOutlines,
    connectNodes,
  ]);

  useEffect(() => {
    if (!state.isActive) return;

    const nodes = getNodes();
    const targetNode = findClosestNode(screenToFlowPosition(mousePosition), nodes);

    setState((s) => ({
      ...s,
      endPos: mousePosition,
      targetNodeId: targetNode?.id || null,
    }));

    setNodes((nds) =>
      nds.map((n) => {
        const isSource = n.id === state.sourceNodeId;
        const isTarget = n.id === state.targetNodeId;
        const currentClassName = n.className || "";
        const hasOutline = currentClassName.includes(nodeOutlinedClassName);

        if ((isSource || isTarget) && !hasOutline) {
          return {
            ...n,
            className: `${currentClassName} ${nodeOutlinedClassName}`.trim(),
          };
        } else if (!isSource && !isTarget && hasOutline) {
          return {
            ...n,
            className: currentClassName.replace(nodeOutlinedClassName, "").trim(),
          };
        }

        return n;
      }),
    );
  }, [
    state.isActive,
    mousePosition,
    getNodes,
    setNodes,
    state.sourceNodeId,
    state.targetNodeId,
    nodeOutlinedClassName,
    screenToFlowPosition,
  ]);

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (event.button === 2) {
        inputStateRef.current.isRightMouseDown = true;
        updateLazyConnectState();
      }
    },

    [updateLazyConnectState],
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (event.button === 2) {
        inputStateRef.current.isRightMouseDown = false;
        updateLazyConnectState();
      }
    },

    [updateLazyConnectState],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.altKey) {
        inputStateRef.current.isAltPressed = true;
        updateLazyConnectState();
      }
    },

    [updateLazyConnectState],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!event.altKey) {
        inputStateRef.current.isAltPressed = false;
        updateLazyConnectState();
      }
    },

    [updateLazyConnectState],
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

  return {
    isActive: state.isActive,
    startPos: state.startPos,
    endPos: state.endPos,
  };
}
