import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@radix-ui/react-dropdown-menu";
import { Rocket } from "lucide-react";
import { memo } from "react";
import {  Position } from "@xyflow/react";
import  { BaseNode } from "./base-node";
import { NodeHeader, NodeHeaderActions, NodeHeaderDeleteAction, NodeHeaderIcon, NodeHeaderMenuAction, NodeHeaderTitle } from "./node-header";
import { BaseHandle } from "./base-handle";
import type {NodeProps} from "@xyflow/react";

const NodeBase = memo(({ selected }: NodeProps) => {
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
          <NodeHeaderMenuAction label="Expand account options">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuItem>Subscription</DropdownMenuItem>
          </NodeHeaderMenuAction>
          <NodeHeaderDeleteAction />
        </NodeHeaderActions>
      </NodeHeader>
      <div className="mt-2">Node Content</div>
    </BaseNode>
  );
});

export default NodeBase;