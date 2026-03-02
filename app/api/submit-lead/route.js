import { NextResponse } from "next/server";
import axios from "axios";

// ═══════════════════════════════════════════════════════════════
//  FIELD-MAPPING HELPERS
//  LP handles transforms on buyer side, but we still send
//  vendor-formatted fields as additional data for reference.
// ═══════════════════════════════════════════════════════════════

// ── DATE HELPERS ────────────────────────────────────────────

/** YYYY-MM-DD → MM/DD/YYYY (Xanadu + LeadsMarket PayDate1) */
function toMMDDYYYY(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${m}/${d}/${y}`;
}

/** YYYY-MM-DD → YYYY/MM/DD (LeadsMarket DOB) */
function toYYYYSlash(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${y}/${m}/${d}`;
}

// ── XANADU / LEADCAPSULE HELPERS ────────────────────────────

/** Map monthly income to Xanadu bucket (700-6000) */
function mapMonthlyIncomeBucket(rawIncome) {
  const amt = parseFloat(String(rawIncome).replace(/,/g, ""));
  if (isNaN(amt) || amt < 800) return 700;
  const buckets = [1000,1250,1500,1750,2000,2250,2500,2750,3000,3250,3500,3750,4000,4250,4500,4750,5000];
  for (const b of buckets) { if (amt <= b) return b; }
  return 6000;
}

/** LP income_source → Xanadu IncomeType */
function mapXanaduIncomeType(incomeSource) {
  const val = (incomeSource || "").toLowerCase();
  if (val.includes("self"))      return "SelfEmployed";
  if (val.includes("employ"))    return "Employed";
  if (val.includes("benefit"))   return "Benefits";
  if (val.includes("unemploy"))  return "Unemployment";
  if (val.includes("currently")) return "None";
  return "Employed";
}

/** LP residence_type → Xanadu OwnHome (1=Own, 0=Rent) */
function mapOwnHome(residenceType) {
  return (residenceType || "").toLowerCase() === "own" ? 1 : 0;
}

/** LP income_payment_type → Xanadu DirectDeposit (1/0) */
function mapDirectDeposit(paymentType) {
  return (paymentType || "").toLowerCase().includes("direct") ? 1 : 0;
}

/** LP military_active → Xanadu Military ("Yes"/"No") */
function mapMilitary(val) {
  return String(val) === "1" ? "Yes" : "No";
}

/** LP bank_type → Xanadu BankAccountType ("C"/"S") */
function mapXanaduBankType(bankType) {
  return (bankType || "").toLowerCase().startsWith("s") ? "S" : "C";
}

/** LP pay_frequency → Xanadu PayFrequency */
function mapXanaduPayFrequency(payFreq) {
  const val = (payFreq || "").toLowerCase();
  if (val.includes("bi"))    return "BiWeekly";
  if (val.includes("twice")) return "TwiceMonthly";
  if (val.includes("monthly") && !val.includes("twice")) return "Monthly";
  if (val.includes("week"))  return "Weekly";
  return "Monthly";
}

/** LP approximate_credit_score → Xanadu CreditRating */
function mapXanaduCreditRating(credit) {
  const map = { excellent:"Excellent", good:"Good", fair:"Fair", poor:"Poor", unsure:"Fair" };
  return map[(credit || "").toLowerCase()] || "Fair";
}

/** Compute months from years_at_address */
function computeMonthsAtResidence(yearsAtAddress) {
  return Math.max(parseInt(yearsAtAddress || "0", 10) * 12, 1);
}

// ── LEADSMARKET HELPERS ─────────────────────────────────────

/** LP income_source → LeadsMarket IncomeType */
function mapLMIncomeType(incomeSource) {
  const val = (incomeSource || "").toLowerCase();
  if (val.includes("self"))      return "SELFEMPLOYMENT";
  if (val.includes("employ"))    return "EMPLOYMENT";
  if (val.includes("benefit"))   return "BENEFITS";
  if (val.includes("unemploy"))  return "BENEFITS";
  if (val.includes("currently")) return "BENEFITS";
  return "EMPLOYMENT";
}

