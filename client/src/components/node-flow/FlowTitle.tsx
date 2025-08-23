import { useState } from "react";
import { Input } from "@/components/ui/input";

interface FlowTitleEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
}

export const FlowTitle = ({
  title,
  onTitleChange,
}: FlowTitleEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(title);
  };

  const handleSubmit = () => {
    onTitleChange(editValue.trim() || "Untitled Flow");
    setEditValue(editValue.trim())
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      handleCancel()
    }
  };

  function handleCancel(){
    setEditValue(title);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleCancel}
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
    </div>
  );
};
