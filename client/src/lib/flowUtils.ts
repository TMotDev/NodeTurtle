// Helper function to calculate the center of a group of nodes

import type { Edge, Node, NodeProps } from "@xyflow/react";

export function getNodeGroupCenter(nodes: Array<Node>) {
  if (nodes.length === 0) return { x: 0, y: 0 };

  const bounds = nodes.reduce(
    (acc, node) => ({
      minX: Math.min(acc.minX, node.position.x),
      maxX: Math.max(acc.maxX, node.position.x),
      minY: Math.min(acc.minY, node.position.y),
      maxY: Math.max(acc.maxY, node.position.y),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    },
  );

  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

export interface NodeRegistry {
  startNode: {};
  moveNode: { distance: number };
  loopNode: { loopCount: number };
  multiNode: {
    description: string;
    containedNodes: Array<Node>;
    containedEdges: Array<Edge>;
    inputCount: number;
    outputCount: number;
    originalConnections: {
      inputs: Array<{ nodeId: string; handleId: string; sourceNodeId: string; sourceHandle: string }>;
      outputs: Array<{ nodeId: string; handleId: string; targetNodeId: string; targetHandle: string }>;
    };
  }
}

export type NodeType = keyof NodeRegistry;

export const INITIAL_NODE_DATA: NodeRegistry = {
  startNode: {},
  moveNode: { distance: 10 },
  loopNode: { loopCount: 3 },
   multiNode: {
    description: "",
    containedNodes: [],
    containedEdges: [],
    inputCount: 1,
    outputCount: 1,
    originalConnections: {
      inputs: [],
      outputs: [],
    },
  },
};

export const NODE_EXECUTORS = {
  startNode: (nodeData: NodeRegistry['startNode']) => {
    console.log("Executing Start Node:", nodeData);
  },
  moveNode: (nodeData: NodeRegistry['moveNode']) => {
    console.log("Executing Move Node:", nodeData);
    console.log("Distance:", nodeData.distance);
  },
  loopNode: (nodeData: NodeRegistry['loopNode']) => {
    console.log("Executing Loop Node:", nodeData);
    console.log("Loop count:", nodeData.loopCount);
  },
  multiNode: (nodeData: NodeRegistry['multiNode']) => {
    console.log("Executing Multi Node:", nodeData);
    console.log("Contains:", nodeData.containedNodes.length, "nodes");
    console.log("Description:", nodeData.description);
  }
} satisfies Record<NodeType, (nodeData: any) => void>;

export type NodePropsFor<T extends NodeType> = NodeProps & {
  data: NodeRegistry[T] & { [K in keyof NodeRegistry[T]]: NodeRegistry[T][K] | undefined };
};

export type MoveNodeProps = NodePropsFor<'moveNode'>;
export type LoopNodeProps = NodePropsFor<'loopNode'>;
export type MultiNodeProps = NodePropsFor<'multiNode'>;

export type NodeTree = {
  node: {
    id: string;
    type: string;
    data: any;
    source?: { handle?: string };
  };
  children: Array<NodeTree>;
  isLoop: boolean;
};

export const createAsciiTree = (
  nodeTree: NodeTree,
  prefix: string = "",
  isLast: boolean = true,
  visited: Set<string> = new Set(),
): Array<string> => {
  const lines: Array<string> = [];
  const node = nodeTree.node;

  // Create the current node line
  const connector = prefix + (isLast ? "└── " : "├── ");
  const nodeLabel = `${node.type} (${node.id})${nodeTree.isLoop ? " [LOOP_REF]" : ""}${node.source?.handle ? ` [${node.source.handle}]` : ""}`;
  lines.push(connector + nodeLabel);

  // Track visited nodes to detect convergence
  if (visited.has(node.id) && !nodeTree.isLoop) {
    lines.push(prefix + (isLast ? "    " : "│   ") + "↑ [CONVERGENCE POINT]");
    return lines;
  }

  if (!nodeTree.isLoop) {
    visited.add(node.id);
  }

  // Process children
  const children = nodeTree.children;
  children.forEach((child, index) => {
    const isLastChild = index === children.length - 1;
    const childPrefix = prefix + (isLast ? "    " : "│   ");
    const childLines = createAsciiTree(
      child,
      childPrefix,
      isLastChild,
      new Set(visited),
    );
    lines.push(...childLines);
  });

  return lines;
};

export const createFlowSummary = (
  nodeTree: NodeTree,
  results: Array<any>,
): Array<string> => {
  const summary: Array<string> = [];
  const nodeCount = new Map<string, number>();
  const loopRefs = new Set<string>();

  const countNodes = (tree: NodeTree) => {
    const type = tree.node.type;
    nodeCount.set(type, (nodeCount.get(type) || 0) + 1);

    if (tree.isLoop) {
      loopRefs.add(tree.node.id);
    }

    tree.children.forEach(countNodes);
  };

  countNodes(nodeTree);

  summary.push("=".repeat(50));
  summary.push("FLOW ANALYSIS SUMMARY");
  summary.push("=".repeat(50));
  summary.push(`Total unique node types: ${nodeCount.size}`);

  for (const [type, count] of nodeCount.entries()) {
    summary.push(`  ${type}: ${count} instance(s)`);
  }

  if (loopRefs.size > 0) {
    summary.push(`Loop references detected: ${loopRefs.size}`);
    summary.push(`  Nodes: ${Array.from(loopRefs).join(", ")}`);
  }

  summary.push("=".repeat(50));

  return summary;
};

export const analyzeNodeConnections = (
  selectedNodes: Array<Node>,
  allNodes: Array<Node>,
  allEdges: Array<Edge>
) => {
  const selectedNodeIds = new Set(selectedNodes.map(n => n.id));

  const inputConnections = allEdges.filter(
    edge => selectedNodeIds.has(edge.target) && !selectedNodeIds.has(edge.source)
  );

  const outputConnections = allEdges.filter(
    edge => selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)
  );

  const internalConnections = allEdges.filter(
    edge => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
  );

  const uniqueInputs = new Set(
    inputConnections.map(edge => `${edge.target}-${edge.targetHandle || 'default'}`)
  );

  const uniqueOutputs = new Set(
    outputConnections.map(edge => `${edge.source}-${edge.sourceHandle || 'default'}`)
  );

  return {
    inputConnections,
    outputConnections,
    internalConnections,
    inputCount: Math.max(uniqueInputs.size, 1),
    outputCount: Math.max(uniqueOutputs.size, 1),
  };
};

export const createMultiNodeData = (
  selectedNodes: Array<Node>,
  allNodes: Array<Node>,
  allEdges: Array<Edge>
) => {
  const connections = analyzeNodeConnections(selectedNodes, allNodes, allEdges);

  return {
    description: "",
    containedNodes: selectedNodes,
    containedEdges: connections.internalConnections,
    inputCount: connections.inputCount,
    outputCount: connections.outputCount,
    originalConnections: {
      inputs: connections.inputConnections.map(edge => ({
        nodeId: edge.target,
        handleId: edge.targetHandle || 'in',
        sourceNodeId: edge.source,
        sourceHandle: edge.sourceHandle || 'out',
      })),
      outputs: connections.outputConnections.map(edge => ({
        nodeId: edge.source,
        handleId: edge.sourceHandle || 'out',
        targetNodeId: edge.target,
        targetHandle: edge.targetHandle || 'in',
      })),
    },
  };
};

export const canCombineNodes = (selectedNodes: Array<Node>): { canCombine: boolean; reason?: string } => {
  if (selectedNodes.length === 0) {
    return { canCombine: false, reason: "No nodes selected" };
  }

  if (selectedNodes.length === 1) {
    return { canCombine: false, reason: "Cannot combine single node" };
  }

  // Check if any selected node is a start node
  const hasStartNode = selectedNodes.some(node => node.type === 'startNode');
  if (hasStartNode) {
    return { canCombine: false, reason: "Cannot combine nodes containing start node" };
  }

  // Check if any selected node is already a multi node
  const hasMultiNode = selectedNodes.some(node => node.type === 'multiNode');
  if (hasMultiNode) {
    return { canCombine: false, reason: "Cannot combine nodes containing multi node" };
  }

  return { canCombine: true };
};