import { useCallback, useEffect, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { useMousePosition } from "./FlowMousePosition";
import type { Edge, Node } from "@xyflow/react";
import { getNodeGroupCenter } from "@/lib/flowUtils";

export const useClipboard = () => {
  const [copiedElements, setCopiedElements] = useState<{
    nodes: Array<Node>;
    edges: Array<Edge>;
  }>({ nodes: [], edges: [] });

  const { screenToFlowPosition, getNodes, getEdges, setNodes, setEdges } = useReactFlow();

  const nodes = getNodes();
  const edges = getEdges();

  const { mousePosition } = useMousePosition();

  const copyElements = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = edges.filter((edge) => edge.selected);

    // Get edges that connect selected nodes
    const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
    const connectedEdges = edges.filter(
      (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target),
    );

    const allEdgesToCopy = new Map();

    // Add explicitly selected edges
    selectedEdges.forEach((edge) => {
      allEdgesToCopy.set(edge.id, edge);
    });

    // Add connected edges
    connectedEdges.forEach((edge) => {
      allEdgesToCopy.set(edge.id, edge);
    });

    setCopiedElements({
      nodes: selectedNodes,
      edges: Array.from(allEdgesToCopy.values()),
    });
  }, [nodes, edges]);

  const pasteElements = useCallback(() => {
    if (copiedElements.edges.length === 0 && copiedElements.nodes.length === 0) return;

    const position = screenToFlowPosition({
      x: mousePosition.x,
      y: mousePosition.y,
    });

    const groupCenter = getNodeGroupCenter(copiedElements.nodes);

    const nodeIdMap: Record<string, string> = {};
    const newNodes = copiedElements.nodes.map((node) => {
      const newId = `${node.type}_${uuidv4()}`;
      nodeIdMap[node.id] = newId;

      // Calculate offset from group center to individual node
      const offsetFromCenter = {
        x: node.position.x - groupCenter.x,
        y: node.position.y - groupCenter.y,
      };

      // Position the node relative to the mouse cursor
      const newPosition = {
        x: position.x + offsetFromCenter.x,
        y: position.y + offsetFromCenter.y,
      };

      return {
        ...node,
        id: newId,
        position: newPosition,
        selected: true,
      };
    });

    const newEdges = copiedElements.edges
      .map((edge) => {
        return {
          ...edge,
          id: `edge_${uuidv4()}`,
          source: nodeIdMap[edge.source],
          target: nodeIdMap[edge.target],
          selected: true,
        };
      })
      .filter((edge) => edge.source && edge.target);

    setNodes((nds: Array<Node>) => nds.map((n) => ({ ...n, selected: false })).concat(newNodes));
    setEdges((eds: Array<Edge>) => eds.map((e) => ({ ...e, selected: false })).concat(newEdges));
  }, [copiedElements, setNodes, setEdges, screenToFlowPosition, mousePosition]);

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

  return {
    copyElements,
    pasteElements,
    copiedElements,
  };
};
