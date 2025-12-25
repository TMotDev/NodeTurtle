import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus } from "lucide-react";
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface MathInputBoxProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  suggestions?: Array<number>; // New prop for suggestions
}

const MathInputBox: React.FC<MathInputBoxProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = "0",
  className = "",
  suggestions = [] // Default to empty if not provided
}) => {
  const [displayValue, setDisplayValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const [isSubtraction, setIsSubtraction] = useState(false); // Track +/- mode
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const evaluateMath = useCallback((expression: string): number => {
    try {
      const cleanExpression = expression.replace(/\s/g, '');

      if (!/^[0-9+\-*/.()]+$/.test(cleanExpression)) {
        return value;
      }

      const result = Function(`"use strict"; return (${cleanExpression})`)();

      if (!isFinite(result) || isNaN(result)) {
        return value;
      }

      return Math.round(result);
    } catch {
      return value;
    }
  }, [value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (displayValue === "0") {
      setDisplayValue("");
    }
  }, [displayValue]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Reset toggle state on blur if desired, or keep it persistent
    setIsSubtraction(false);

    if (displayValue === "") {
      setDisplayValue("0");
      onChange(0);
      return;
    }

    const result = evaluateMath(displayValue);
    setDisplayValue(result.toString());
    onChange(result);
  }, [displayValue, evaluateMath, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newValue = value + 1;
      setDisplayValue(newValue.toString());
      onChange(newValue);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newValue = value - 1;
      setDisplayValue(newValue.toString());
      onChange(newValue);
    }
  }, [value, onChange]);

  // Handle clicking a suggestion number
  const handleSuggestionClick = (amount: number) => {
    // 1. Evaluate current display value to get a clean number base
    // If empty, treat as 0
    const currentBase = displayValue === "" ? 0 : evaluateMath(displayValue);

    // 2. Calculate new value based on mode
    const modifier = isSubtraction ? -amount : amount;
    const newValue = currentBase + modifier;

    // 3. Update state and parent
    setDisplayValue(newValue.toString());
    onChange(newValue);

    // Keep focus on input for rapid clicking
    inputRef.current?.focus();
  };

  // Toggle between adding and subtracting
  const toggleOperation = () => {
    setIsSubtraction(prev => !prev);
    inputRef.current?.focus();
  };

  return (
    <div className="relative space-y-1">
      <Label
        htmlFor={id}
        className="text-sm font-medium select-none w-max"
      >
        {label}
      </Label>

      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`text-center font-mono nodrag relative z-20 ${className}`}
          placeholder={placeholder}
          autoComplete="off"
        />

        {/* Suggestion Box */}
        {isFocused && suggestions.length > 0 && (
          <div
            className="absolute top-full left-0 mt-2 w-full z-30 p-1.5 bg-popover border rounded-md shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100"
            // Prevent blur when clicking inside the tooltip
            onMouseDown={(e) => e.preventDefault()}
          >
            <Button
              type="button"
              onClick={(e) => {toggleOperation()}}
              className={`
                flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border transition-colors
                hover:bg-accent hover:text-accent-foreground
                ${isSubtraction ? 'bg-red-100 border-red-200 text-red-600' : 'bg-green-100 border-green-200 text-green-600'}
              `}
              title={isSubtraction ? "Switch to Add" : "Switch to Subtract"}
            >
              {isSubtraction ? <Minus size={14} /> : <Plus size={14} />}
            </Button>

            <div className="h-4 w-px bg-border shrink-0" />

            <div className="flex flex-wrap gap-1 flex-1 justify-end">
              {suggestions.map((num) => (
                <Button
                  key={num}
                  type="button"
                  onClick={() => handleSuggestionClick(num)}
                  className="h-7 min-w-[28px] px-1.5 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-sm transition-colors border border-transparent hover:border-input"
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MathInputBox;