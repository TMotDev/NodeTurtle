import { Flag, Loader2 } from "lucide-react";
import { memo, useState } from "react";
import { Position, getOutgoers, useReactFlow } from "@xyflow/react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { NodeHeader, NodeHeaderTitle } from "./node-header";
import { BaseNode } from "./base-node";
import { BaseHandle } from "./base-handle";
import type { NodeProps } from "@xyflow/react";
import type { NodeTree } from "@/lib/flowUtils";
import { NODE_EXECUTORS } from "@/lib/flowUtils";

// Helper function to create ASCII tree visualization
const createAsciiTree = (
  nodeTree: NodeTree,
  prefix: string = "",
  isLast: boolean = true,
  visited: Set<string> = new Set(),
): Array<string> => {
  const lines: Array<string> = [];
  const node = nodeTree.node;

  // Create the current node line
  const connector = prefix + (isLast ? "└── " : "├── ");
  const nodeLabel = `${node.type} ${node.data.distance} (${node.id})${nodeTree.isLoop ? " [LOOP_REF]" : ""}${node.source?.handle ? ` [${node.source.handle}]` : ""}`;
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

// Helper function to create a flow summary
const createFlowSummary = (
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

export const executeTurtleFlow = async (nodeTree: any) => {
  // Initialize results array to collect output
  const results: Array<{ turtleId: string; log: string; path: Array<any> }> =
    [];

  // Create and log the ASCII tree visualization
  console.log("\n" + "=".repeat(60));
  console.log("NODE FLOW TREE VISUALIZATION");
  console.log("=".repeat(60));

  const treeLines = createAsciiTree(nodeTree);
  treeLines.forEach((line) => console.log(line));

  console.log("\n" + createFlowSummary(nodeTree, results).join("\n"));

  // Store tree visualization in results for debugging
  results.push({
    turtleId: "debug",
    log: "tree_visualization",
    path: treeLines,
  });

  // Process a node and its children recursively
  const processNode = async (
    nodeObj: any,
    depth: number = 0,
    path: Array<string> = [],
  ) => {
    if (!nodeObj || nodeObj.isLoop) return;

    const node = nodeObj.node;
    const children = nodeObj.children || [];
    const nodeType = node.type as string;
    const currentPath = [...path, `${node.type}(${node.id})`];

    // Log current execution path
    const indent = "  ".repeat(depth);
    console.log(`${indent}→ Executing: ${node.type}(${node.id})`);

    if (nodeType === "loop") {
      const loopCount = node.data.loops || 3;
      const loopChildren = [];
      const exitChildren = [];

      for (const child of children) {
        if (child.node.source?.handle === "loop") {
          loopChildren.push(child);
        } else {
          exitChildren.push(child);
        }
      }

      if (loopChildren.length > 0) {
        console.log(`${indent}  ↻ Loop executing ${loopCount} times`);

        for (let i = 0; i < loopCount; i++) {
          console.log(`${indent}    Iteration ${i + 1}/${loopCount}`);
          for (const loopChild of loopChildren) {
            await processNode(loopChild, depth + 2, currentPath);
          }
        }
      }

      console.log(
        `${indent}  → Exiting loop, processing ${exitChildren.length} exit path(s)`,
      );
      for (const exitChild of exitChildren) {
        await processNode(exitChild, depth + 1, currentPath);
      }

      return;
    }

    const executeFn = NODE_EXECUTORS[nodeType as keyof typeof NODE_EXECUTORS];
    executeFn(node.data);

    // await sleep(30);

    if (children.length === 0) {
      console.log(`${indent}  ✓ End of path: ${currentPath.join(" → ")}`);
    } else if (children.length === 1) {
      await processNode(children[0], depth + 1, currentPath);
    } else {
      console.log(`${indent}  ⚡ Branching into ${children.length} paths`);
      for (const [index, child] of children.entries()) {
        console.log(`${indent}    Branch ${index + 1}:`);
        await processNode(child, depth + 2, currentPath);
      }
    }
  };

  console.log("\nSTARTING EXECUTION:");
  console.log("=".repeat(60));
  await processNode(nodeTree);

  console.log("\nEXECUTION COMPLETED!");
  console.log("=".repeat(60));

  return results;
};

const StartNode = memo(({ id, selected }: NodeProps) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const { getNodes, getEdges } = useReactFlow();

  function getNodeTree(
    nodeID: string,
    visited: Set<string> = new Set(),
  ): NodeTree {
    // Mark this node as visited
    visited.add(nodeID);

    const node = getNodes().find((n) => n.id === nodeID);
    const outgoers = getOutgoers({ id: nodeID }, getNodes(), getEdges());

    const nodeTree: NodeTree = {
      node: {
        id: nodeID,
        type: node?.type || "",
        data: node?.data || {},
      },
      children: [],
      isLoop: false,
    };

    // Process each outgoing node that hasn't been visited yet
    if (outgoers.length) {
      outgoers.forEach((outgoer) => {
        // Get the edge that connects this node to the outgoer
        const edge = getEdges().find(
          (e) => e.source === nodeID && e.target === outgoer.id,
        );

        // Only process this outgoer if we haven't seen it before
        if (!visited.has(outgoer.id)) {
          // Recursively build the subtree and add it to children
          const childTree = getNodeTree(outgoer.id, new Set([...visited]));
          // Add source handle information to help identify loop connections
          if (edge && edge.sourceHandle) {
            childTree.node.source = { handle: edge.sourceHandle };
          }
          nodeTree.children.push(childTree);
        } else {
          // For loops, add a reference but don't recurse
          const loopRef: NodeTree = {
            node: {
              id: outgoer.id,
              type: outgoer.type as string,
              data: outgoer.data,
              source:
                edge && edge.sourceHandle
                  ? { handle: edge.sourceHandle }
                  : undefined,
            },
            children: [],
            isLoop: true,
          };
          nodeTree.children.push(loopRef);
        }
      });
    }

    return nodeTree;
  }

  function handleClick(): void {
    const nodeTree = getNodeTree(id);
    console.log("Raw NodeTree object:", JSON.stringify(nodeTree, null, 2));
    executeTurtleFlow(nodeTree);
  }

  return (
    <BaseNode selected={selected} className="px-4 py-3 w-40 shadow-md/20">
      <BaseHandle id="source-1" type="source" position={Position.Right} />
      <NodeHeader className="-mx-3 -mt-2 border-b">
        <NodeHeaderTitle>
          <Button className="btn w-full bg-green-700" onClick={handleClick}>
            <Flag />
            {isExecuting ? <Loader2 className="animate-spin" /> : "START"}
          </Button>
        </NodeHeaderTitle>
      </NodeHeader>
      <div className="mt-2 flex flex-col gap-3">
        <div
          className="flex flex-row gap-2 items-center"
          title="Automatically start the flow on every change"
        >
          <Label htmlFor="autoStart" className="flex items-center gap-2">
            <Checkbox id="autoStart" />
            Auto-start
          </Label>
        </div>
      </div>
    </BaseNode>
  );
});

export default StartNode;
