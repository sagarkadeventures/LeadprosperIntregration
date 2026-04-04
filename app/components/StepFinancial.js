"use client";

import React from "react";
import { INCOME_SOURCES, PAY_FREQUENCIES, MONTHS_AT_EMPLOYER } from "../../lib/constants";
import { InputField, SelectField, ToggleField, DateField } from "./FormFields";

const LockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const PhoneIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);
const DollarIcon = () => <span className="text-sm font-semibold text-gray-500">$</span>;

export default function StepFinancial({ data, errors, onChange }) {
  const handleCurrency = (name, raw) => {
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) { onChange(name, ""); return; }
    onChange(name, parseInt(digits, 10).toLocaleString("en-US"));
  };

  const handleSSN = (name, raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 9);
    let f = digits;
    if (digits.length > 5) f = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    else if (digits.length > 3) f = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    onChange(name, f);
  };

  const handlePhone = (name, raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    let f = digits;
    if (digits.length > 6) f = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    else if (digits.length > 3) f = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    else if (digits.length > 0) f = `(${digits}`;
    onChange(name, f);
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">Financial &amp; Employment Information</h2>
        <p className="mt-1 text-sm text-gray-500">Help us understand your financial situation.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField label="Requested Loan Amount" name="loan_amount" value={data.loan_amount} onChange={handleCurrency} error={errors.loan_amount} placeholder="1,000" helpText="Amount must be between $100 and $50,000" icon={<DollarIcon />} />
        <InputField label="Social Security Number" name="social_security_number" value={data.social_security_number} onChange={handleSSN} error={errors.social_security_number} placeholder="123-45-6789" helpText="🔒 Your SSN is encrypted and secure" icon={<LockIcon />} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Income Source" name="income_source" value={data.income_source} onChange={onChange} options={INCOME_SOURCES} error={errors.income_source} placeholder="Select income source" />
        <InputField label="Monthly Net Income" name="monthly_income" value={data.monthly_income} onChange={handleCurrency} error={errors.monthly_income} placeholder="2,500" icon={<DollarIcon />} />
      </div>

      <ToggleField
        label="Direct Deposit"
        name="income_payment_type"
        value={data.income_payment_type}
        onChange={onChange}
        options={[
          { value: "Direct Deposit", label: "Yes" },
          { value: "Check", label: "No" },
        ]}
        error={errors.income_payment_type}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField label="Employer / Company Name" name="company_name" value={data.company_name} onChange={onChange} error={errors.company_name} placeholder="ABC Company" maxLength={128} />
        <InputField label="Job Title" name="job_title" value={data.job_title} onChange={onChange} error={errors.job_title} placeholder="Software Engineer" maxLength={128} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField label="Work Phone" name="work_phone" value={data.work_phone} onChange={handlePhone} error={errors.work_phone} placeholder="(212) 456-7890" icon={<PhoneIcon />} />
        <SelectField label="Time at Current Employer" name="months_at_employer" value={data.months_at_employer} onChange={onChange} options={MONTHS_AT_EMPLOYER} error={errors.months_at_employer} placeholder="Select duration" />
      </div>

      <SelectField label="Pay Frequency" name="pay_frequency" value={data.pay_frequency} onChange={onChange} options={PAY_FREQUENCIES} error={errors.pay_frequency} placeholder="Select pay frequency" />

      <div className="grid gap-5 sm:grid-cols-2">
        <DateField label="Next Pay Date" name="next_pay_date" value={data.next_pay_date} onChange={onChange} error={errors.next_pay_date} placeholder="Select next pay date" minDate={tomorrow} showYearDropdown={false} />
        <DateField label="Second Pay Date" name="second_pay_date" value={data.second_pay_date} onChange={onChange} error={errors.second_pay_date} placeholder="Select second pay date" minDate={tomorrow} showYearDropdown={false} />
      </div>
    </div>
  );
}