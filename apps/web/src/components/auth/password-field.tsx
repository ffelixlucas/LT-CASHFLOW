"use client";

import { useState } from "react";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  autoComplete?: string;
  inputClassName?: string;
};

export function PasswordField({
  id,
  name,
  label,
  placeholder,
  minLength,
  required,
  autoComplete = "current-password",
  inputClassName = "",
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>

      <div className="relative">
        <input
          autoComplete={autoComplete}
          className={`w-full rounded-2xl border border-line bg-background px-4 py-3 pr-12 outline-none ${inputClassName}`}
          id={id}
          name={name}
          placeholder={placeholder}
          type={visible ? "text" : "password"}
          minLength={minLength}
          required={required}
        />
        <button
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted transition-colors hover:text-foreground"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? (
            <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
              <path
                d="M3 3l18 18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <path
                d="M10.58 10.58a2 2 0 102.83 2.83"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <path
                d="M9.88 5.08A9.94 9.94 0 0112 5c5 0 8.5 4 9.5 7-0.54 1.61-1.57 3.28-3.02 4.65"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <path
                d="M6.11 6.11C3.98 7.52 2.48 9.82 2.5 12c1 3 4.5 7 9.5 7 1.1 0 2.15-.16 3.14-.46"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          ) : (
            <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
              <path
                d="M2.5 12S5.5 5 12 5s9.5 7 9.5 7-3 7-9.5 7S2.5 12 2.5 12Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
