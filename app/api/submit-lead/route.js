import { NextResponse } from "next/server";
import axios from "axios";

// ═══════════════════════════════════════════════════════════════
//  FIELD-MAPPING HELPERS
//  Convert form values to vendor-compatible formats so
//  LeadProsper can route to ANY buyer
//  (PDV Portal, Xanadu/LeadCapsule, LeadsMarket)
// ═══════════════════════════════════════════════════════════════

// ── SHARED HELPERS ──────────────────────────────────────────

/**
 * Compute MonthsAtResidence from years_at_address
 */
function computeMonthsAtResidence(yearsAtAddress) {
  const years = parseInt(yearsAtAddress || "0", 10);
  return Math.max(years * 12, 1);
}

// ── XANADU / LEADCAPSULE HELPERS ────────────────────────────

/**
 * Convert YYYY-MM-DD → MM/dd/yyyy (Xanadu date format)
 */
function toMMDDYYYY(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${m}/${d}/${y}`;
}

/**
 * Map monthly income to Xanadu range-bucket value.
 * Xanadu expects: 700, 1000, 1250, 1500, …, 5000, 6000
 */
function mapMonthlyIncomeBucket(rawIncome) {
  const amt = parseFloat(String(rawIncome).replace(/,/g, ""));
  if (isNaN(amt) || amt < 800) return 700;
  if (amt <= 1000) return 1000;
  if (amt <= 1250) return 1250;
  if (amt <= 1500) return 1500;
  if (amt <= 1750) return 1750;
  if (amt <= 2000) return 2000;
  if (amt <= 2250) return 2250;
  if (amt <= 2500) return 2500;
  if (amt <= 2750) return 2750;
  if (amt <= 3000) return 3000;
  if (amt <= 3250) return 3250;
  if (amt <= 3500) return 3500;
  if (amt <= 3750) return 3750;
  if (amt <= 4000) return 4000;
  if (amt <= 4250) return 4250;
  if (amt <= 4500) return 4500;
  if (amt <= 4750) return 4750;
  if (amt <= 5000) return 5000;
  return 6000;
}

/**
 * Map income_source form value → Xanadu IncomeType
 * "Employed_PT" → "Employed" (Xanadu treats part-time as Employed)
 */
function mapIncomeType(incomeSource) {
  if ((incomeSource || "").startsWith("Employed")) return "Employed";
  return incomeSource || "Employed";
}

/**
 * Map residence_type → OwnHome (Xanadu: 1=Own, 0=Rent)
 */
function mapOwnHome(residenceType) {
  const val = (residenceType || "").toLowerCase();
  if (val.includes("own") || val.includes("home")) return 1;
  return 0;
}

/**
 * Map income_payment_type → DirectDeposit (Xanadu: 1=Yes, 0=No)
 */
function mapDirectDeposit(paymentType) {
  return (paymentType || "").toLowerCase().includes("direct") ? 1 : 0;
}

/**
 * Map military_active → Military (Xanadu: "Yes"/"No")
 */
function mapMilitary(val) {
  return String(val) === "1" ? "Yes" : "No";
}

/**
 * Map bank_type → BankAccountType (Xanadu: "C"/"S")
 */
function mapBankAccountType(bankType) {
  if ((bankType || "").toLowerCase().startsWith("s")) return "S";
  return "C";
}

// ── LEADSMARKET HELPERS ─────────────────────────────────────

/**
 * Convert YYYY-MM-DD → YYYY/MM/DD (LeadsMarket DOB format)
 */
function toYYYYSlash(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${y}/${m}/${d}`;
}

/**
 * Map income_source → LeadsMarket IncomeType (uppercase enum)
 * LeadsMarket accepts: EMPLOYMENT, SELFEMPLOYMENT, BENEFITS,
 *                      MILITARY, RETIREMENT, DISABILITY
 */
