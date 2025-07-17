import { ArrowRight } from "lucide-react";
import React, { memo, useCallback, useRef, useState } from "react";

import { Position, useReactFlow } from "@xyflow/react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { NodeHeader, NodeHeaderIcon, NodeHeaderTitle } from "./node-header";
import { BaseNode } from "./base-node";
import { BaseHandle } from "./base-handle";
import type { KeyboardEvent } from "react";
import type { MoveNodeProps } from "@/lib/flowUtils";

const MoveNode = memo(({ selected, data, id }: MoveNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const [distance, setDistance] = useState(data.distance);

  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startValue = useRef(0);

  const handleDistanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value) || 0;
      setDistance(value);
      updateNodeData(id, { distance: value });
    },
    [id, updateNodeData],
  );

  const handleLabelMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // only allow LMB dragging
      e.preventDefault();
      setIsDragging(true);
      startX.current = e.clientX;
      startValue.current = distance;
      document.body.style.cursor = "ew-resize";
    },
    [distance],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX.current;
      const sensitivity = 0.2;
      const newDistance = Math.round(startValue.current + deltaX * sensitivity);

      setDistance(newDistance);
      updateNodeData(id, { distance: newDistance });
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
        const newDistance = distance + 1;
        setDistance(newDistance);
        updateNodeData(id, { distance: newDistance });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const newDistance = distance - 1;
        setDistance(newDistance);
        updateNodeData(id, { distance: newDistance });
      }
    },
    [distance, id, updateNodeData],
  );

  return (
    <BaseNode selected={selected} muted={data.muted} className={`px-3 py-2 w-40`}>
      <BaseHandle id="in" type="target" position={Position.Left} />
      <BaseHandle id="out" type="source" position={Position.Right} />

      <NodeHeader className="-mx-3 -mt-2 border-b bg-blue-500 text-white rounded-t-[6px]">
        <NodeHeaderIcon>
          <ArrowRight className="text-white" />
        </NodeHeaderIcon>
        <NodeHeaderTitle className="text-white">Move</NodeHeaderTitle>
      </NodeHeader>

      <div className="mt-3">
        <Label
          htmlFor={`distance-${id}`}
          className="text-sm font-medium cursor-ew-resize select-none nodrag w-max"
          onMouseDown={handleLabelMouseDown}
        >
          Distance
        </Label>
        <Input
          id={`distance-${id}`}
          type="text"
          value={distance}
          onChange={handleDistanceChange}
          onKeyDown={handleKeyDown}
          className="mt-1 text-center font-mono nodrag"
          placeholder="10"
        />
      </div>
    </BaseNode>
  );
});

MoveNode.displayName = "MoveNode";

export default MoveNode;
