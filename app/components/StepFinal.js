"use client";

import React from "react";
import { CALL_TIMES, LOAN_REASONS, CREDIT_RATINGS } from "../lib/constants";
import { SelectField, ToggleField } from "./FormFields";

export default function StepFinal({ data, errors, onChange }) {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">Additional Information</h2>
        <p className="mt-1 text-sm text-gray-500">Almost there! Just a few more details.</p>
      </div>

      <ToggleField
        label="Best Time to Call"
        name="best_time_to_call"
        value={data.best_time_to_call}
        onChange={onChange}
        options={CALL_TIMES}
        error={errors.best_time_to_call}
        columns={2}
      />

      <SelectField label="Reason for Loan" name="loan_reason" value={data.loan_reason} onChange={onChange} options={LOAN_REASONS} error={errors.loan_reason} placeholder="Select reason" required={true} />

      <SelectField label="Credit Rating" name="approximate_credit_score" value={data.approximate_credit_score} onChange={onChange} options={CREDIT_RATINGS} error={errors.approximate_credit_score} placeholder="Select credit rating" required={true} />

      <ToggleField
        label="Do you own a car?"
        name="own_car"
        value={data.own_car}
        onChange={onChange}
        options={[{ value: "Yes", label: "Yes" }, { value: "No", label: "No" }]}
        error={errors.own_car}
      />

      <ToggleField
        label="Are you active Military?"
        name="military_active"
        value={data.military_active}
        onChange={onChange}
        options={[{ value: "1", label: "Yes" }, { value: "0", label: "No" }]}
        error={errors.military_active}
      />

      <div className="rounded-xl border border-green-100 bg-green-50/60 px-4 py-3 text-sm text-green-800">
        <span className="font-semibold">Almost done!</span> By clicking Submit, you agree to our terms and authorize lenders to contact you regarding your loan request.
      </div>
    </div>
  );
}