import { RotateCcw } from "lucide-react";
import React, { memo, useCallback, useRef, useState } from "react";

import { Position, useReactFlow } from "@xyflow/react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { NodeHeader, NodeHeaderIcon, NodeHeaderTitle } from "./node-header";
import { BaseNode } from "./base-node";
import { BaseHandle } from "./base-handle";
import type { KeyboardEvent } from "react";
import type { RotateNodeProps } from "@/lib/flowUtils";

const RotateNode = memo(({ selected, data, id }: RotateNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const [angle, setAngle] = useState(data.angle);

  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startValue = useRef(0);

  const handleAngleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value) || 0;
      setAngle(value);
      updateNodeData(id, { angle: value });
    },
    [id, updateNodeData],
  );

  const handleLabelMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // only allow LMB dragging
      e.preventDefault();
      setIsDragging(true);
      startX.current = e.clientX;
      startValue.current = angle;
      document.body.style.cursor = "ew-resize";
    },
    [angle],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX.current;
      const sensitivity = 0.2;
      const newAngle = Math.round(startValue.current + deltaX * sensitivity);

      setAngle(newAngle);
      updateNodeData(id, { angle: newAngle });
    },
    [id, isDragging, updateNodeData],
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = "";
    }
  }, [isDragging]);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const newAngle = angle + 1;
        setAngle(newAngle);
        updateNodeData(id, { angle: newAngle });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const newAngle = angle - 1;
        setAngle(newAngle);
        updateNodeData(id, { angle: newAngle });
      }
    },
    [angle, id, updateNodeData],
  );

  return (
    <BaseNode selected={selected} muted={data.muted} className={`px-3 py-2 w-40`}>
      <BaseHandle id="in" type="target" position={Position.Left} />
      <BaseHandle id="out" type="source" position={Position.Right} />

      <NodeHeader className="-mx-3 -mt-2 border-b bg-blue-500 text-white rounded-t-[6px]">
        <NodeHeaderIcon>
          <RotateCcw className="text-white" />
        </NodeHeaderIcon>
        <NodeHeaderTitle className="text-white">Rotate</NodeHeaderTitle>
      </NodeHeader>

      <div className="mt-3">
        <Label
          htmlFor={`angle-${id}`}
          className="text-sm font-medium cursor-ew-resize select-none nodrag w-max"
          onMouseDown={handleLabelMouseDown}
        >
          Angle
        </Label>
        <Input
          id={`angle-${id}`}
          type="text"
          value={angle}
          onChange={handleAngleChange}
          onKeyDown={handleKeyDown}
          className="mt-1 text-center font-mono nodrag"
          placeholder="10"
        />
      </div>
    </BaseNode>
  );
});

RotateNode.displayName = "RotateNode";

export default RotateNode;
