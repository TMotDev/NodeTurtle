import { Pen } from "lucide-react";
import React, { memo, useCallback, useState } from "react";

import { Position, useReactFlow } from "@xyflow/react";
import { Label } from "../ui/label";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { NodeHeader, NodeHeaderIcon, NodeHeaderTitle } from "./node-header";
import { BaseNode } from "./base-node";
import { BaseHandle } from "./base-handle";
import type { PenNodeProps } from "@/lib/flowUtils";

const PenNode = memo(({ selected, data, id }: PenNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const [penDown, setPenDown] = useState(data.penDown);
  const [color, setColor] = useState(data.color);

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = e.target.value;
      setColor(newColor);
      updateNodeData(id, { color: newColor, penDown });
    },
    [id, updateNodeData, penDown],
  );

  const handlePenChange = useCallback(
    (value: string) => {
      const isDown = value === "down";
      setPenDown(isDown);
      updateNodeData(id, { penDown: isDown, color });
    },
    [id, updateNodeData, color],
  );

  return (
    <BaseNode selected={selected} muted={data.muted} className="px-3 py-2 w-48">
      <BaseHandle id="in" type="target" position={Position.Left} />
      <BaseHandle id="out" type="source" position={Position.Right} />

      <NodeHeader className="-mx-3 -mt-2 border-b bg-cyan-700 text-white rounded-t-[6px]">
        <NodeHeaderIcon>
          <Pen className="text-white" />
        </NodeHeaderIcon>
        <NodeHeaderTitle className="text-white">Pen</NodeHeaderTitle>
      </NodeHeader>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor={`color-${id}`} className="text-sm font-medium select-none nodrag">
            Color
          </Label>
          <div className="relative nodrag rounded-md overflow-hidden w-7 h-7 border-2 border-gray-300">
            <input
              id={`color-${id}`}
              type="color"
              value={color}
              onChange={handleColorChange}
              className="absolute -top-1 -left-1 w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-none p-0 bg-transparent"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
            <Label htmlFor={`pen-down-${id}`} className="text-sm font-medium select-none nodrag">
            Pen State
          </Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={penDown ? "down" : "up"}
            onValueChange={handlePenChange}
            className="justify-start"
          >
            <ToggleGroupItem value="up" aria-label="up">
              Up
            </ToggleGroupItem>
            <ToggleGroupItem value="down" aria-label="down">
              Down
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </BaseNode>
  );
});

PenNode.displayName = "PenNode";

export default PenNode;
