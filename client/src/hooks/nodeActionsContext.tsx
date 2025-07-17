import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import type { Edge, Node } from "@xyflow/react";

export const useNodeOperations = () => {
  const { deleteElements, getNodes, getEdges, setNodes, setEdges } = useReactFlow();

  const duplicateSelection = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = getEdges().filter(
      (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target),
    );

    if (selectedNodes.length === 0) return;

    const nodeIdMap: Record<string, string> = {};
    const newNodes = selectedNodes.map((node) => {
      const newId = `${node.type}_${uuidv4()}`;
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
      id: `edge_${uuidv4()}`,
      source: nodeIdMap[edge.source],
      target: nodeIdMap[edge.target],
      selected: true,
    }));

    setNodes((nds: Array<Node>) => nds.map((n) => ({ ...n, selected: false })).concat(newNodes));
    setEdges((eds: Array<Edge>) => eds.map((e) => ({ ...e, selected: false })).concat(newEdges));
  }, [getNodes, getEdges, setNodes, setEdges]);

  const deleteSelection = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    const selectedEdges = getEdges().filter((e) => e.selected);

    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

    deleteElements({ nodes: selectedNodes, edges: selectedEdges });
  }, [getNodes, getEdges, deleteElements]);

  const muteSelection = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    if (selectedNodes.length === 0) return;

    setNodes((nds: Array<Node>) =>
      nds.map((node) => {
        if (node.selected && "muted" in node.data) {
          return {
            ...node,
            data: {
              ...node.data,
              muted: !node.data.muted,
            },
          };
        }
        return node;
      }),
    );

  }, [getNodes, setNodes]);

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
          id: `${node.type}_${uuidv4()}`,
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
          },
          selected: true,
        };
        setNodes((nds: Array<Node>) => nds.map((n) => ({ ...n, selected: false })).concat(newNode));
      }
    },
    [duplicateSelection, getNodes, setNodes],
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
    [deleteElements, deleteSelection, getNodes],
  );

  return {
    duplicateNode,
    deleteNode,
    deleteSelection,
    duplicateSelection,
    muteSelection,
  };
};
