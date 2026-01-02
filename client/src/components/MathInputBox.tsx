import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import SuggestionBox from "./SuggestionBox";

interface MathInputBoxProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  suggestions?: Array<number>;
  min?: number; // Added min prop
}

export default function MathInputBox({
  id,
  label,
  value,
  onChange,
  placeholder = "0",
  className = "",
  suggestions = [],
  min = -Infinity,
}: MathInputBoxProps) {
  const [displayValue, setDisplayValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const [isSubtraction, setIsSubtraction] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value.toString());
    }
  }, [value, isFocused]);

  const clamp = useCallback((val: number) => Math.max(min, val), [min]);

  const evaluateMath = useCallback(
    (expression: string): number => {
      try {
        const cleanExpression = expression.replace(/\s/g, "");

        if (!/^[0-9+\-*/.()]+$/.test(cleanExpression)) {
          return value;
        }

        const result = Function(`"use strict"; return (${cleanExpression})`)();

        if (!isFinite(result) || isNaN(result)) {
          return value;
        }

        // Apply Math.round and the clamp constraint
        return clamp(Math.round(result));
      } catch {
        return value;
      }
    },
    [value, clamp],
  );

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
    setIsSubtraction(false);

    if (displayValue === "") {
      const defaultValue = clamp(0);
      setDisplayValue(defaultValue.toString());
      onChange(defaultValue);
      return;
    }

    const result = evaluateMath(displayValue);
    setDisplayValue(result.toString());
    onChange(result);
  }, [displayValue, evaluateMath, onChange, clamp]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        inputRef.current?.blur();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const newValue = clamp(value + 1);
        setDisplayValue(newValue.toString());
        onChange(newValue);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const newValue = clamp(value - 1);
        setDisplayValue(newValue.toString());
        onChange(newValue);
      }
    },
    [value, onChange, clamp],
  );

  const handleSuggestionClick = useCallback(
    (amount: number) => {
      const currentBase = displayValue === "" ? 0 : evaluateMath(displayValue);
      const modifier = isSubtraction ? -amount : amount;
      const newValue = clamp(currentBase + modifier);

      setDisplayValue(newValue.toString());
      onChange(newValue);
    },
    [displayValue, isSubtraction, evaluateMath, onChange, clamp],
  );

  const toggleOperation = useCallback(() => {
    setIsSubtraction((prev) => !prev);
  }, []);

  return (
    <div className="relative space-y-1">
      <Label htmlFor={id} className="text-sm font-medium select-none w-max">
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
        {isFocused && suggestions.length > 0 && (
          <SuggestionBox
            suggestions={suggestions}
            isSubtraction={isSubtraction}
            onToggleOperation={toggleOperation}
            onSuggestionClick={handleSuggestionClick}
          />
        )}
      </div>
    </div>
  );
}