/** LP pay_frequency → LeadsMarket PayFrequency */
function mapLMPayFrequency(payFreq) {
  const val = (payFreq || "").toLowerCase();
  if (val.includes("bi"))    return "BIWEEKLY";
  if (val.includes("twice")) return "TWICEMONTHLY";
  if (val.includes("monthly") && !val.includes("twice")) return "MONTHLY";
  if (val.includes("week"))  return "WEEKLY";
  return "MONTHLY";
}

/** LP bank_type → LeadsMarket BankAccountType */
function mapLMBankType(bankType) {
  return (bankType || "").toLowerCase().startsWith("s") ? "SAVINGS" : "CHECKING";
}

/** Any value → LeadsMarket boolean ("true"/"false") */
function mapLMBoolean(val) {
  const v = String(val || "").toLowerCase();
  if (v === "1" || v === "yes" || v === "true" || v === "own") return "true";
  return "false";
}

/** LP residence_type → LeadsMarket ResidenceType */
function mapLMResidenceType(residenceType) {
  return (residenceType || "").toLowerCase() === "own" ? "Own" : "Rent";
}

/** LP approximate_credit_score → LeadsMarket Credit */
function mapLMCredit(credit) {
  const map = { excellent:"Excellent", good:"Good", fair:"Fair", poor:"Poor", unsure:"Unsure" };
  return map[(credit || "").toLowerCase()] || "Fair";
}

