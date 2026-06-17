"use client";

import { Label } from "@heroui/react";

interface FormSelectProps {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  placeholder?: string;
  required?: boolean;
}

export function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  placeholder = "— Select —",
  required,
}: FormSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <Label className="text-sm text-slate-600 dark:text-slate-300">
          {label}
        </Label>
      ) : null}
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="acdm-input"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FormCheckboxProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function FormCheckbox({
  label,
  name,
  checked,
  onChange,
}: FormCheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-600 dark:border-slate-600 dark:bg-slate-900"
      />
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
    </label>
  );
}

interface FormTextareaProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  disabled?: boolean;
}

export function FormTextarea({
  label,
  name,
  value,
  onChange,
  rows = 3,
  disabled,
}: FormTextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm text-slate-600 dark:text-slate-300">
        {label}
      </Label>
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        className="acdm-input resize-y disabled:opacity-50"
      />
    </div>
  );
}
