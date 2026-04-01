"use client";

import { useState } from "react";

import { applyDateMask, formatDateForDisplay, normalizeDateInput } from "@/lib/date";

type DateInputProps = {
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

export function DateInput({
  name,
  defaultValue,
  value,
  onValueChange,
  className,
  placeholder = "dd/mm/aaaa",
  required = false,
  disabled = false,
}: DateInputProps) {
  const [internalValue, setInternalValue] = useState(formatDateForDisplay(defaultValue));

  const displayedValue = value ?? internalValue;

  return (
    <input
      className={className}
      disabled={disabled}
      inputMode="numeric"
      maxLength={10}
      name={name}
      onBlur={(event) => {
        const normalized = normalizeDateInput(event.currentTarget.value);

        if (event.currentTarget.value && !normalized) {
          event.currentTarget.setCustomValidity("Use o formato dd/mm/aaaa.");
          return;
        }

        event.currentTarget.setCustomValidity("");
      }}
      onChange={(event) => {
        const maskedValue = applyDateMask(event.currentTarget.value);

        if (value === undefined) {
          setInternalValue(maskedValue);
        }

        onValueChange?.(maskedValue);
      }}
      pattern="\d{2}/\d{2}/\d{4}"
      placeholder={placeholder}
      required={required}
      type="text"
      value={displayedValue}
    />
  );
}
