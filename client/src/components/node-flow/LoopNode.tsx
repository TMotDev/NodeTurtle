import { Repeat2 } from "lucide-react";
import { memo, useCallback } from "react";

import { Position, useReactFlow } from "@xyflow/react";
import { TooltipArrow } from "@radix-ui/react-tooltip";
import MathInputBox from "../MathInputBox";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import SuggestionBox from "../suggestionBox";
import { NodeHeader, NodeHeaderIcon, NodeHeaderTitle } from "./node-header";
import { BaseNode } from "./base-node";
import { BaseHandle } from "./base-handle";
import type { LoopNodeProps } from "@/lib/flowUtils";

const LoopNode = memo(({ selected, data, id }: LoopNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const loopCount = data.loopCount || 0;
  const isSpawnDisabled = loopCount > 5;

  const handleLoopCountChange = useCallback(
    (newLoopCount: number) => {
      const updates: any = { loopCount: newLoopCount };

      if (newLoopCount > 5) {
        updates.createTurtleOnIteration = false;
      }

      updateNodeData(id, updates);
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
    <BaseNode muted={data.muted} selected={selected} className="px-3 py-2 w-[11rem]">
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
          value={loopCount}
          onChange={handleLoopCountChange}
          placeholder="3"
          suggestions={[1,3,90]}
          min={0}
        />

        <div className="flex items-center space-x-2">
          <Checkbox
            id={`spawn-${id}`}
            checked={data.createTurtleOnIteration}
            onCheckedChange={handleSpawnTurtleChange}
            disabled={isSpawnDisabled}
          />

          <Tooltip delayDuration={1000}>
            <TooltipTrigger>
              <Label
                htmlFor={`spawn-${id}`}
                className={`text-[0.7rem] font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${isSpawnDisabled ? "text-gray-500" : "text-black"}`}
              >
                Spawn Turtle Each Loop
              </Label>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>
              {isSpawnDisabled
                ? "Disabled for > 5 loops to maintain performance."
                : "When enabled, a new turtle will be created at each iteration of the loop."}
              <TooltipArrow />
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </BaseNode>
  );
});

LoopNode.displayName = "LoopNode";

export default LoopNode;