// ═══════════════════════════════════════════════════════════════
//  POST /api/submit-lead
// ═══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const body = await request.json();

    // ── Server-side auto-detected ───────────────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "0.0.0.0";
    const userAgent =
      request.headers.get("user-agent") || "Unknown Browser";

    // ── Xanadu datetime ─────────────────────────────────────
    const now = new Date();
    const datetime = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    // ── Clean inputs ────────────────────────────────────────
    const mobilePhone = (body.mobile_phone || "").replace(/\D/g, "");
    const workPhone   = (body.work_phone || "").replace(/\D/g, "");
    const ssn         = (body.social_security_number || "").replace(/\D/g, "");
    const cleanedDL   = (body.driver_license_number || "").replace(/\D/g, "");
    const cleanedABA  = (body.bank_aba || "").replace(/\D/g, "");
    const cleanedAcct = (body.bank_account_number || "").replace(/\D/g, "");
    const loanAmount  = parseInt((body.loan_amount || "0").replace(/,/g, ""), 10);
    const monthlyIncomeRaw = parseFloat((body.monthly_income || "0").replace(/,/g, ""));

    // ── Computed dates ──────────────────────────────────────
    const yearsBack = parseInt(body.years_at_address || "0", 10);
    const moveDate = new Date();
    moveDate.setFullYear(moveDate.getFullYear() - yearsBack);
    const moveHereDate = moveDate.toISOString().split("T")[0];

    const monthsBack = parseInt(body.months_at_bank || "12", 10);
    const bankDate = new Date();
    bankDate.setMonth(bankDate.getMonth() - monthsBack);
    const bankStart = bankDate.toISOString().split("T")[0];

    const empMonths = parseInt(body.months_at_employer || "12", 10);
    const empDate = new Date();
    empDate.setMonth(empDate.getMonth() - empMonths);
    const employmentStarted = empDate.toISOString().split("T")[0];

    const monthsAtResidence = computeMonthsAtResidence(body.years_at_address);

    const websiteRef = process.env.WEBSITE_REF || "https://radcred.com/";

    const tcpaText = process.env.TCPA_CONSENT_TEXT ||
      "By clicking 'Submit' I agree by electronic signature to be contacted by RadCred through a live agent, artificial or prerecorded voice, and automated SMS text at my residential or cellular number, dialed manually or by autodialer, and by email. I agree to the Disclaimer, Privacy Policy and Terms of Use. I authorize RadCred and its partners to use autodialers, send SMS messages, or deliver prerecorded messages to my phone number. I understand consent is not required to obtain a loan.";

    // ══════════════════════════════════════════════════════════
    //  UNIFIED PAYLOAD — All fields sent to LeadProsper
    // ══════════════════════════════════════════════════════════

    const payload = {

      // ──── LP REQUIRED ─────────────────────────────────────
      lp_campaign_id: process.env.LP_CAMPAIGN_ID || "33006",
      lp_supplier_id: process.env.LP_SUPPLIER_ID || "105821",
      lp_key:         process.env.LP_KEY         || "z6yysnz7xflr0j",
      lp_action:      process.env.LP_ACTION      || "",
      lp_subid1:      "",
      lp_subid2:      "",

      // ──── LP STANDARD SYSTEM FIELDS ───────────────────────
      first_name:           body.first_name,
      last_name:            body.last_name,
      email:                body.email,
      phone:                mobilePhone,
      date_of_birth:        body.date_birth,
      gender:               body.gender || "Other",
      address:              body.street,
      city:                 body.city,
      state:                body.state,
      zip_code:             body.post_code,
      ip_address:           ip,
      user_agent:           userAgent,
      landing_page_url:     websiteRef,
      jornaya_leadid:       body.jornaya_leadid || "",
      trustedform_cert_url: body.trustedform_cert_url || "",
      tcpa_text:            tcpaText,
      driver_number:        cleanedDL,

      // ──── LP CAMPAIGN FIELDS (LP-recommended values) ──────
      // Values confirmed with LP:
      //   residence_type:           Own, Rent, Other
      //   income_source:            Employment, Benefits, Self Employed, Unemployment, Currently Unemployed
      //   income_payment_type:      Direct Deposit, Check
      //   pay_frequency:            Weekly, Bi Weekly, Twice Monthly, Monthly
      //   approximate_credit_score: Excellent, Good, Fair, Poor, Unsure
      //   bank_type:                Checking, Savings
      residence_type:           body.residence_type,
      income_source:            body.income_source,
      income_payment_type:      body.income_payment_type,
      pay_frequency:            body.pay_frequency,
      approximate_credit_score: body.approximate_credit_score || "",
      bank_type:                body.bank_type,

      // ──── PDV PORTAL FIELDS ───────────────────────────────
      aff_id:              process.env.LP_AFF_ID  || "5922",
      ckm_key:             process.env.LP_CKM_KEY || "ng2dp0YbGgp4",
      sub_aff:             "",
      title:               "Mr.",
      date_birth:          body.date_birth,
      mobile_phone:        mobilePhone,
      home_phone:          mobilePhone,
      street:              body.street,
      post_code:           body.post_code,
      house_number:        "",
      move_here_date:      moveHereDate,
      loan_amount:         loanAmount,
      monthly_income:      monthlyIncomeRaw,
      company_name:        body.company_name,
      job_title:           body.job_title,
      work_phone:          workPhone,
      employment_started:  employmentStarted,
      months_at_employer:  empMonths,
      next_pay_date:       body.next_pay_date,
      second_pay_date:     body.second_pay_date,
      social_security_number: ssn,
      driver_license_number:  cleanedDL,
      license_state:          body.license_state,
      bank_name:           body.bank_name,
      bank_aba:            cleanedABA,
      bank_account_number: cleanedAcct,
      bank_start:          bankStart,
      months_at_bank:      parseInt(body.months_at_bank || "12", 10),
      military_active:     String(body.military_active || "0"),
      loan_reason:         body.loan_reason || "",
      own_car:             body.own_car || "",
      has_debit_card:      body.has_debit_card || "",
      best_time_to_call:   body.best_time_to_call || "",
      term_email:          "1",
      term_sms:            "1",
      ip:                  ip,
      website:             websiteRef,

      // ──── XANADU / LEADCAPSULE FIELDS ─────────────────────
      CampaignId:           process.env.XANADU_CAMPAIGN_ID || "13104EBAA8C8DD47D27D7210E2F65B02",
      IsTest:               process.env.XANADU_IS_TEST || "False",
      FirstName:            body.first_name,
      LastName:             body.last_name,
      Email:                body.email,
      Phone:                mobilePhone,
      DateOfBirth:          toMMDDYYYY(body.date_birth),
      datetime:             datetime,
      Address1:             body.street,
      City:                 body.city,
      State:                body.state,
      Zip:                  body.post_code,
      OwnHome:              mapOwnHome(body.residence_type),
      Military:             mapMilitary(body.military_active),
      Social:               ssn,
      DriversLicenseState:  body.license_state,
      DriversLicenseNumber: cleanedDL,
      IncomeType:           mapXanaduIncomeType(body.income_source),
      Employer:             body.company_name,
      PayFrequency:         mapXanaduPayFrequency(body.pay_frequency),
      DirectDeposit:        mapDirectDeposit(body.income_payment_type),
      MonthsAtEmployer:     empMonths,
      NextPayDate:          toMMDDYYYY(body.next_pay_date),
      SecondPayDate:        toMMDDYYYY(body.second_pay_date),
      MonthlyIncome:        mapMonthlyIncomeBucket(body.monthly_income),
      BankAccountType:      mapXanaduBankType(body.bank_type),
      BankAccountName:      body.bank_name,
      BankAccountNumber:    cleanedAcct,
      BankRoutingNumber:    cleanedABA,
      MonthsAtResidence:    monthsAtResidence,
      MonthsWithBank:       parseInt(body.months_at_bank || "12", 10),
      LoanAmountRequest:    loanAmount,
      Loan_Reason:          body.loan_reason || "Other",
      CreditRating:         mapXanaduCreditRating(body.approximate_credit_score),
      WorkPhone:            workPhone,
      IPAddress:            ip,
      UserAgent:            userAgent,
      subOne:               process.env.XANADU_SUB_ONE || "RadCred",
      subTwo:               process.env.XANADU_SUB_TWO || "Website",
      Source_URL:           websiteRef,

      // ──── LEADSMARKET FIELDS (lm_ prefixed) ──────────────
      lm_campaignid:        process.env.LEADSMARKET_CAMPAIGN_ID  || "332180",
      lm_campaignKey:       process.env.LEADSMARKET_CAMPAIGN_KEY || "aa58e69c-7bb0-4d24-9d1e-57d78424b5c3",
      lm_leadtypeid:        process.env.LEADSMARKET_LEAD_TYPE_ID || "19",
      lm_responsetype:      "json",
      lm_ResponseAsync:     "0",
      lm_FlexibleAmount:    "true",
      lm_AcceptedTerms:     "1",
      lm_SourceSubID:       "RadCred",
      lm_TestResult:        process.env.LEADSMARKET_TEST_RESULT || "",
      lm_FirstName:         body.first_name,
      lm_LastName:          body.last_name,
      lm_Email:             body.email,
      lm_PhoneHome:         mobilePhone,
      lm_PhoneWork:         workPhone,
      lm_DOB:               toYYYYSlash(body.date_birth),
      lm_SSN:               ssn,
      lm_Address1:          body.street,
      lm_State:             body.state,
      lm_ZipCode:           body.post_code,
      lm_MonthsAtAddress:   String(monthsAtResidence),
      lm_ResidenceType:     mapLMResidenceType(body.residence_type),
      lm_OwnHome:           mapLMBoolean(body.residence_type),
      lm_RequestedAmount:   String(loanAmount),
      lm_IncomeType:        mapLMIncomeType(body.income_source),
      lm_EmployerName:      body.company_name,
      lm_MonthsEmployed:    String(empMonths),
      lm_MonthlyIncome:     String(Math.round(monthlyIncomeRaw)),
      lm_AnnualIncome:      String(Math.round(monthlyIncomeRaw * 12)),
      lm_PayFrequency:      mapLMPayFrequency(body.pay_frequency),
      lm_PayDate1:          toMMDDYYYY(body.next_pay_date),
      lm_DirectDeposit:     mapLMBoolean(mapDirectDeposit(body.income_payment_type)),
      lm_BankName:          body.bank_name,
      lm_BankABA:           cleanedABA,
      lm_BankAccountNumber: cleanedAcct,
      lm_BankAccountType:   mapLMBankType(body.bank_type),
      lm_MonthsAtBank:      String(parseInt(body.months_at_bank || "12", 10)),
      lm_Credit:            mapLMCredit(body.approximate_credit_score),
      lm_ActiveMilitary:    mapLMBoolean(body.military_active),
      lm_OwnCar:            mapLMBoolean(body.own_car),
      lm_DriversLicense:    cleanedDL,
      lm_DriversLicenseState: body.license_state,
      lm_BestTimeToCall:    body.best_time_to_call || "Anytime",
      lm_TCPAConsentText:   tcpaText,
      lm_clientIP:          ip,
      lm_clientUserAgent:   userAgent,
      lm_clientUrl:         websiteRef,
    };

    // ══════════════════════════════════════════════════════════
    //  CONSOLE LOG — ALL VENDOR DATA
    // ══════════════════════════════════════════════════════════

    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║              LEAD SUBMISSION — FULL VENDOR DATA              ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");

    console.log("\n┌─── LP REQUIRED ─────────────────────────────────────────────");
    console.log("│ lp_campaign_id:", payload.lp_campaign_id);
    console.log("│ lp_supplier_id:", payload.lp_supplier_id);
    console.log("│ lp_key:        ", payload.lp_key);
    console.log("│ lp_action:     ", payload.lp_action || "(empty = production)");
    console.log("└─────────────────────────────────────────────────────────────\n");

    console.log("┌─── LP STANDARD SYSTEM FIELDS ───────────────────────────────");
    console.log("│ first_name:       ", payload.first_name);
    console.log("│ last_name:        ", payload.last_name);
    console.log("│ email:            ", payload.email);
    console.log("│ phone:            ", payload.phone);
    console.log("│ date_of_birth:    ", payload.date_of_birth);
    console.log("│ gender:           ", payload.gender);
    console.log("│ address:          ", payload.address);
    console.log("│ city:             ", payload.city);
    console.log("│ state:            ", payload.state);
    console.log("│ zip_code:         ", payload.zip_code);
    console.log("│ ip_address:       ", payload.ip_address);
    console.log("│ landing_page_url: ", payload.landing_page_url);
    console.log("│ driver_number:    ", payload.driver_number);
    console.log("└─────────────────────────────────────────────────────────────\n");

    console.log("┌─── LP CAMPAIGN FIELDS (confirmed with LP) ─────────────────");
    console.log("│ residence_type:           ", payload.residence_type);
    console.log("│ income_source:            ", payload.income_source);
    console.log("│ income_payment_type:      ", payload.income_payment_type);
    console.log("│ pay_frequency:            ", payload.pay_frequency);
    console.log("│ approximate_credit_score: ", payload.approximate_credit_score);
    console.log("│ bank_type:                ", payload.bank_type);
    console.log("└─────────────────────────────────────────────────────────────\n");

    console.log("┌─── VENDOR 1: PDV PORTAL (ID: 105193) ──────────────────────");
    console.log("│ aff_id:             ", payload.aff_id);
    console.log("│ ckm_key:            ", payload.ckm_key);
    console.log("│ date_birth:         ", payload.date_birth, "(YYYY-MM-DD)");
    console.log("│ mobile_phone:       ", payload.mobile_phone);
    console.log("│ street:             ", payload.street);
    console.log("│ post_code:          ", payload.post_code);
    console.log("│ house_number:       ", "(empty — combined in street)");
    console.log("│ residence_type:     ", payload.residence_type, "→ LP transforms to: Home Owner / Renting");
    console.log("│ move_here_date:     ", payload.move_here_date);
    console.log("│ loan_amount:        ", payload.loan_amount);
    console.log("│ income_source:      ", payload.income_source, "→ LP transforms to: Full Time Employed / etc");
    console.log("│ monthly_income:     ", payload.monthly_income);
    console.log("│ income_payment_type:", payload.income_payment_type);
    console.log("│ company_name:       ", payload.company_name);
    console.log("│ work_phone:         ", payload.work_phone);
    console.log("│ next_pay_date:      ", payload.next_pay_date);
    console.log("│ second_pay_date:    ", payload.second_pay_date);
    console.log("│ pay_frequency:      ", payload.pay_frequency, "→ LP transforms to: PDV format");
    console.log("│ SSN:                ", payload.social_security_number);
    console.log("│ DL:                 ", payload.driver_license_number);
    console.log("│ bank_name:          ", payload.bank_name);
    console.log("│ bank_aba:           ", payload.bank_aba);
    console.log("│ bank_account_number:", payload.bank_account_number);
    console.log("│ bank_type:          ", payload.bank_type);
    console.log("│ credit_score:       ", payload.approximate_credit_score);
    console.log("│ military_active:    ", payload.military_active);
    console.log("└─────────────────────────────────────────────────────────────\n");

    console.log("┌─── VENDOR 2: XANADU / LEADCAPSULE (ID: 105046) ────────────");
    console.log("│ CampaignId:         ", payload.CampaignId);
    console.log("│ IsTest:             ", payload.IsTest);
    console.log("│ FirstName:          ", payload.FirstName);
    console.log("│ LastName:           ", payload.LastName);
    console.log("│ DateOfBirth:        ", payload.DateOfBirth, "(MM/DD/YYYY)");
    console.log("│ Phone:              ", payload.Phone);
    console.log("│ Address1:           ", payload.Address1);
    console.log("│ State:              ", payload.State);
    console.log("│ Zip:                ", payload.Zip);
    console.log("│ OwnHome:            ", payload.OwnHome, "(1=Own, 0=Rent)");
    console.log("│ IncomeType:         ", payload.IncomeType);
    console.log("│ PayFrequency:       ", payload.PayFrequency);
    console.log("│ DirectDeposit:      ", payload.DirectDeposit, "(1=Yes, 0=No)");
    console.log("│ MonthlyIncome:      ", payload.MonthlyIncome, "(bucket)");
    console.log("│ NextPayDate:        ", payload.NextPayDate, "(MM/DD/YYYY)");
    console.log("│ CreditRating:       ", payload.CreditRating);
    console.log("│ BankAccountType:    ", payload.BankAccountType, "(C/S)");
    console.log("│ Military:           ", payload.Military);
    console.log("│ Social:             ", payload.Social);
    console.log("│ LoanAmountRequest:  ", payload.LoanAmountRequest);
    console.log("└─────────────────────────────────────────────────────────────\n");

    console.log("┌─── VENDOR 3: LEADSMARKET (ID: 105819) ─────────────────────");
    console.log("│ lm_campaignid:      ", payload.lm_campaignid);
    console.log("│ lm_campaignKey:     ", payload.lm_campaignKey);
    console.log("│ lm_TestResult:      ", payload.lm_TestResult || "(empty = production)");
    console.log("│ lm_FirstName:       ", payload.lm_FirstName);
    console.log("│ lm_LastName:        ", payload.lm_LastName);
    console.log("│ lm_DOB:             ", payload.lm_DOB, "(YYYY/MM/DD)");
    console.log("│ lm_PhoneHome:       ", payload.lm_PhoneHome);
    console.log("│ lm_Address1:        ", payload.lm_Address1);
    console.log("│ lm_State:           ", payload.lm_State);
    console.log("│ lm_ZipCode:         ", payload.lm_ZipCode);
    console.log("│ lm_OwnHome:         ", payload.lm_OwnHome);
    console.log("│ lm_ResidenceType:   ", payload.lm_ResidenceType);
    console.log("│ lm_IncomeType:      ", payload.lm_IncomeType);
    console.log("│ lm_PayFrequency:    ", payload.lm_PayFrequency);
    console.log("│ lm_MonthlyIncome:   ", payload.lm_MonthlyIncome);
    console.log("│ lm_DirectDeposit:   ", payload.lm_DirectDeposit);
    console.log("│ lm_Credit:          ", payload.lm_Credit);
    console.log("│ lm_BankAccountType: ", payload.lm_BankAccountType);
    console.log("│ lm_SSN:             ", payload.lm_SSN);
    console.log("│ lm_RequestedAmount: ", payload.lm_RequestedAmount);
    console.log("│ lm_ActiveMilitary:  ", payload.lm_ActiveMilitary);
    console.log("│ lm_PayDate1:        ", payload.lm_PayDate1, "(MM/DD/YYYY)");
    console.log("└─────────────────────────────────────────────────────────────\n");

    console.log("┌─── TRANSFORM COMPARISON TABLE ──────────────────────────────");
    console.log("│");
    console.log("│ FIELD               YOU SEND (LP)        PDV Portal           Xanadu               LeadsMarket");
    console.log("│ ─────────────────── ──────────────────── ──────────────────── ──────────────────── ────────────────────");

    const pad = (s, n) => String(s || "").padEnd(n);
    console.log("│ residence_type      " + pad(payload.residence_type,20) + pad("LP transforms",20) + pad("OwnHome="+payload.OwnHome,20) + payload.lm_ResidenceType+"/"+payload.lm_OwnHome);
    console.log("│ income_source       " + pad(payload.income_source,20) + pad("LP transforms",20) + pad(payload.IncomeType,20) + payload.lm_IncomeType);
    console.log("│ income_payment_type " + pad(payload.income_payment_type,20) + pad(payload.income_payment_type,20) + pad("DirectDeposit="+payload.DirectDeposit,20) + payload.lm_DirectDeposit);
    console.log("│ pay_frequency       " + pad(payload.pay_frequency,20) + pad("LP transforms",20) + pad(payload.PayFrequency,20) + payload.lm_PayFrequency);
    console.log("│ credit_score        " + pad(payload.approximate_credit_score,20) + pad(payload.approximate_credit_score,20) + pad(payload.CreditRating,20) + payload.lm_Credit);
    console.log("│ bank_type           " + pad(payload.bank_type,20) + pad(payload.bank_type,20) + pad("BankAcctType="+payload.BankAccountType,20) + payload.lm_BankAccountType);
    console.log("│ DOB                 " + pad(payload.date_birth,20) + pad(payload.date_birth,20) + pad(payload.DateOfBirth,20) + payload.lm_DOB);
    console.log("│");
    console.log("└─────────────────────────────────────────────────────────────\n");

    console.log("Total payload fields:", Object.keys(payload).length);
    console.log("═══════════════════════════════════════════════════════════════\n");

    // ══════════════════════════════════════════════════════════
    //  SEND TO LEADPROSPER
    // ══════════════════════════════════════════════════════════

    const lpUrl = process.env.LP_DIRECT_POST_URL || "https://api.leadprosper.io/direct_post";
    console.log("[submit-lead] Sending to LeadProsper →", lpUrl);

    const lpResponse = await axios.post(lpUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    const lpData = lpResponse.data;

    console.log("\n┌─── LEADPROSPER RESPONSE ─────────────────────────────────────");
    console.log("│ HTTP Status:", lpResponse.status);
    console.log("│ Response:", JSON.stringify(lpData, null, 2));
    console.log("└─────────────────────────────────────────────────────────────\n");

    // ── Parse response ──────────────────────────────────────
    const hasLeadId = !!(lpData?.lead_id || lpData?.id);
    const isAccepted = lpData?.status === "ACCEPTED" || lpData?.code === 0;
    const isDuplicated = lpData?.status === "DUPLICATED" || lpData?.code === 1008;

    const redirectUrl =
      lpData?.redirect_url || lpData?.redirect ||
      lpData?.RedirectURL || lpData?.data?.RedirectURL || null;
    const price =
      lpData?.price || lpData?.Price || lpData?.data?.Price || null;

    if (!isAccepted && hasLeadId) {
      console.warn("[LeadProsper] Lead stored but buyer rejected →", "code:", lpData?.code, "message:", lpData?.message);
    }

    if (isDuplicated) {
      return NextResponse.json({
        success: true,
        message: "Application submitted successfully! We will contact you soon.",
        data: { lead_id: lpData?.lead_id || lpData?.id || null, lp_status: "DUPLICATED" },
      });
    }

    if (hasLeadId || isAccepted) {
      return NextResponse.json({
        success: true,
        message: "Application submitted successfully! We will contact you soon.",
        data: {
          lead_id:      lpData?.lead_id || lpData?.id || null,
          redirect_url: redirectUrl,
          price:        price,
          lp_status:    lpData?.status || null,
        },
      });
    }

    const errorMsg = lpData?.message || "Something went wrong. Please verify your information and try again.";
    console.error("[LeadProsper] Failure:", errorMsg);

    return NextResponse.json({ success: false, message: errorMsg, data: lpData }, { status: 422 });

  } catch (error) {
    console.error("[submit-lead] Error:", error?.response?.data || error.message);
    return NextResponse.json({
      success: false,
      message: error?.response?.data?.message || error.message || "Something went wrong.",
      error: error?.response?.data || { message: error.message },
    }, { status: error?.response?.status || 500 });
  }
}