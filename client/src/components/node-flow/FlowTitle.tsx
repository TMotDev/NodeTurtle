import { useState } from "react";
import { Input } from "@/components/ui/input";

interface FlowTitleEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
  hasUnsavedChanges: boolean;
}

export const FlowTitle = ({
  title,
  onTitleChange,
  hasUnsavedChanges,
}: FlowTitleEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(title);
  };

  const handleSubmit = () => {
    onTitleChange(editValue.trim() || "Untitled Flow");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setEditValue(title);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        className="w-64 h-8 text-lg font-medium"
        autoFocus
      />
    );
  }

  return (
    <div
      className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit title"
    >
      <span className="text-lg font-medium">{title}</span>
      {hasUnsavedChanges && (
        <span
          className="w-2 h-2 bg-orange-500 rounded-full"
          title="Unsaved changes"
        />
      )}
    </div>
  );
};
