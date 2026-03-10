// ─── Step 1 – Personal ─────────────────────────────────────
export function validateStep1(data) {
  const errors = {};

  if (!data.first_name || data.first_name.trim().length < 3)
    errors.first_name = "First name must be at least 3 characters";
  if (data.first_name && data.first_name.trim().length > 35)
    errors.first_name = "First name cannot exceed 35 characters";

  if (!data.last_name || data.last_name.trim().length < 3)
    errors.last_name = "Last name must be at least 3 characters";
  if (data.last_name && data.last_name.trim().length > 35)
    errors.last_name = "Last name cannot exceed 35 characters";

  if (!data.email) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.email = "Please enter a valid email address";

  // Phone: must be 10 digits AND start with 2-9 (US numbers never start with 0 or 1)
  const phone = (data.mobile_phone || "").replace(/\D/g, "");
  if (!phone) errors.mobile_phone = "Phone number is required";
  else if (phone.length !== 10)
    errors.mobile_phone = "Phone must be exactly 10 digits";
  else if (/^[01]/.test(phone))
    errors.mobile_phone = "US phone numbers cannot start with 0 or 1";

  if (!data.date_birth) errors.date_birth = "Date of birth is required";
  else {
    const dob = new Date(data.date_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (age < 18) errors.date_birth = "You must be at least 18 years old";
    if (age > 100) errors.date_birth = "Please enter a valid date of birth";
  }

  return errors;
}

// ─── Step 2 – Address ───────────────────────────────────────
export function validateStep2(data) {
  const errors = {};

  if (!data.street || data.street.trim().length < 3)
    errors.street = "Street address must be at least 3 characters";

  if (!data.city || data.city.trim().length < 3)
    errors.city = "City must be at least 3 characters";

  if (!data.state) errors.state = "Please select a state";

  if (!data.post_code) errors.post_code = "ZIP code is required";
  else if (!/^\d{5}(-\d{4})?$/.test(data.post_code))
    errors.post_code = "Enter a valid 5-digit ZIP code";

  if (!data.years_at_address)
    errors.years_at_address = "Please select years at current address";

  if (!data.residence_type)
    errors.residence_type = "Please select rent or own";

  return errors;
}

// ─── Step 3 – Financial ─────────────────────────────────────
export function validateStep3(data) {
  const errors = {};

  const amt = parseFloat((data.loan_amount || "").replace(/,/g, ""));
  if (!data.loan_amount || isNaN(amt))
    errors.loan_amount = "Loan amount is required";
  else if (amt < 100 || amt > 50000)
    errors.loan_amount = "Amount must be between $100 and $50,000";

  const ssn = (data.social_security_number || "").replace(/\D/g, "");
  if (!ssn) errors.social_security_number = "SSN is required";
  else if (ssn.length !== 9)
    errors.social_security_number = "SSN must be exactly 9 digits";

  if (!data.income_source)
    errors.income_source = "Please select an income source";

  if (!data.monthly_income)
    errors.monthly_income = "Monthly income is required";
  else if (parseFloat((data.monthly_income || "").replace(/,/g, "")) <= 0)
    errors.monthly_income = "Please enter a valid income amount";

  if (!data.income_payment_type)
    errors.income_payment_type = "Please select a payment type";

  if (!data.company_name)
    errors.company_name = "Employer / company name is required";

  if (!data.job_title) errors.job_title = "Job title is required";

  // Work phone: 10-11 digits, must start with 2-9
  const wp = (data.work_phone || "").replace(/\D/g, "");
  if (!wp) errors.work_phone = "Work phone is required";
  else if (wp.length < 10 || wp.length > 11)
    errors.work_phone = "Work phone must be 10–11 digits";
  else if (/^[01]/.test(wp))
    errors.work_phone = "US phone numbers cannot start with 0 or 1";

  if (!data.pay_frequency)
    errors.pay_frequency = "Please select your pay frequency";

  if (!data.months_at_employer)
    errors.months_at_employer = "Please select time at employer";

  // Next pay date: required AND must be a future date
  const todayStr = new Date().toISOString().split("T")[0];
  if (!data.next_pay_date)
    errors.next_pay_date = "Next pay date is required";
  else if (data.next_pay_date <= todayStr)
    errors.next_pay_date = "Next pay date must be a future date";

  // Second pay date: required AND must be after next pay date
  if (!data.second_pay_date)
    errors.second_pay_date = "Second pay date is required";
  else if (data.next_pay_date && data.second_pay_date <= data.next_pay_date)
    errors.second_pay_date = "Second pay date must be after the next pay date";

  return errors;
}

// ─── Step 4 – Banking ───────────────────────────────────────
export function validateStep4(data) {
  const errors = {};

  if (!data.bank_name) errors.bank_name = "Bank name is required";

  // Bank ABA: must be exactly 9 digits
  const aba = (data.bank_aba || "").replace(/\D/g, "");
  if (!aba) errors.bank_aba = "Routing number is required";
  else if (aba.length !== 9)
    errors.bank_aba = "Routing number must be exactly 9 digits";

  // Bank account: 4-25 digits
  const acct = (data.bank_account_number || "").replace(/\D/g, "");
  if (!acct) errors.bank_account_number = "Account number is required";
  else if (acct.length < 4 || acct.length > 25)
    errors.bank_account_number = "Account number must be 4–25 digits";

  if (!data.bank_type) errors.bank_type = "Please select an account type";

  if (!data.months_at_bank)
    errors.months_at_bank = "Please select how long at this bank";

  if (!data.has_debit_card)
    errors.has_debit_card = "Please select if you have a debit card";

  if (!data.driver_license_number)
    errors.driver_license_number = "Driver's license number is required";
  else if (data.driver_license_number.length < 4 || data.driver_license_number.length > 25)
    errors.driver_license_number = "License must be 4–25 characters";

  if (!data.license_state)
    errors.license_state = "Please select the license state";

  return errors;
}

// ─── Step 5 – Final ─────────────────────────────────────────
export function validateStep5(data) {
  const errors = {};

  if (!data.best_time_to_call)
    errors.best_time_to_call = "Please select a preferred call time";

  if (!data.own_car) errors.own_car = "Please select if you own a car";

  if (!data.military_active)
    errors.military_active = "Please select your military status";

  return errors;
}

// Dispatch to the right validator by step index (0-based)
export function validateStep(step, data) {
  switch (step) {
    case 0: return validateStep1(data);
    case 1: return validateStep2(data);
    case 2: return validateStep3(data);
    case 3: return validateStep4(data);
    case 4: return validateStep5(data);
    default: return {};
  }
}