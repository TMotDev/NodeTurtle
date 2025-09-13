import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';

interface MathInputBoxProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
}

const MathInputBox: React.FC<MathInputBoxProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = "0",
  className = ""
}) => {
  const [displayValue, setDisplayValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
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

  return (
    <div className="space-y-1">
      <Label
        htmlFor={id}
        className="text-sm font-medium select-none w-max"
      >
        {label}
      </Label>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`text-center font-mono nodrag ${className}`}
        placeholder={placeholder}
      />
    </div>
  );
};

export default MathInputBox;