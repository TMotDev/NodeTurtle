import { Repeat2 } from "lucide-react";
import React, { memo, useCallback, useRef, useState } from "react";

import { Position, useReactFlow } from "@xyflow/react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { NodeHeader, NodeHeaderIcon, NodeHeaderTitle } from "./node-header";
import { BaseNode } from "./base-node";
import { BaseHandle } from "./base-handle";
import type { KeyboardEvent } from "react";
import type { LoopNodeProps } from "@/lib/flowUtils";

const LoopNode = memo(({ selected, data, id }: LoopNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const [loopCount, setLoopCount] = useState(data.loopCount);

  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startValue = useRef(0);

  const handleLoopChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value) || 0;
      setLoopCount(value);
      updateNodeData(id, { loopCount: value });
    },
    [id, updateNodeData],
  );

  const handleLabelMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // only allow LMB dragging
      e.preventDefault();
      setIsDragging(true);
      startX.current = e.clientX;
      startValue.current = loopCount;
      document.body.style.cursor = "ew-resize";
    },
    [loopCount],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX.current;
      const sensitivity = 0.2;
      const newLoop = Math.round(startValue.current + deltaX * sensitivity);

      setLoopCount(newLoop);
      updateNodeData(id, { loopCount: newLoop });
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
        const newLoopCount = loopCount + 1;
        setLoopCount(newLoopCount);
        updateNodeData(id, { loopCount: newLoopCount });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const newLoopCount = loopCount - 1;
        setLoopCount(newLoopCount);
        updateNodeData(id, { loopCount: newLoopCount });
      }
    },
    [loopCount, id, updateNodeData],
  );

  return (
    <BaseNode selected={selected} className="px-3 py-2 w-40">
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
        <Label
          htmlFor={`loop-${id}`}
          className="text-sm font-medium cursor-ew-resize select-none nodrag w-max"
          onMouseDown={handleLabelMouseDown}
        >
          Loop count
        </Label>
        <Input
          id={`loop-${id}`}
          type="text"
          value={loopCount}
          onChange={handleLoopChange}
          onKeyDown={handleKeyDown}
          className="mt-1 text-center font-mono nodrag"
          placeholder="10"
        />
      </div>
    </BaseNode>
  );
});

LoopNode.displayName = "MoveNode";

export default LoopNode;
