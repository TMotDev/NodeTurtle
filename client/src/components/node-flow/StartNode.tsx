import { Flag, Loader2 } from "lucide-react";
import { memo } from "react";
import { Position } from "@xyflow/react";
import { BaseNode } from "./base-node";
import { BaseHandle } from "./base-handle";
import type { NodeProps } from "@xyflow/react";

const StartNode = memo(({ selected }: NodeProps) => {
  return (
    <BaseNode selected={selected} className="px-3 py-2 w-40 bg-green-700">
      <BaseHandle id="out" type="source" position={Position.Right} />
      <div className="flex flex-col gap-3">
        <div className="flex flex-row gap-2 text-white">
          <Flag />
          START
        </div>
      </div>
    </BaseNode>
  );
});

export default StartNode;
