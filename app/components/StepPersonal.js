"use client";

import React from "react";
import { InputField, DateField } from "./FormFields";


// SVG icon helpers
const UserIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const MailIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const PhoneIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

export default function StepPersonal({ data, errors, onChange }) {
  const handlePhoneChange = (name, raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    let formatted = digits;
    if (digits.length > 6)
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    else if (digits.length > 3)
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    else if (digits.length > 0)
      formatted = `(${digits}`;
    onChange(name, formatted);
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">Personal Information</h2>
        <p className="mt-1 text-sm text-gray-500">Tell us a bit about yourself to get started.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField label="First Name" name="first_name" value={data.first_name} onChange={onChange} error={errors.first_name} placeholder="John" maxLength={35} icon={<UserIcon />} />
        <InputField label="Last Name" name="last_name" value={data.last_name} onChange={onChange} error={errors.last_name} placeholder="Doe" maxLength={35} icon={<UserIcon />} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField label="Email Address" name="email" value={data.email} onChange={onChange} error={errors.email} type="email" placeholder="john.doe@example.com" icon={<MailIcon />} />
        <InputField label="Phone Number" name="mobile_phone" value={data.mobile_phone} onChange={handlePhoneChange} error={errors.mobile_phone} placeholder="(212) 456-7890" icon={<PhoneIcon />} />
      </div>

      <DateField
        label="Date of Birth"
        name="date_birth"
        value={data.date_birth}
        onChange={onChange}
        error={errors.date_birth}
        placeholder="Select your date of birth"
        maxDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
        minDate={new Date("1930-01-01")}
      />
    </div>
  );
}
