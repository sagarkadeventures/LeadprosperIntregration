"use client";

import React from "react";
import { US_STATES, MONTHS_AT_BANK } from "../lib/constants";
import { InputField, SelectField, ToggleField } from "./FormFields";

const BankIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const IdIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
  </svg>
);

export default function StepBanking({ data, errors, onChange }) {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">Banking &amp; Identity Information</h2>
        <p className="mt-1 text-sm text-gray-500">Banking info is required to transfer funds and verify your identity.</p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-700">
        <span className="font-semibold">Why do we need this?</span> Banking information is required to transfer funds and verify your identity.
      </div>

      <InputField label="Bank Name" name="bank_name" value={data.bank_name} onChange={onChange} error={errors.bank_name} placeholder="Bank of America" icon={<BankIcon />} />

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField label="Bank Routing Number (ABA)" name="bank_aba" value={data.bank_aba} onChange={(n, v) => onChange(n, v.replace(/\D/g, "").slice(0, 9))} error={errors.bank_aba} placeholder="123456789" helpText="9-digit routing number on your check" maxLength={9} />
        <InputField label="Account Number" name="bank_account_number" value={data.bank_account_number} onChange={(n, v) => onChange(n, v.replace(/\D/g, "").slice(0, 25))} error={errors.bank_account_number} placeholder="1234567890" helpText="Account number on your check" maxLength={25} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Account Type" name="bank_type" value={data.bank_type} onChange={onChange} options={[{ value: "Checking", label: "Checking" }, { value: "Savings", label: "Savings" }]} error={errors.bank_type} placeholder="Select type" />
        <SelectField label="Months at Bank" name="months_at_bank" value={data.months_at_bank} onChange={onChange} options={MONTHS_AT_BANK} error={errors.months_at_bank} placeholder="Select months" />
      </div>

      <ToggleField label="Do you have a Debit Card?" name="has_debit_card" value={data.has_debit_card} onChange={onChange} options={[{ value: "Yes", label: "Yes" }, { value: "No", label: "No" }]} error={errors.has_debit_card} />

      <hr className="border-gray-200" />

      <h3 className="font-display text-lg font-bold text-gray-900">Driver&apos;s License Information</h3>

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField label="Driver's License Number" name="driver_license_number" value={data.driver_license_number} onChange={onChange} error={errors.driver_license_number} placeholder="D1234567" maxLength={25} icon={<IdIcon />} />
        <SelectField label="License State" name="license_state" value={data.license_state} onChange={onChange} options={US_STATES} error={errors.license_state} placeholder="Select state" />
      </div>
    </div>
  );
}
