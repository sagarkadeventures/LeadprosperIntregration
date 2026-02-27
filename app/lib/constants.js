// ============================================================
// Form field options & constants
// ============================================================

export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

// ── Income Source ─────────────────────────────────────────────
// Values match Xanadu IncomeType: Employed, SelfEmployed, Benefits, Unemployment, None
export const INCOME_SOURCES = [
  { value: "Employed", label: "Full Time Employed" },
  { value: "Employed_PT", label: "Part Time Employed" },
  { value: "SelfEmployed", label: "Self Employed" },
  { value: "Benefits", label: "Disability / Benefits" },
  { value: "Unemployment", label: "Unemployment" },
  { value: "None", label: "No Income" },
];

// ── Pay Frequency ─────────────────────────────────────────────
// Values match Xanadu PayFrequency: Weekly, BiWeekly, TwiceMonthly, Monthly
export const PAY_FREQUENCIES = [
  { value: "Weekly", label: "Weekly" },
  { value: "BiWeekly", label: "Every Other Week (Bi-Weekly)" },
  { value: "TwiceMonthly", label: "Twice a Month (Semi-Monthly)" },
  { value: "Monthly", label: "Monthly" },
];

// ── Credit Rating ─────────────────────────────────────────────
// Values match Xanadu CreditRating: Excellent, Good, Fair, Poor
export const CREDIT_RATINGS = [
  { value: "Excellent", label: "Excellent (750+)" },
  { value: "Good", label: "Good (700-749)" },
  { value: "Fair", label: "Fair (650-699)" },
  { value: "Poor", label: "Poor (Below 650)" },
];

// ── Loan Reason ───────────────────────────────────────────────
// Values match Xanadu Loan_Reason accepted values
export const LOAN_REASONS = [
  { value: "DebtConsolidation", label: "Debt Consolidation" },
  { value: "CreditCard", label: "Credit Card Payoff" },
  { value: "HomeImprovement", label: "Home Improvement" },
  { value: "MajorPurchase", label: "Major Purchase" },
  { value: "Car", label: "Car / Auto Repair" },
  { value: "Medical", label: "Medical" },
  { value: "Relocation", label: "Moving / Relocation" },
  { value: "Vacation", label: "Vacation" },
  { value: "Wedding", label: "Wedding" },
  { value: "Business", label: "Business" },
  { value: "GreenLoan", label: "Green Loan / Energy" },
  { value: "Household", label: "Household Expenses" },
  { value: "Other", label: "Other" },
];

export const YEARS_AT_ADDRESS = [
  { value: "0", label: "Less than 1 year" },
  { value: "1", label: "1 year" },
  { value: "2", label: "2 years" },
  { value: "3", label: "3 years" },
  { value: "4", label: "4 years" },
  { value: "5", label: "5 years" },
  { value: "6", label: "6 years" },
  { value: "7", label: "7 years" },
  { value: "8", label: "8 years" },
  { value: "9", label: "9 years" },
  { value: "10", label: "10+ years" },
];

export const MONTHS_AT_BANK = [
  { value: "6", label: "Less than 6 months" },
  { value: "12", label: "6–12 months" },
  { value: "24", label: "1–2 years" },
  { value: "36", label: "2–3 years" },
  { value: "60", label: "3–5 years" },
  { value: "120", label: "5+ years" },
];

// ── NEW: Months at Employer (Xanadu: MonthsAtEmployer) ────────
export const MONTHS_AT_EMPLOYER = [
  { value: "3", label: "Less than 3 months" },
  { value: "6", label: "3–6 months" },
  { value: "12", label: "6–12 months" },
  { value: "24", label: "1–2 years" },
  { value: "36", label: "2–3 years" },
  { value: "60", label: "3–5 years" },
  { value: "120", label: "5+ years" },
];

export const CALL_TIMES = [
  { value: "Anytime", label: "Anytime" },
  { value: "Morning", label: "Morning (8am-12pm)" },
  { value: "Afternoon", label: "Afternoon (12pm-5pm)" },
  { value: "Evening", label: "Evening (5pm-9pm)" },
];

export const STEP_LABELS = ["Personal", "Address", "Financial", "Banking", "Final"];

export const INITIAL_FORM_DATA = {
  // Step 1 – Personal
  first_name: "",
  last_name: "",
  email: "",
  mobile_phone: "",
  date_birth: "",

  // Step 2 – Address
  street: "",
  city: "",
  state: "",
  post_code: "",
  years_at_address: "",
  residence_type: "",

  // Step 3 – Financial
  loan_amount: "",
  social_security_number: "",
  income_source: "",
  monthly_income: "",
  income_payment_type: "",
  company_name: "",
  job_title: "",
  work_phone: "",
  months_at_employer: "",       // NEW – replaces employment_started
  next_pay_date: "",
  second_pay_date: "",
  pay_frequency: "",

  // Step 4 – Banking
  bank_name: "",
  bank_aba: "",
  bank_account_number: "",
  bank_type: "",
  months_at_bank: "",
  has_debit_card: "",
  driver_license_number: "",
  license_state: "",

  // Step 5 – Final
  best_time_to_call: "",
  loan_reason: "",
  approximate_credit_score: "",
  own_car: "",
  military_active: "",
};