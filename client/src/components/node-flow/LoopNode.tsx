import { Repeat2 } from "lucide-react";
import { memo, useCallback } from "react";

import { Position, useReactFlow } from "@xyflow/react";
import MathInputBox from "../MathInputBox";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
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

  const handleSpawnTurtleChange = useCallback(
    (checked: boolean) => {
      updateNodeData(id, { createTurtleOnIteration: checked });
    },
    [id, updateNodeData],
  );

  return (
    <BaseNode muted={data.muted} selected={selected} className="px-3 py-2 w-48">
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

      <div className="mt-3 flex flex-col gap-3">
        <MathInputBox
          id={`loop-${id}`}
          label="Loop count"
          value={data.loopCount || 0}
          onChange={handleLoopCountChange}
          placeholder="3"
        />

        <div className="flex items-center space-x-2">
          <Checkbox
            id={`spawn-${id}`}
            checked={data.createTurtleOnIteration}
            onCheckedChange={handleSpawnTurtleChange}
          />
          <Label
            htmlFor={`spawn-${id}`}
            className="text-xs font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Spawn turtle each loop
          </Label>
        </div>
      </div>
    </BaseNode>
  );
});

LoopNode.displayName = "LoopNode";

export default LoopNode;