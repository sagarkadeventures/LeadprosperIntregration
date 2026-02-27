import { NextResponse } from "next/server";
import axios from "axios";

// ═══════════════════════════════════════════════════════════════
//  FIELD-MAPPING HELPERS
//  Convert form values to vendor-compatible formats so
//  LeadProsper can route to ANY buyer (PDV Portal, Xanadu, etc.)
// ═══════════════════════════════════════════════════════════════

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

/**
 * Compute MonthsAtResidence from years_at_address
 */
function computeMonthsAtResidence(yearsAtAddress) {
  const years = parseInt(yearsAtAddress || "0", 10);
  return Math.max(years * 12, 1);
}

// ═══════════════════════════════════════════════════════════════
//  POST /api/submit-lead
//
//  Receives form data → maps ALL fields for every vendor →
//  sends ONLY to LeadProsper Direct Post.
//  LeadProsper handles distribution to buyers
//  (PDV Portal, LeadCapsule/Xanadu, etc.)
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

    // Xanadu: MonthsAtResidence from years_at_address
    const monthsAtResidence = computeMonthsAtResidence(body.years_at_address);

    // Raw numeric values
    const loanAmount = parseInt((body.loan_amount || "0").replace(/,/g, ""), 10);
    const monthlyIncomeRaw = parseFloat((body.monthly_income || "0").replace(/,/g, ""));
    const ssn = (body.social_security_number || "").replace(/\D/g, "");

    // Website/source
    const websiteRef = process.env.WEBSITE_REF || "https://radcred.com/";

    // ══════════════════════════════════════════════════════════
    //  BUILD THE UNIFIED PAYLOAD
    //  Includes fields named for BOTH vendors so LeadProsper
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
      loan_amount:        loanAmount,
      income_source:      body.income_source,
      monthly_income:     monthlyIncomeRaw,
      income_payment_type: body.income_payment_type,     // "Direct Deposit" / "Check"
      company_name:       body.company_name,
      job_title:          body.job_title,
      work_phone:         workPhone,
      employment_started: employmentStarted,
      months_at_employer: parseInt(body.months_at_employer || "12", 10),
      next_pay_date:      body.next_pay_date,            // YYYY-MM-DD
      second_pay_date:    body.second_pay_date,          // YYYY-MM-DD
      pay_frequency:      body.pay_frequency,

      // Sensitive
      social_security_number: ssn,
      driver_license_number:  body.driver_license_number,
      license_state:          body.license_state,

      // Banking
      bank_name:           body.bank_name,
      bank_aba:            (body.bank_aba || "").replace(/\D/g, ""),
      bank_account_number: (body.bank_account_number || "").replace(/\D/g, ""),
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
      aff_id:  process.env.LP_AFF_ID  || "00192482",
      ckm_key: process.env.LP_CKM_KEY || "e271641XC1XJh",
      sub_aff: "",

      // Auto-detected
      ip,
      user_agent: userAgent,
      website:    websiteRef,

      // TCPA / Compliance
      tcpa_text:
        "By clicking 'Submit' I agree by electronic signature to be contacted by RadCred through a live agent, artificial or prerecorded voice, and automated SMS text at my residential or cellular number, dialed manually or by autodialer, and by email.",

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
      DriversLicenseNumber: body.driver_license_number,

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
      BankAccountNumber:   (body.bank_account_number || "").replace(/\D/g, ""),
      BankRoutingNumber:   (body.bank_aba || "").replace(/\D/g, ""),

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