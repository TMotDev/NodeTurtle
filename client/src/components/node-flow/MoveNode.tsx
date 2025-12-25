import { ArrowRight } from "lucide-react";
import { memo, useCallback } from "react";

import { Position, useReactFlow } from "@xyflow/react";
import MathInputBox from "../MathInputBox";
import { NodeHeader, NodeHeaderIcon, NodeHeaderTitle } from "./node-header";
import { BaseNode } from "./base-node";
import { BaseHandle } from "./base-handle";
import type { MoveNodeProps } from "@/lib/flowUtils";

const MoveNode = memo(({ selected, data, id }: MoveNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const handleDistanceChange = useCallback(
    (newDistance: number) => {
      updateNodeData(id, { distance: newDistance });
    },
    [id, updateNodeData],
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
        <MathInputBox
          id={`distance-${id}`}
          label="Distance"
          value={data.distance || 50}
          onChange={handleDistanceChange}
          placeholder="50"
          suggestions={[10,15,50]}
        />
      </div>
    </BaseNode>
  );
});

MoveNode.displayName = "MoveNode";

export default MoveNode;