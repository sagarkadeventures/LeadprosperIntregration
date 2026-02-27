"use client";

import React from "react";
import { US_STATES, YEARS_AT_ADDRESS } from "../lib/constants";
import { InputField, SelectField, ToggleField } from "./FormFields";

const PinIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function StepAddress({ data, errors, onChange }) {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">Address Information</h2>
        <p className="mt-1 text-sm text-gray-500">Where do you currently live?</p>
      </div>

      <InputField label="Street Address" name="street" value={data.street} onChange={onChange} error={errors.street} placeholder="123 Main Street" maxLength={35} icon={<PinIcon />} />

      <div className="grid gap-5 sm:grid-cols-3">
        <InputField label="City" name="city" value={data.city} onChange={onChange} error={errors.city} placeholder="New York" maxLength={35} />
        <SelectField label="State" name="state" value={data.state} onChange={onChange} options={US_STATES} error={errors.state} placeholder="Select state" />
        <InputField label="ZIP Code" name="post_code" value={data.post_code} onChange={onChange} error={errors.post_code} placeholder="10001" maxLength={5} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Years at Current Address" name="years_at_address" value={data.years_at_address} onChange={onChange} options={YEARS_AT_ADDRESS} error={errors.years_at_address} placeholder="Select years" />
        <ToggleField
          label="Do you Rent or Own?"
          name="residence_type"
          value={data.residence_type}
          onChange={onChange}
          options={[
            { value: "Renting", label: "Rent" },
            { value: "Home Owner", label: "Own" },
          ]}
          error={errors.residence_type}
        />
      </div>
    </div>
  );
}
