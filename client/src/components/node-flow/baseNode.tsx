import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@radix-ui/react-dropdown-menu";
import { Rocket } from "lucide-react";
import { memo, useCallback } from "react";
import { Position, useNodeId, useReactFlow } from "@xyflow/react";
import {
  NodeHeader,
  NodeHeaderActions,
  NodeHeaderDeleteAction,
  NodeHeaderIcon,
  NodeHeaderMenuAction,
  NodeHeaderTitle,
} from "./node-header";
import { BaseNode } from "./base-node";
import { BaseHandle } from "./base-handle";
import type { NodeProps } from "@xyflow/react";

const NodeBase = memo(({ selected }: NodeProps) => {
  const id = useNodeId();
  const { setNodes } = useReactFlow();

  const handleDelete = useCallback(() => {
    setNodes((prevNodes) => prevNodes.filter((node) => node.id !== id));
  }, [id, setNodes]);

  return (
    <BaseNode selected={selected} className="px-3 py-2">
      <BaseHandle id="target-1" type="target" position={Position.Left} />
      <BaseHandle id="source-1" type="source" position={Position.Left} />
      <NodeHeader className="-mx-3 -mt-2 border-b">
        <NodeHeaderIcon>
          <Rocket />
        </NodeHeaderIcon>
        <NodeHeaderTitle>Node Title</NodeHeaderTitle>
        <NodeHeaderActions>
          <NodeHeaderMenuAction label="Expand node options">
            <DropdownMenuItem className="px-2 py-1 cursor-pointer text-xl hover:bg-gray-200">
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="px-2 py-1 cursor-pointer text-xl hover:bg-gray-200"
            >
              Delete
            </DropdownMenuItem>
          </NodeHeaderMenuAction>
        </NodeHeaderActions>
      </NodeHeader>
      <div className="mt-2">Node Content</div>
    </BaseNode>
  );
});

export default NodeBase;
