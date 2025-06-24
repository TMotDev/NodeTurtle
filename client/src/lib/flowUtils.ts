// Helper function to calculate the center of a group of nodes

import type { Node } from "@xyflow/react";

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

export const INITIAL_NODE_DATA = {
  startNode: {},
  moveNode: { distance: 10 }
};

export const NODE_EXECUTORS = {
  startNode: (nodeData: any) => {
    console.log("Executing Start Node:", nodeData);
  },
  moveNode: (nodeData: any) => {
    console.log("Executing Move Node:", nodeData);
  },
};

export type NodeTree = {
  node: {
    id: string;
    type: string;
    data: any;
    source?: { handle?: string; };
  };
  children: Array<NodeTree>;
  isLoop: boolean;
};
