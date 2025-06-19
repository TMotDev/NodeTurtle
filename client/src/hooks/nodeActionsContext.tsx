// src/hooks/useNodeOperations.ts
import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";

let id = 0;
const getId = () => `n_${id++}`;

export const useNodeOperations = (setNodes: any, setEdges: any) => {
  const { deleteElements, getNodes, getEdges } = useReactFlow();

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const node = getNodes().find((n) => n.id === nodeId);
      const selectedNodes = getNodes().filter((n) => n.selected);

      // check if nodes are selected using shift button
      if (selectedNodes.length > 1) {
        duplicateSelection();
        return;
      }

      if (node) {
        const newNode = {
          ...node,
          id: getId(),
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
          },
          selected: true,
        };
        setNodes((nds: Array<Node>) =>
          nds.map((n) => ({ ...n, selected: false })).concat(newNode),
        );
      }
    },
    [getNodes, setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      const selectedNodes = getNodes().filter((n) => n.selected);

      if (selectedNodes.length > 1) {
        deleteSelection();
        return;
      }

      deleteElements({ nodes: [{ id: nodeId }] });
    },
    [deleteElements, getNodes],
  );

  const deleteSelection = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    const selectedEdges = getEdges().filter((e) => e.selected);
    deleteElements({ nodes: selectedNodes, edges: selectedEdges });
  }, [getNodes, getEdges, deleteElements]);

  const duplicateSelection = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = getEdges().filter(
      (edge) =>
        selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target),
    );

    if (selectedNodes.length === 0) return;

    const nodeIdMap: Record<string, string> = {};
    const newNodes = selectedNodes.map((node) => {
      const newId = getId();
      nodeIdMap[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: { x: node.position.x + 50, y: node.position.y + 50 },
        selected: true,
      };
    });

    const newEdges = selectedEdges.map((edge) => ({
      ...edge,
      id: `e${nodeIdMap[edge.source]}-${nodeIdMap[edge.target]}`,
      source: nodeIdMap[edge.source],
      target: nodeIdMap[edge.target],
      selected: true,
    }));

    setNodes((nds: Array<Node>) =>
      nds.map((n) => ({ ...n, selected: false })).concat(newNodes),
    );
    setEdges((eds: Array<Edge>) =>
      eds.map((e) => ({ ...e, selected: false })).concat(newEdges),
    );
  }, [getNodes, getEdges, setNodes, setEdges]);

  return {
    duplicateNode,
    deleteNode,
    deleteSelection,
    duplicateSelection,
  };
};
