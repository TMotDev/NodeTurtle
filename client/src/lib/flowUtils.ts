// Helper function to calculate the center of a group of nodes

import type { Node, NodeProps, XYPosition } from "@xyflow/react";

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
}

export type NodeType = keyof NodeRegistry;

export const INITIAL_NODE_DATA: NodeRegistry = {
  startNode: {},
  moveNode: { distance: 10 },
  loopNode: { loopCount: 3 },
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
  }
} satisfies Record<NodeType, (nodeData: any) => void>;

export type NodePropsFor<T extends NodeType> = NodeProps & {
  data: NodeRegistry[T] & { [K in keyof NodeRegistry[T]]: NodeRegistry[T][K] | undefined };
};

export type MoveNodeProps = NodePropsFor<'moveNode'>;
export type LoopNodeProps = NodePropsFor<'loopNode'>;


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


// Utility function to calculate distance between two points
export function getDistance(p1: XYPosition, p2: XYPosition): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Find the closest node to a given point
export function findClosestNode(point: XYPosition, nodes: Array<Node>): Node | null {
  if (nodes.length === 0) return null;

  let closestNode = nodes[0];

  let minDistance = getDistance(point, {
    x: closestNode.position.x + (closestNode.measured?.width || 0) / 2,
    y: closestNode.position.y + (closestNode.measured?.height || 0) / 2,
  });

  for (const node of nodes) {
    // Calculate node center point
    const nodeCenter = {
      x: node.position.x + (node.measured?.width || 0) / 2,
      y: node.position.y + (node.measured?.height || 0) / 2,
    };

    const distance = getDistance(point, nodeCenter);
    if (distance < minDistance) {
      minDistance = distance;
      closestNode = node;
    }
  }

  return closestNode;
}