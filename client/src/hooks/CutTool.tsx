import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import type { Edge } from "@xyflow/react";

export function useCutTool({
  isActive,
  onEdgesCut,
}: {
  isActive: boolean;
  onEdgesCut?: (edgeIds: Array<string>) => void;
}) {
  const [edgesToCut] = useState<Set<string>>(new Set());
  const { updateEdge } = useReactFlow();
  const edgesToCutRef = useRef<Set<string>>(new Set());
  const wasActiveRef = useRef(false);

  // Handle activation/deactivation
  useEffect(() => {
    if (!isActive && wasActiveRef.current) {
      if (onEdgesCut && edgesToCutRef.current.size > 0) {
        onEdgesCut(Array.from(edgesToCutRef.current));
      }
      edgesToCutRef.current.clear();
    }
    wasActiveRef.current = isActive;
  }, [isActive, onEdgesCut]);

  const handleEdgeMouseEnter = useCallback(
    (edge: Edge) => {
      if (!isActive) return;
      edgesToCutRef.current.add(edge.id);
      updateEdge(edge.id, { style: { strokeDasharray: "4 2", stroke: "crimson" } });
    },
    [isActive, updateEdge],
  );

  return {
    isActive,
    edgesToCut,
    handleEdgeMouseEnter,
  };
}
