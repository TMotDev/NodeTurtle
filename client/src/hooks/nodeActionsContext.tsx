import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { useFlowManager } from "./FlowManager";
import type { Edge, Node } from "@xyflow/react";
import type {NodeRegistry} from "@/lib/flowUtils";
import {  canCombineNodes, createMultiNodeData, getNodeGroupCenter } from "@/lib/flowUtils";

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
        id: `${node.type}_${uuidv4()}`,
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

  const combineIntoMultiNode = useCallback(() => {
  const selectedNodes = getNodes().filter((n) => n.selected);
  const allNodes = getNodes();
  const allEdges = getEdges();

  // Filter out start nodes from selection
  const validNodes = selectedNodes.filter((node) => node.type !== 'startNode');

  if (validNodes.length !== selectedNodes.length) {
    console.warn("Start nodes removed from selection before combining");
  }

  const validation = canCombineNodes(validNodes);
  if (!validation.canCombine) {
    console.error("Cannot combine nodes:", validation.reason);
    return;
  }

  const multiNodeData = createMultiNodeData(validNodes, allNodes, allEdges);
  const center = getNodeGroupCenter(validNodes);

  const multiNodeId = `multiNode_${uuidv4()}`;
  const multiNode: Node = {
    id: multiNodeId,
    type: 'multiNode',
    position: center,
    data: multiNodeData,
    selected: true,
  };

  // Get selected node IDs for removal
  const selectedNodeIds = new Set(validNodes.map(n => n.id));

  // Remove selected nodes and their internal connections
  const remainingNodes = allNodes.filter(n => !selectedNodeIds.has(n.id));
  const remainingEdges = allEdges.filter(e =>
    !selectedNodeIds.has(e.source) || !selectedNodeIds.has(e.target)
  );

  // Create new edges connecting to the multi-node
  const newEdges: Array<Edge> = [];

  // Create mappings for unique input/output handles
  const uniqueInputs = new Map<string, number>();
  const uniqueOutputs = new Map<string, number>();

  // Build unique input handle mapping
  multiNodeData.originalConnections.inputs.forEach((input) => {
    const handleKey = `${input.nodeId}-${input.handleId}`;
    if (!uniqueInputs.has(handleKey)) {
      uniqueInputs.set(handleKey, uniqueInputs.size);
    }
  });

  // Build unique output handle mapping
  multiNodeData.originalConnections.outputs.forEach((output) => {
    const handleKey = `${output.nodeId}-${output.handleId}`;
    if (!uniqueOutputs.has(handleKey)) {
      uniqueOutputs.set(handleKey, uniqueOutputs.size);
    }
  });

  // Handle input connections using the mapping
  multiNodeData.originalConnections.inputs.forEach((input) => {
    const handleKey = `${input.nodeId}-${input.handleId}`;
    const handleIndex = uniqueInputs.get(handleKey);

    const newEdge: Edge = {
      id: `edge_${uuidv4()}`,
      source: input.sourceNodeId,
      sourceHandle: input.sourceHandle,
      target: multiNodeId,
      targetHandle: `in-${handleIndex}`,
    };
    newEdges.push(newEdge);
  });

  // Handle output connections using the mapping
  multiNodeData.originalConnections.outputs.forEach((output) => {
    const handleKey = `${output.nodeId}-${output.handleId}`;
    const handleIndex = uniqueOutputs.get(handleKey);

    const newEdge: Edge = {
      id: `edge_${uuidv4()}`,
      source: multiNodeId,
      sourceHandle: `out-${handleIndex}`,
      target: output.targetNodeId,
      targetHandle: output.targetHandle,
    };
    newEdges.push(newEdge);
  });

  // Update the flow
  setNodes([...remainingNodes.map(n => ({ ...n, selected: false })), multiNode]);
  setEdges([...remainingEdges, ...newEdges]);
  markAsModified();
}, [getNodes, getEdges, setNodes, setEdges, markAsModified]);

  const explodeMultiNode = useCallback((multiNodeId: string) => {
    const allNodes = getNodes();
    const allEdges = getEdges();
    const multiNode = allNodes.find(n => n.id === multiNodeId);

    if (!multiNode || multiNode.type !== 'multiNode') {
      console.error("Cannot explode: not a multi-node");
      return;
    }

    const multiNodeData = multiNode.data as NodeRegistry['multiNode'];
    const { containedNodes, containedEdges, originalConnections } = multiNodeData;

    // Generate new IDs for all contained nodes
    const nodeIdMap: Record<string, string> = {};
    const restoredNodes = containedNodes.map((node: Node) => {
      const newId = `${node.type}_${uuidv4()}`;
      nodeIdMap[node.id] = newId;
      return {
        ...node,
        id: newId,
        selected: true,
      };
    });

    // Restore internal edges with new IDs
    const restoredInternalEdges = containedEdges.map((edge: Edge) => ({
      ...edge,
      id: `edge_${uuidv4()}`,
      source: nodeIdMap[edge.source],
      target: nodeIdMap[edge.target],
      selected: true,
    }));

    // Remove the multi-node and its connections
    const remainingNodes = allNodes.filter(n => n.id !== multiNodeId);
    const remainingEdges = allEdges.filter(e =>
      e.source !== multiNodeId && e.target !== multiNodeId
    );

    // Restore external connections
    const restoredExternalEdges: Array<Edge> = [];

    // Restore input connections
    const multiNodeInputEdges = allEdges.filter(e => e.target === multiNodeId);
    multiNodeInputEdges.forEach((edge, index) => {
      const originalInput = originalConnections.inputs[index];
      if (nodeIdMap[originalInput.nodeId]) {
        const newEdge: Edge = {
          id: `edge_${uuidv4()}`,
          source: edge.source,
          sourceHandle: edge.sourceHandle,
          target: nodeIdMap[originalInput.nodeId],
          targetHandle: originalInput.handleId,
        };
        restoredExternalEdges.push(newEdge);
      }
    });

    // Restore output connections
    const multiNodeOutputEdges = allEdges.filter(e => e.source === multiNodeId);
    multiNodeOutputEdges.forEach((edge, index) => {
      const originalOutput = originalConnections.outputs[index];
      if (nodeIdMap[originalOutput.nodeId]) {
        const newEdge: Edge = {
          id: `edge_${uuidv4()}`,
          source: nodeIdMap[originalOutput.nodeId],
          sourceHandle: originalOutput.handleId,
          target: edge.target,
          targetHandle: edge.targetHandle,
        };
        restoredExternalEdges.push(newEdge);
      }
    });

    // Update the flow
    setNodes([
      ...remainingNodes.map(n => ({ ...n, selected: false })),
      ...restoredNodes
    ]);
    setEdges([
      ...remainingEdges,
      ...restoredInternalEdges,
      ...restoredExternalEdges
    ]);
    markAsModified();
  }, [getNodes, getEdges, setNodes, setEdges, markAsModified]);

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
    combineIntoMultiNode,
    explodeMultiNode,
  };
};