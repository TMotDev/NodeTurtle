import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import type { Edge } from "@xyflow/react";

interface UseCutToolOptions {
  onEdgesCut?: (edgeIds: Array<string>) => void;
}

interface CutToolState {
  isActive: boolean;
  edgesToCut: Set<string>;
}

export function useCutTool({ onEdgesCut}: UseCutToolOptions = {}) {
  const [cutState, setCutState] = useState<CutToolState>({
    isActive: false,
    edgesToCut: new Set(),
  });

  const { updateEdge } = useReactFlow();
  const edgesToCutRef = useRef<Set<string>>(new Set());

  const inputStateRef = useRef({
    isRightMouseDown: false,
    isCtrlPressed: false,
  });

  const updateKnifeState = useCallback(() => {
    const shouldActivate =
      inputStateRef.current.isCtrlPressed &&
      inputStateRef.current.isRightMouseDown;

    setCutState((prev) => {
      if (shouldActivate && !prev.isActive) {
        console.log("Knife activated");
        return { ...prev, isActive: true };
      } else if (!shouldActivate && prev.isActive) {
        console.log("Knife deactivated");

        // Call the callback with the edges to cut
        if (onEdgesCut && edgesToCutRef.current.size > 0) {
          onEdgesCut(Array.from(edgesToCutRef.current));
        }

        edgesToCutRef.current.clear();
        return { isActive: false, edgesToCut: new Set() };
      }
      return prev;
    });
  }, [onEdgesCut]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button === 2) {
      inputStateRef.current.isRightMouseDown = true;
      console.log("mouse down");
      updateKnifeState();
    }
  }, [updateKnifeState]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (event.button === 2 || inputStateRef.current.isRightMouseDown) {
      inputStateRef.current.isRightMouseDown = false;
      console.log("mouse up");
      updateKnifeState();
    }
  }, [updateKnifeState]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && !inputStateRef.current.isCtrlPressed) {
      inputStateRef.current.isCtrlPressed = true;
      console.log("keydown");
      updateKnifeState();
    }
  }, [updateKnifeState]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!event.ctrlKey && !event.metaKey && inputStateRef.current.isCtrlPressed) {
      inputStateRef.current.isCtrlPressed = false;
      console.log("keyup");
      updateKnifeState();
    }
  }, [updateKnifeState]);

  const handleEdgeMouseEnter = useCallback((edge: Edge) => {
    if (!cutState.isActive) return;

    edgesToCutRef.current.add(edge.id);
    updateEdge(edge.id, { style: { strokeDasharray: "4 2" } });
  }, [cutState.isActive, updateEdge]);

  useEffect(() => {
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleMouseDown, handleMouseUp, handleKeyDown, handleKeyUp]);

  return {
    isActive: cutState.isActive,
    edgesToCut: cutState.edgesToCut,
    handleEdgeMouseEnter,
  };
}