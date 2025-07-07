import React, { useCallback, useEffect, useRef } from "react";
import { Copy, Package, Trash2 } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { Button } from "../ui/button";

interface ContextMenuProps {
  data: {
    id?: string;
    top: number;
    left: number;
  };
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCombine?: () => void;
  onExplode?: (nodeId: string) => void;
  isMultiSelection?: boolean;
}

export function ContextMenu({
  data,
  onClose,
  onDuplicate,
  onDelete,
  onCombine,
  onExplode,
  isMultiSelection = false,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { getNodes } = useReactFlow();

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const handleDuplicate = useCallback(() => {
    onDuplicate();
    onClose();
  }, [onDuplicate, onClose]);

  const handleDelete = useCallback(() => {
    onDelete();
    onClose();
  }, [onDelete, onClose]);

  const handleCombine = useCallback(() => {
    if (onCombine) {
      onCombine();
      onClose();
    }
  }, [onCombine, onClose]);

  const handleExplode = useCallback(() => {
    if (onExplode && data.id) {
      onExplode(data.id);
      onClose();
    }
  }, [onExplode, data.id, onClose]);

  const isMultiNode = data.id && getNodes().find((n) => n.id === data.id)?.type === "multiNode";

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-32"
      style={{
        top: data.top,
        left: data.left,
      }}
    >
      <Button
        variant="ghost"
        onClick={handleDuplicate}
        className="w-full justify-start px-3 py-1 h-8"
      >
        <Copy className="h-3 w-3 mr-2" />
        Duplicate
      </Button>

      {isMultiSelection && onCombine && (
        <Button
          variant="ghost"
          onClick={handleCombine}
          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex justify-start items-center gap-2"
        >
          <Package size={14} />
          Combine into MultiNode
        </Button>
      )}

      {isMultiNode && onExplode && (
        <Button
          variant="ghost"
          onClick={handleExplode}
          className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex justify-start items-center gap-2"
        >
          <Package size={14} />
          Explode MultiNode
        </Button>
      )}

      <hr className="my-1 border-gray-200" />

      <Button
        variant="ghost"
        onClick={handleDelete}
        className="w-full justify-start px-3 py-1 h-8 text-red-600 hover:text-red-700"
      >
        <Trash2 className="h-3 w-3 mr-2" />
        Delete
      </Button>
    </div>
  );
}
