import { Repeat2 } from "lucide-react";
import { memo, useCallback } from "react";

import { Position, useReactFlow } from "@xyflow/react";
import MathInputBox from "../MathInputBox";
import { NodeHeader, NodeHeaderIcon, NodeHeaderTitle } from "./node-header";
import { BaseNode } from "./base-node";
import { BaseHandle } from "./base-handle";
import type { LoopNodeProps } from "@/lib/flowUtils";

const LoopNode = memo(({ selected, data, id }: LoopNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const handleLoopCountChange = useCallback(
    (newLoopCount: number) => {
      updateNodeData(id, { loopCount: newLoopCount });
    },
    [id, updateNodeData],
  );

  return (
    <BaseNode muted={data.muted} selected={selected} className="px-3 py-2 w-40">
      <BaseHandle id="in" type="target" position={Position.Left} />
      <BaseHandle id="out" type="source" position={Position.Right} />
      <BaseHandle
        id="loop"
        className="!border-orange-300"
        type="source"
        position={Position.Bottom}
      />

      <NodeHeader className="-mx-3 -mt-2 border-b bg-orange-500 text-white rounded-t-[6px]">
        <NodeHeaderIcon>
          <Repeat2 className="text-white" />
        </NodeHeaderIcon>
        <NodeHeaderTitle className="text-white">Loop</NodeHeaderTitle>
      </NodeHeader>

      <div className="mt-3">
        <MathInputBox
          id={`loop-${id}`}
          label="Loop count"
          value={data.loopCount || 3}
          onChange={handleLoopCountChange}
          placeholder="3"
        />
      </div>
    </BaseNode>
  );
});

LoopNode.displayName = "LoopNode";

export default LoopNode;