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
import { executeTurtleFlow } from "@/lib/flowUtils";

const StartNode = memo(({ id, selected }: NodeProps) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const { getNodes, getEdges } = useReactFlow();

  function getNodeTree(nodeID: string, visited: Set<string> = new Set()): NodeTree {
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

    // Process each outgoing node
    if (outgoers.length) {
      outgoers.forEach((outgoer) => {
        const edges = getEdges().filter((e) => e.source === nodeID && e.target === outgoer.id);

        console.log(`Edges from ${nodeID} to ${outgoer.id}:`, edges);

        // Process each edge separately
        edges.forEach((edge) => {
          if (!visited.has(outgoer.id)) {
            // Recursively build the subtree and add it to children
            const childTree = getNodeTree(outgoer.id, new Set([...visited]));
            // Add source handle information to help identify loop connections
            if (edge.sourceHandle) {
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
                source: edge.sourceHandle ? { handle: edge.sourceHandle } : undefined,
              },
              children: [],
              isLoop: true,
            };
            nodeTree.children.push(loopRef);
          }
        });
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
    <BaseNode selected={selected} className="px-3 py-2 w-40">
      <BaseHandle id="out" type="source" position={Position.Right} />
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
