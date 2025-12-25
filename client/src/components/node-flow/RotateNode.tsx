import { RotateCcw } from "lucide-react";
import { memo, useCallback } from "react";

import { Position, useReactFlow } from "@xyflow/react";
import MathInputBox from "../MathInputBox";
import { NodeHeader, NodeHeaderIcon, NodeHeaderTitle } from "./node-header";
import { BaseNode } from "./base-node";
import { BaseHandle } from "./base-handle";
import type { RotateNodeProps } from "@/lib/flowUtils";

const RotateNode = memo(({ selected, data, id }: RotateNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const handleAngleChange = useCallback(
    (newAngle: number) => {
      updateNodeData(id, { angle: newAngle });
    },
    [id, updateNodeData],
  );

  return (
    <BaseNode selected={selected} muted={data.muted} className={`px-3 py-2 w-[11rem]`}>
      <BaseHandle id="in" type="target" position={Position.Left} />
      <BaseHandle id="out" type="source" position={Position.Right} />

      <NodeHeader className="-mx-3 -mt-2 border-b bg-teal-500 text-white rounded-t-[6px]">
        <NodeHeaderIcon>
          <RotateCcw className="text-white" />
        </NodeHeaderIcon>
        <NodeHeaderTitle className="text-white">Rotate</NodeHeaderTitle>
      </NodeHeader>

      <div className="mt-3">
        <MathInputBox
          id={`angle-${id}`}
          label="Angle"
          value={data.angle || 0}
          onChange={handleAngleChange}
          placeholder="0"
          suggestions={[10,15,90]}
        />
      </div>
    </BaseNode>
  );
});

RotateNode.displayName = "RotateNode";

export default RotateNode;