function mapLMIncomeType(incomeSource) {
  const val = (incomeSource || "").toLowerCase();
  if (val.includes("self"))       return "SELFEMPLOYMENT";
  if (val.includes("employ"))     return "EMPLOYMENT";
  if (val.includes("disability")) return "DISABILITY";
  if (val.includes("military"))   return "MILITARY";
  if (val.includes("retire"))     return "RETIREMENT";
  if (val.includes("benefit"))    return "BENEFITS";
  return "EMPLOYMENT";
}

/**
 * Map pay_frequency → LeadsMarket PayFrequency (uppercase)
 * LeadsMarket accepts: WEEKLY, BIWEEKLY, TWICEMONTHLY, MONTHLY
 */
function mapLMPayFrequency(payFreq) {
  const val = (payFreq || "").toLowerCase();
  if (val.includes("twice") || val.includes("bi-monthly") || val.includes("semi")) return "TWICEMONTHLY";
  if (val.includes("bi") || val.includes("every other"))  return "BIWEEKLY";
  if (val.includes("month"))  return "MONTHLY";
  if (val.includes("week"))   return "WEEKLY";
  return "MONTHLY";
}

/**
 * Map bank_type → LeadsMarket BankAccountType (uppercase)
 * LeadsMarket accepts: CHECKING, SAVINGS
 */
function mapLMBankAccountType(bankType) {
  if ((bankType || "").toLowerCase().startsWith("s")) return "SAVINGS";
  return "CHECKING";
}

/**
 * Map any boolean-ish value → "true"/"false" string for LeadsMarket
 */
function mapLMBoolean(val) {
  const v = String(val || "").toLowerCase();
  if (v === "1" || v === "yes" || v === "true") return "true";
  return "false";
}

/**
 * Map residence_type → "Own"/"Rent" for LeadsMarket
 */
function mapLMResidenceType(residenceType) {
  const val = (residenceType || "").toLowerCase();
  if (val.includes("own") || val.includes("home")) return "Own";
  return "Rent";
}

