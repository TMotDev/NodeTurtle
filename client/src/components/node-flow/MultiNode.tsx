import { Edit3, Package } from "lucide-react";
import React, { memo, useCallback, useState } from "react";
import { Position, useReactFlow } from "@xyflow/react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { NodeHeader, NodeHeaderIcon, NodeHeaderTitle } from "./node-header";
import { BaseNode } from "./base-node";
import { BaseHandle } from "./base-handle";
import type { MultiNodeProps } from "@/lib/flowUtils";

const MultiNode = memo(({ selected, data, id }: MultiNodeProps) => {
  const { updateNodeData } = useReactFlow();
  const [description, setDescription] = useState(data.description || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setDescription(value);
      updateNodeData(id, { ...data, description: value });
    },
    [id, updateNodeData, data],
  );

  const handleEditToggle = useCallback(() => {
    setIsEditing(!isEditing);
  }, [isEditing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && e.ctrlKey) {
        setIsEditing(false);
      }
    },
    [],
  );

  // Create input handles based on inputCount
  const inputHandles = Array.from({ length: data.inputCount || 1 }, (_, i) => (
    <BaseHandle
      key={`input-${i}`}
      id={`in-${i}`}
      type="target"
      position={Position.Left}
      style={{
        top: `${((i + 1) / (data.inputCount + 1)) * 100}%`,
      }}
    />
  ));

  // Create output handles based on outputCount
  const outputHandles = Array.from({ length: data.outputCount || 1 }, (_, i) => (
    <BaseHandle
      key={`output-${i}`}
      id={`out-${i}`}
      type="source"
      position={Position.Right}
      style={{
        top: `${((i + 1) / (data.outputCount + 1)) * 100}%`,
      }}
    />
  ));

  return (
    <BaseNode selected={selected} className="px-4 py-3 w-64 min-h-32">
      {inputHandles}
      {outputHandles}

      <NodeHeader className="-mx-4 -mt-3 border-b bg-purple-500 text-white rounded-t-[6px]">
        <NodeHeaderIcon>
          <Package className="text-white" />
        </NodeHeaderIcon>
        <NodeHeaderTitle className="text-white">MultiNode</NodeHeaderTitle>
      </NodeHeader>

      <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{data.containedNodes.length || 0}</span> nodes inside
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEditToggle}
            className="h-6 w-6 p-0"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        </div>

        {isEditing ? (
          <div className="space-y-1">
            <Label htmlFor={`description-${id}`} className="text-xs text-gray-500">
              Description (Ctrl+Enter to save)
            </Label>
            <Textarea
              id={`description-${id}`}
              value={description}
              onChange={handleDescriptionChange}
              onKeyDown={handleKeyDown}
              className="min-h-16 text-xs nodrag resize-none"
              placeholder="Describe what this group of nodes does..."
              autoFocus
            />
          </div>
        ) : (
          <div className="min-h-16 p-2 bg-gray-50 rounded border text-xs text-gray-700">
            {description || "No description"}
          </div>
        )}

        <div className="flex justify-between text-xs text-gray-500">
          <span>In: {data.inputCount}</span>
          <span>Out: {data.outputCount}</span>
        </div>
      </div>
    </BaseNode>
  );
});

MultiNode.displayName = "MultiNode";

export default MultiNode;