import { StickyNote } from "lucide-react";
import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { NodeHeader, NodeHeaderIcon } from "./node-header";
import { BaseNode } from "./base-node";
import type { ChangeEvent } from "react";
import type { CommentNodeProps } from "@/lib/flowUtils";

const CommentNode = memo(({ selected, data, id }: CommentNodeProps) => {
  const { updateNodeData } = useReactFlow();
  const [isCollapsed, setIsCollapsed] = useState(data.collapsed || false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCollapseToggle = useCallback(() => {
    setIsCollapsed((prev) => !prev);
    updateNodeData(id, { collapsed: !isCollapsed });
  }, [id, isCollapsed, updateNodeData]);

  const handleCommentChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { content: e.target.value });
    },
    [id, updateNodeData],
  );

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useLayoutEffect(() => {
    if (!isCollapsed) {
      autoResize();
    }
  }, [data.content, isCollapsed, autoResize]);

  return (
    <BaseNode
      selected={selected}
      className={`p-0 ${isCollapsed ? "w-max" : "min-w-40"}`}
    >
      <NodeHeader
        className={`border-b bg-gray-500 text-white rounded-t-[6px] ${
          isCollapsed ? "w-max rounded-b-[6px]" : ""
        }`}
      >
        <NodeHeaderIcon
          onClick={handleCollapseToggle}
          className="hover:scale-105 active:scale-95 cursor-pointer"
        >
          <StickyNote className="text-white" />
        </NodeHeaderIcon>
      </NodeHeader>

      {!isCollapsed && (
        <div className="h-full flex flex-col nodrag">
          <textarea
            ref={textareaRef}
            value={data.content || ""}
            onChange={handleCommentChange}
            placeholder="Add a comment..."
            rows={1}
            className="w-full min-h-[80px] h-auto p-2 text-sm border border-gray-300 rounded-b resize-none focus:outline-none focus:ring-gray-400 overflow-hidden block"
          />
        </div>
      )}
    </BaseNode>
  );
});

CommentNode.displayName = "CommentNode";

export default CommentNode;