// ═══════════════════════════════════════════════════════════════
//  POST /api/submit-lead
//
//  Receives form data → maps ALL fields for every vendor →
//  sends ONLY to LeadProsper Direct Post.
//  LeadProsper handles distribution to buyers
//  (PDV Portal, LeadCapsule/Xanadu, LeadsMarket)
// ═══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const body = await request.json();

    // ── Server-side auto-detected values ────────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "0.0.0.0";
    const userAgent =
      request.headers.get("user-agent") || "Unknown Browser";

    // ── Current datetime for Xanadu ─────────────────────────
    const now = new Date();
    const datetime = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    // ── Clean phone numbers ─────────────────────────────────
    const mobilePhone = (body.mobile_phone || "").replace(/\D/g, "");
    const workPhone = (body.work_phone || "").replace(/\D/g, "");

    // ── Compute derived values ──────────────────────────────
    // PDV Portal: move_here_date from years_at_address
    const yearsBack = parseInt(body.years_at_address || "0", 10);
    const moveDate = new Date();
    moveDate.setFullYear(moveDate.getFullYear() - yearsBack);
    const moveHereDate = moveDate.toISOString().split("T")[0];

    // PDV Portal: bank_start from months_at_bank
    const monthsBack = parseInt(body.months_at_bank || "12", 10);
    const bankDate = new Date();
    bankDate.setMonth(bankDate.getMonth() - monthsBack);
    const bankStart = bankDate.toISOString().split("T")[0];

    // PDV Portal: employment_started from months_at_employer
    const empMonths = parseInt(body.months_at_employer || "12", 10);
    const empDate = new Date();
    empDate.setMonth(empDate.getMonth() - empMonths);
    const employmentStarted = empDate.toISOString().split("T")[0];

    // Shared: MonthsAtResidence from years_at_address
    const monthsAtResidence = computeMonthsAtResidence(body.years_at_address);

    // Raw numeric values
    const loanAmount = parseInt((body.loan_amount || "0").replace(/,/g, ""), 10);
    const monthlyIncomeRaw = parseFloat((body.monthly_income || "0").replace(/,/g, ""));
    const ssn = (body.social_security_number || "").replace(/\D/g, "");
    const cleanedDL = (body.driver_license_number || "").replace(/\D/g, "");
    const cleanedBankABA = (body.bank_aba || "").replace(/\D/g, "");
    const cleanedBankAcct = (body.bank_account_number || "").replace(/\D/g, "");

    // Website/source
    const websiteRef = process.env.WEBSITE_REF || "https://radcred.com/";

    // TCPA consent text
    const tcpaText = process.env.TCPA_CONSENT_TEXT ||
      "By clicking 'Submit' I agree by electronic signature to be contacted by RadCred through a live agent, artificial or prerecorded voice, and automated SMS text at my residential or cellular number, dialed manually or by autodialer, and by email. I agree to the Disclaimer, Privacy Policy and Terms of Use. I authorize RadCred and its partners to use autodialers, send SMS messages, or deliver prerecorded messages to my phone number. I understand consent is not required to obtain a loan.";

    // ══════════════════════════════════════════════════════════
    //  BUILD THE UNIFIED PAYLOAD
    //  Includes fields named for ALL THREE vendors so LeadProsper
    //  can map to whichever buyer it routes to.
    // ══════════════════════════════════════════════════════════

    const payload = {

      // ──────────────────────────────────────────────────────
      //  LEADPROSPER REQUIRED PARAMETERS
      // ──────────────────────────────────────────────────────
      lp_campaign_id: process.env.LP_CAMPAIGN_ID || "32840",
      lp_supplier_id: process.env.LP_SUPPLIER_ID || "105045",
      lp_key:         process.env.LP_KEY         || "ey77bp5jya7eny",
      lp_action:      process.env.LP_ACTION      || "",   // "" = production, "test" = test
      lp_subid1:      "",
      lp_subid2:      "",

      // ──────────────────────────────────────────────────────
      //  STANDARD FIELDS (PDV Portal naming convention)
      // ──────────────────────────────────────────────────────

      // Personal
      first_name:    body.first_name,
      last_name:     body.last_name,
      email:         body.email,
      date_birth:    body.date_birth,                    // YYYY-MM-DD
      mobile_phone:  mobilePhone,
      home_phone:    mobilePhone,
      title:         "Mr.",

      // Address
      street:        body.street,
      city:          body.city,
      state:         body.state,
      post_code:     body.post_code,
      house_number:  "",
      residence_type: body.residence_type,               // "Renting" / "Home Owner"
      move_here_date: moveHereDate,

      // Financial / Employment
      loan_amount:         loanAmount,
      income_source:       body.income_source,
      monthly_income:      monthlyIncomeRaw,
      income_payment_type: body.income_payment_type,     // "Direct Deposit" / "Check"
      company_name:        body.company_name,
      job_title:           body.job_title,
      work_phone:          workPhone,
      employment_started:  employmentStarted,
      months_at_employer:  parseInt(body.months_at_employer || "12", 10),
      next_pay_date:       body.next_pay_date,           // YYYY-MM-DD
      second_pay_date:     body.second_pay_date,         // YYYY-MM-DD
      pay_frequency:       body.pay_frequency,

      // Sensitive
      social_security_number: ssn,
      driver_license_number:  cleanedDL,
      license_state:          body.license_state,

      // Banking
      bank_name:           body.bank_name,
      bank_aba:            cleanedBankABA,
      bank_account_number: cleanedBankAcct,
      bank_type:           body.bank_type,               // "Checking" / "Savings"
      bank_start:          bankStart,
      months_at_bank:      parseInt(body.months_at_bank || "12", 10),

      // Flags & Extra
      military_active:          parseInt(body.military_active || "0", 10),
      approximate_credit_score: body.approximate_credit_score || "",
      loan_reason:              body.loan_reason || "",
      own_car:                  body.own_car || "",
      has_debit_card:           body.has_debit_card || "",
      best_time_to_call:        body.best_time_to_call || "",
      term_email:               1,
      term_sms:                 1,

      // PDV Portal buyer credentials
      aff_id:  process.env.LP_AFF_ID  || "5922",
      ckm_key: process.env.LP_CKM_KEY || "ng2dp0YbGgp4",
      sub_aff: "",

      // Auto-detected
      ip,
      user_agent: userAgent,
      website:    websiteRef,

      // TCPA / Compliance
      tcpa_text: tcpaText,

      // ──────────────────────────────────────────────────────
      //  XANADU / LEADCAPSULE MAPPED FIELDS
      //  These use exact Xanadu field names + accepted values
      //  so LeadProsper can map them directly to the Xanadu buyer.
      // ──────────────────────────────────────────────────────

      // Xanadu campaign (LeadProsper uses this when routing)
      CampaignId:          process.env.XANADU_CAMPAIGN_ID || "13104EBAA8C8DD47D27D7210E2F65B02",
      IsTest:              process.env.XANADU_IS_TEST || "False",

      // Personal (Xanadu naming)
      FirstName:           body.first_name,
      LastName:            body.last_name,
      Email:               body.email,
      Phone:               mobilePhone,
      DateOfBirth:         toMMDDYYYY(body.date_birth),    // MM/dd/yyyy
      datetime:            datetime,

      // Address (Xanadu naming)
      Address1:            body.street,
      City:                body.city,
      State:               body.state,
      Zip:                 body.post_code,

      // Home ownership (Xanadu: 1/0)
      OwnHome:             mapOwnHome(body.residence_type),

      // Military (Xanadu: "Yes"/"No")
      Military:            mapMilitary(body.military_active),

      // Identity (Xanadu naming)
      Social:              ssn,
      DriversLicenseState: body.license_state,
      DriversLicenseNumber: cleanedDL,

      // Employment (Xanadu naming)
      IncomeType:          mapIncomeType(body.income_source),
      Employer:            body.company_name,
      PayFrequency:        body.pay_frequency,            // Weekly/BiWeekly/TwiceMonthly/Monthly
      DirectDeposit:       mapDirectDeposit(body.income_payment_type),
      MonthsAtEmployer:    parseInt(body.months_at_employer || "12", 10),

      // Pay dates (Xanadu: MM/dd/yyyy)
      NextPayDate:         toMMDDYYYY(body.next_pay_date),
      SecondPayDate:       toMMDDYYYY(body.second_pay_date),

      // Income (Xanadu: bucket value 700-6000)
      MonthlyIncome:       mapMonthlyIncomeBucket(body.monthly_income),

      // Banking (Xanadu naming)
      BankAccountType:     mapBankAccountType(body.bank_type),
      BankAccountName:     body.bank_name,
      BankAccountNumber:   cleanedBankAcct,
      BankRoutingNumber:   cleanedBankABA,

      // Xanadu duration fields
      MonthsAtResidence:   monthsAtResidence,
      MonthsWithBank:      parseInt(body.months_at_bank || "12", 10),

      // Loan details (Xanadu naming)
      LoanAmountRequest:   loanAmount,
      Loan_Reason:         body.loan_reason || "Other",
      CreditRating:        body.approximate_credit_score || "Fair",

      // Work phone (Xanadu naming)
      WorkPhone:           workPhone,

      // IP/UA (Xanadu naming)
      IPAddress:           ip,
      UserAgent:           userAgent,

      // Xanadu tracking / source
      subOne:              process.env.XANADU_SUB_ONE   || "RadCred",
      subTwo:              process.env.XANADU_SUB_TWO   || "Website",
      Source_URL:          websiteRef,

      // ──────────────────────────────────────────────────────
      //  LEADSMARKET MAPPED FIELDS
      //  Prefixed with lm_ to avoid key collisions with Xanadu.
      //  LeadProsper maps these to LeadsMarket buyer fields.
      //
      //  LeadsMarket API: https://api.leadsmarket.com/post/data.aspx
      //  Product: Installment Loans US
      //  Campaign ID: 332180
      // ──────────────────────────────────────────────────────

      // LeadsMarket campaign credentials
      lm_campaignid:        process.env.LEADSMARKET_CAMPAIGN_ID  || "332180",
      lm_campaignKey:       process.env.LEADSMARKET_CAMPAIGN_KEY || "aa58e69c-7bb0-4d24-9d1e-57d78424b5c3",
      lm_leadtypeid:        process.env.LEADSMARKET_LEAD_TYPE_ID || "19",
      lm_responsetype:      process.env.LEADSMARKET_RESPONSE_TYPE || "json",

      // LeadsMarket hardcoded values
      lm_ResponseAsync:     "0",
      lm_FlexibleAmount:    "true",
      lm_AcceptedTerms:     "1",
      lm_SourceSubID:       "RadCred",

      // LeadsMarket test flag (blank for production)
      lm_TestResult:        process.env.LEADSMARKET_TEST_RESULT || "",

      // Personal (LeadsMarket naming)
      lm_FirstName:         body.first_name,
      lm_LastName:          body.last_name,
      lm_Email:             body.email,
      lm_PhoneHome:         mobilePhone,                   // 10 digits
      lm_PhoneWork:         workPhone,                     // 10 digits
      lm_DOB:               toYYYYSlash(body.date_birth),  // YYYY/MM/DD
      lm_SSN:               ssn,                           // 9 digits

      // Address (LeadsMarket naming)
      lm_Address1:          body.street,                   // 3-50 chars
      lm_State:             body.state,                    // 2 chars
      lm_ZipCode:           body.post_code,                // 5 digits
      lm_MonthsAtAddress:   String(monthsAtResidence),     // integer as string

      // Residence (LeadsMarket naming)
      lm_ResidenceType:     mapLMResidenceType(body.residence_type),  // Own / Rent
      lm_OwnHome:           mapLMBoolean(mapOwnHome(body.residence_type)),  // "true" / "false"

      // Loan (LeadsMarket naming)
      lm_RequestedAmount:   String(loanAmount),            // 100-50000

      // Employment (LeadsMarket naming — uppercase enums)
      lm_IncomeType:        mapLMIncomeType(body.income_source),       // EMPLOYMENT / SELFEMPLOYMENT / etc.
      lm_EmployerName:      body.company_name,                         // 1-128 chars
      lm_MonthsEmployed:    String(parseInt(body.months_at_employer || "12", 10)),
      lm_MonthlyIncome:     String(Math.round(monthlyIncomeRaw)),      // integer as string
      lm_AnnualIncome:      String(Math.round(monthlyIncomeRaw * 12)), // computed: monthly × 12
      lm_PayFrequency:      mapLMPayFrequency(body.pay_frequency),     // WEEKLY / BIWEEKLY / TWICEMONTHLY / MONTHLY
      lm_PayDate1:          toMMDDYYYY(body.next_pay_date),            // MM/DD/YYYY
      lm_DirectDeposit:     mapLMBoolean(mapDirectDeposit(body.income_payment_type)),  // "true" / "false"

      // Banking (LeadsMarket naming — uppercase account type)
      lm_BankName:          body.bank_name,                            // 2-50 chars
      lm_BankABA:           cleanedBankABA,                            // 9 digits
      lm_BankAccountNumber: cleanedBankAcct,                           // 4-30 chars
      lm_BankAccountType:   mapLMBankAccountType(body.bank_type),      // CHECKING / SAVINGS
      lm_MonthsAtBank:      String(parseInt(body.months_at_bank || "12", 10)),

      // Credit & Flags (LeadsMarket naming — string booleans)
      lm_Credit:              body.approximate_credit_score || "Fair",  // Excellent/Good/Fair/Poor
      lm_ActiveMilitary:      mapLMBoolean(body.military_active),      // "true" / "false"
      lm_OwnCar:              mapLMBoolean(body.own_car),              // "true" / "false"
      lm_DriversLicense:      cleanedDL,
      lm_DriversLicenseState: body.license_state,                      // 2 chars
      lm_BestTimeToCall:      body.best_time_to_call || "Anytime",     // Anytime/Morning/Afternoon/Evening

      // TCPA (LeadsMarket naming)
      lm_TCPAConsentText:   tcpaText,

      // Client info (LeadsMarket naming)
      lm_clientIP:          ip,
      lm_clientUserAgent:   userAgent,
      lm_clientUrl:         websiteRef,
    };

    // ══════════════════════════════════════════════════════════
    //  SEND TO LEADPROSPER ONLY
    // ══════════════════════════════════════════════════════════

    const lpUrl = process.env.LP_DIRECT_POST_URL || "https://api.leadprosper.io/direct_post";

    console.log("═══════════════════════════════════════════");
    console.log("[submit-lead] Sending to LeadProsper →", lpUrl);
    console.log("[submit-lead] Payload fields:", Object.keys(payload).length);

    const lpResponse = await axios.post(lpUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    const lpData = lpResponse.data;

    console.log("[LeadProsper] Status:", lpResponse.status);
    console.log("[LeadProsper] Response:", JSON.stringify(lpData, null, 2));
    console.log("═══════════════════════════════════════════");

    // ── Check LeadProsper response ──────────────────────────
    //
    // LeadProsper response codes:
    //   status: "ACCEPTED", code: 0  → buyer accepted the lead
    //   status: "ERROR",    code: 1006 → lead received but buyer rejected
    //   status: "ERROR",    code: other → real error (bad fields, etc.)
    //
    // IMPORTANT: If LeadProsper gave us a lead_id, the lead WAS
    // received and stored. Buyer rejection (1006) is a backend/
    // business concern — the END USER should always see success
    // as long as LeadProsper ingested the lead.
    // ─────────────────────────────────────────────────────────

    const hasLeadId = !!(lpData?.lead_id || lpData?.id);
    const isAccepted = lpData?.status === "ACCEPTED" || lpData?.code === 0;

    // Log buyer rejection for admin, but don't fail the user
    if (!isAccepted && hasLeadId) {
      console.warn(
        "[LeadProsper] Lead received but buyer rejected →",
        `code: ${lpData?.code}, message: ${lpData?.message}`
      );
    }

    // If LeadProsper received the lead (has lead_id) → success for user
    if (hasLeadId) {
      return NextResponse.json({
        success: true,
        message: "Application submitted successfully! We will contact you soon.",
        data: {
          lead_id: lpData?.lead_id || lpData?.id || null,
          redirect_url: lpData?.redirect || lpData?.redirect_url || null,
        },
      });
    }

    // Only show error to user if LeadProsper truly failed to ingest
    // (no lead_id = validation error, missing fields, bad campaign, etc.)
    const errorMsg =
      lpData?.message ||
      "Something went wrong. Please verify your information and try again.";
    console.error("[LeadProsper] Real failure (no lead_id):", errorMsg);

    return NextResponse.json({
      success: false,
      message: errorMsg,
      data: lpData,
    }, { status: 422 });

  } catch (error) {
    console.error("[submit-lead] Error:", error?.response?.data || error.message);

    const statusCode = error?.response?.status || 500;
    const errorData = error?.response?.data;
    const errorMsg =
      errorData?.message ||
      error.message ||
      "Something went wrong. Please try again.";

    return NextResponse.json({
      success: false,
      message: errorMsg,
      error: errorData || { message: errorMsg },
    }, { status: statusCode });
  }
}