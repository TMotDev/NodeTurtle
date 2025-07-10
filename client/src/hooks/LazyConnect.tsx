import { useCallback, useEffect, useRef, useState } from "react";

import { useReactFlow } from "@xyflow/react";

import { useMousePosition } from "./FlowMousePosition";

import type { Connection, XYPosition } from "@xyflow/react";
import { findClosestNode } from "@/lib/flowUtils";

interface LazyConnectState {
  isActive: boolean;
  startPos: XYPosition | null;
  endPos: XYPosition | null;
  sourceNodeId: string | null;
  targetNodeId: string | null;
}

export function useLazyConnect({
  isActive,
  onConnection,
  nodeOutlinedClassName = "lazy-connect-outline",
}: {
  isActive: boolean;
  onConnection?: (connection: Connection) => void;
  nodeOutlinedClassName?: string;
}) {
  const [state, setState] = useState<LazyConnectState>({
    isActive: false,
    startPos: null,
    endPos: null,
    sourceNodeId: null,
    targetNodeId: null,
  });

  const { mousePosition } = useMousePosition();
  const { getNodes, setNodes, screenToFlowPosition } = useReactFlow();
  const wasActiveRef = useRef(false);

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

  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      // Activation

      const nodes = getNodes();
      const sourceNode = findClosestNode(screenToFlowPosition(mousePosition), nodes);

      setState({
        isActive: true,
        startPos: mousePosition,
        endPos: mousePosition,
        sourceNodeId: sourceNode?.id || null,
        targetNodeId: null,
      });
    } else if (!isActive && wasActiveRef.current) {
      // Deactivation

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
    wasActiveRef.current = isActive;
  }, [
    clearNodeOutlines,
    connectNodes,
    getNodes,
    isActive,
    mousePosition,
    screenToFlowPosition,
    state.endPos,
    state.startPos,
  ]);

  useEffect(() => {
    if (!isActive) return;

    const nodes = getNodes();
    const targetNode = findClosestNode(screenToFlowPosition(mousePosition), nodes);

    setState((s) => ({
      ...s,
      endPos: mousePosition,
      targetNodeId: targetNode?.id || null,
    }));

    // Update node highlighting
    setNodes((nds) =>
      nds.map((n) => {
        const isSource = n.id === state.sourceNodeId;
        const isTarget = n.id === targetNode?.id;
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
    getNodes,
    setNodes,
    isActive,
    mousePosition,
    screenToFlowPosition,
    state.sourceNodeId,
    nodeOutlinedClassName,
  ]);

  return {
    isActive,
    startPos: state.startPos,
    endPos: state.endPos,
    connectionValid: !!(
      state.sourceNodeId &&
      state.targetNodeId &&
      state.sourceNodeId !== state.targetNodeId
    ),
  };
}