import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuggestionBoxProps {
  suggestions: Array<number>;
  isSubtraction: boolean;
  onToggleOperation: () => void;
  onSuggestionClick: (amount: number) => void;
}

export default function SuggestionBox({
  suggestions,
  isSubtraction,
  onToggleOperation,
  onSuggestionClick,
}: SuggestionBoxProps) {
  return (
    <div
      className="nodrag w-full absolute top-full left-0 mt-2 z-30 p-1.5 bg-popover border rounded-md shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100"
      onMouseDown={(e) => e.preventDefault()}
      onMouseUp={(e) => e.preventDefault()}
      onClick={(e) => e.preventDefault()}
    >
      <Button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onToggleOperation();
        }}
        className={`
          flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border transition-colors
          hover:bg-accent active:scale-95 bg-secondary
          ${isSubtraction ? "text-red-600" : " text-green-600"}
        `}
        title={isSubtraction ? "Switch to Add" : "Switch to Subtract"}
      >
        {isSubtraction ? <Minus size={14} /> : <Plus size={14} />}
      </Button>

      <div className="h-4 w-px bg-border shrink-0" />

      <div className="flex gap-1 w-full">
        {suggestions.map((num) => (
          <Button
            key={num}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onSuggestionClick(num);
            }}
            className="group ease-in-out h-7 min-w-[28px] px-1.5 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-sm border border-transparent hover:border-input"
          >
            <span className="duration-100 group-active:-translate-y-0.5">{num}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
