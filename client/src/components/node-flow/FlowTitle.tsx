import { useState } from "react";
import { Input } from "@/components/ui/input";

interface FlowTitleEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
  editable?: boolean;
}

export const FlowTitle = ({ title, onTitleChange, editable = false }: FlowTitleEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(title);
  };

  const handleSubmit = () => {
    onTitleChange(editValue.trim() || "Untitled Flow");
    setEditValue(editValue.trim());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  function handleCancel() {
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
        className="h-8 text-xl font-medium w-full"
        autoFocus
      />
    );
  }

  return (
    <div
      className={`flex w-full items-center gap-2 font-bold text-xl ${editable && "hover:bg-gray-100 cursor-pointer"} px-2 py-1 rounded`}
      onDoubleClick={() => {editable && handleDoubleClick()}}
      title={editable ? `Double-click to edit title` : ''}
    >
      <span>{title}</span>
    </div>
  );
};
