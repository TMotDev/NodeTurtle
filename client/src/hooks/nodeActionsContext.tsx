import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { useFlowManager } from "./FlowManager";
import type { Edge, Node } from "@xyflow/react";

export const useNodeOperations = () => {
  const { deleteElements, getNodes, getEdges, setNodes, setEdges } =
    useReactFlow();
  const { markAsModified } = useFlowManager();

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
      const newId = uuidv4();
      nodeIdMap[node.id] = newId;
      return {
        ...node,
        id: `node_${uuidv4()}`,
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

    setNodes((nds: Array<Node>) =>
      nds.map((n) => ({ ...n, selected: false })).concat(newNodes),
    );
    setEdges((eds: Array<Edge>) =>
      eds.map((e) => ({ ...e, selected: false })).concat(newEdges),
    );
    markAsModified();
  }, [getNodes, getEdges, setNodes, setEdges, markAsModified]);

  const deleteSelection = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    const selectedEdges = getEdges().filter((e) => e.selected);
    deleteElements({ nodes: selectedNodes, edges: selectedEdges });
    markAsModified();
  }, [getNodes, getEdges, deleteElements, markAsModified]);

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
          id: `node_${uuidv4()}`,
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
          },
          selected: true,
        };
        setNodes((nds: Array<Node>) =>
          nds.map((n) => ({ ...n, selected: false })).concat(newNode),
        );
        markAsModified();
      }
    },
    [duplicateSelection, getNodes, markAsModified, setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      const selectedNodes = getNodes().filter((n) => n.selected);

      if (selectedNodes.length > 1) {
        deleteSelection();
        return;
      }

      deleteElements({ nodes: [{ id: nodeId }] });
      markAsModified();
    },
    [deleteElements, deleteSelection, getNodes, markAsModified],
  );

  return {
    duplicateNode,
    deleteNode,
    deleteSelection,
    duplicateSelection,
  };
};
