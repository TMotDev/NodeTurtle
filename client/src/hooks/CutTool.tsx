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

export function useCutTool({ onEdgesCut }: UseCutToolOptions = {}) {
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
      inputStateRef.current.isCtrlPressed && inputStateRef.current.isRightMouseDown;

    setCutState((prev) => {
      if (shouldActivate && !prev.isActive) {
        return { ...prev, isActive: true };
      } else if (!shouldActivate && prev.isActive) {
        // Call the callback
        if (onEdgesCut && edgesToCutRef.current.size > 0) {
          onEdgesCut(Array.from(edgesToCutRef.current));
        }

        edgesToCutRef.current.clear();
        return { isActive: false, edgesToCut: new Set() };
      }
      return prev;
    });
  }, [onEdgesCut]);

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (event.button === 2) {
        inputStateRef.current.isRightMouseDown = true;
        updateKnifeState();
      }
    },
    [updateKnifeState],
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (event.button === 2 || inputStateRef.current.isRightMouseDown) {
        inputStateRef.current.isRightMouseDown = false;
        updateKnifeState();
      }
    },
    [updateKnifeState],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !inputStateRef.current.isCtrlPressed) {
        inputStateRef.current.isCtrlPressed = true;
        updateKnifeState();
      }
    },
    [updateKnifeState],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey && inputStateRef.current.isCtrlPressed) {
        inputStateRef.current.isCtrlPressed = false;
        updateKnifeState();
      }
    },
    [updateKnifeState],
  );

  const handleEdgeMouseEnter = useCallback(
    (edge: Edge) => {
      if (!cutState.isActive) return;

      edgesToCutRef.current.add(edge.id);
      updateEdge(edge.id, { style: { strokeDasharray: "4 2", stroke: "crimson" } });
    },
    [cutState.isActive, updateEdge],
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
    isActive: cutState.isActive,
    edgesToCut: cutState.edgesToCut,
    handleEdgeMouseEnter,
  };
}
