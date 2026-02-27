"use client";

import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// ── Error message ──────────────────────────────────────────
function ErrorMsg({ message }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs font-medium text-red-500">
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  );
}

// ── Text / Number Input ────────────────────────────────────
export function InputField({
  label, name, value, onChange, error,
  type = "text", placeholder, helpText, icon, maxLength, required = true,
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`input-focus-ring w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400
            ${icon ? "pl-10" : ""}
            ${error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-gray-300"}
          `}
        />
      </div>
      {helpText && !error && <p className="text-xs text-gray-500">{helpText}</p>}
      <ErrorMsg message={error} />
    </div>
  );
}

// ── Select Dropdown ────────────────────────────────────────
export function SelectField({
  label, name, value, onChange, options, error,
  placeholder = "Select...", required = true,
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className={`input-focus-ring w-full appearance-none rounded-xl border bg-white px-4 py-3 text-sm text-gray-900
          ${!value ? "text-gray-400" : ""}
          ${error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-gray-300"}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: "right 0.75rem center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "1.25rem 1.25rem",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ErrorMsg message={error} />
    </div>
  );
}

// ── Toggle / Radio Buttons ─────────────────────────────────
export function ToggleField({
  label, name, value, onChange, options, error,
  required = true, columns = 2,
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(name, opt.value)}
            className={`toggle-option ${value === opt.value ? "active" : ""}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <ErrorMsg message={error} />
    </div>
  );
}

// ── Date Picker ────────────────────────────────────────────
export function DateField({
  label, name, value, onChange, error,
  placeholder = "Select date", minDate, maxDate,
  showYearDropdown = true, showMonthDropdown = true,
  required = true, helpText,
}) {
  const selected = value ? new Date(value + "T00:00:00") : null;

  const handleChange = (date) => {
    if (date) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      onChange(name, `${yyyy}-${mm}-${dd}`);
    } else {
      onChange(name, "");
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 z-10">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <DatePicker
          selected={selected}
          onChange={handleChange}
          dateFormat="MM/dd/yyyy"
          placeholderText={placeholder}
          minDate={minDate}
          maxDate={maxDate}
          showYearDropdown={showYearDropdown}
          showMonthDropdown={showMonthDropdown}
          dropdownMode="select"
          className={`input-focus-ring w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400
            ${error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-gray-300"}
          `}
          wrapperClassName="w-full"
          autoComplete="off"
        />
      </div>
      {helpText && !error && <p className="text-xs text-gray-500">{helpText}</p>}
      <ErrorMsg message={error} />
    </div>
  );
}
