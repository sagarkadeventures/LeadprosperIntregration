import { NextResponse } from "next/server";
import axios from "axios";

// ═══════════════════════════════════════════════════════════════
//  FIELD-MAPPING HELPERS
//  Convert form values to vendor-compatible formats so
//  LeadProsper can route to ANY buyer
//  (PDV Portal, Xanadu/LeadCapsule, LeadsMarket)
// ═══════════════════════════════════════════════════════════════

// ── SHARED HELPERS ──────────────────────────────────────────

function computeMonthsAtResidence(yearsAtAddress) {
  const years = parseInt(yearsAtAddress || "0", 10);
  return Math.max(years * 12, 1);
}

// ── XANADU / LEADCAPSULE HELPERS ────────────────────────────

function toMMDDYYYY(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${m}/${d}/${y}`;
}

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

function mapIncomeType(incomeSource) {
  if ((incomeSource || "").startsWith("Employed")) return "Employed";
  return incomeSource || "Employed";
}

function mapOwnHome(residenceType) {
  const val = (residenceType || "").toLowerCase();
  if (val.includes("own") || val.includes("home")) return 1;
  return 0;
}

function mapDirectDeposit(paymentType) {
  return (paymentType || "").toLowerCase().includes("direct") ? 1 : 0;
}

function mapMilitary(val) {
  return String(val) === "1" ? "Yes" : "No";
}

function mapBankAccountType(bankType) {
  if ((bankType || "").toLowerCase().startsWith("s")) return "S";
  return "C";
}

// ── LEADSMARKET HELPERS ─────────────────────────────────────

/** YYYY-MM-DD → YYYY/MM/DD */
function toYYYYSlash(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${y}/${m}/${d}`;
}

/** → EMPLOYMENT | SELFEMPLOYMENT | BENEFITS | MILITARY | RETIREMENT | DISABILITY */
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

/** → WEEKLY | BIWEEKLY | TWICEMONTHLY | MONTHLY */
function mapLMPayFrequency(payFreq) {
  const val = (payFreq || "").toLowerCase();
  if (val.includes("twice") || val.includes("bi-monthly") || val.includes("semi")) return "TWICEMONTHLY";
  if (val.includes("bi") || val.includes("every other"))  return "BIWEEKLY";
  if (val.includes("month"))  return "MONTHLY";
  if (val.includes("week"))   return "WEEKLY";
  return "MONTHLY";
}

/** → CHECKING | SAVINGS */
function mapLMBankAccountType(bankType) {
  if ((bankType || "").toLowerCase().startsWith("s")) return "SAVINGS";
  return "CHECKING";
}

/** → "true" | "false" string */
function mapLMBoolean(val) {
  const v = String(val || "").toLowerCase();
  if (v === "1" || v === "yes" || v === "true") return "true";
  return "false";
}

/** → "Own" | "Rent" */
function mapLMResidenceType(residenceType) {
  const val = (residenceType || "").toLowerCase();
  if (val.includes("own") || val.includes("home")) return "Own";
  return "Rent";
}

// ═══════════════════════════════════════════════════════════════
//  POST /api/submit-lead
//
//  Form → LeadProsper Direct Post → LP routes to buyers
//
//  LeadsMarket Responses (through LeadProsper):
//    Result "1"         → Accepted (sold, redirect to RedirectURL)
//    Result "2"         → Rejected (try lower MinimumPrice)
//    Result "Duplicate" → Already processed, do NOT repost
//    Result "4"         → Errors (field validation failures)
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

    const loanAmount = parseInt((body.loan_amount || "0").replace(/,/g, ""), 10);
    const monthlyIncomeRaw = parseFloat((body.monthly_income || "0").replace(/,/g, ""));
    const ssn = (body.social_security_number || "").replace(/\D/g, "");
    const cleanedDL = (body.driver_license_number || "").replace(/\D/g, "");
    const cleanedBankABA = (body.bank_aba || "").replace(/\D/g, "");
    const cleanedBankAcct = (body.bank_account_number || "").replace(/\D/g, "");

    const websiteRef = process.env.WEBSITE_REF || "https://radcred.com/";

    const tcpaText = process.env.TCPA_CONSENT_TEXT ||
      "By clicking 'Submit' I agree by electronic signature to be contacted by RadCred through a live agent, artificial or prerecorded voice, and automated SMS text at my residential or cellular number, dialed manually or by autodialer, and by email. I agree to the Disclaimer, Privacy Policy and Terms of Use. I authorize RadCred and its partners to use autodialers, send SMS messages, or deliver prerecorded messages to my phone number. I understand consent is not required to obtain a loan.";

    // ══════════════════════════════════════════════════════════
    //  BUILD THE UNIFIED PAYLOAD
    //  ALL THREE vendors in one payload → LeadProsper routes
    // ══════════════════════════════════════════════════════════

    const payload = {

      // ──── LEADPROSPER REQUIRED ────────────────────────────
      lp_campaign_id: process.env.LP_CAMPAIGN_ID || "32840",
      lp_supplier_id: process.env.LP_SUPPLIER_ID || "105045",
      lp_key:         process.env.LP_KEY         || "ey77bp5jya7eny",
      lp_action:      process.env.LP_ACTION      || "",
      lp_subid1:      "",
      lp_subid2:      "",

      // ──── VENDOR 1 — PDV PORTAL ──────────────────────────
      first_name:          body.first_name,
      last_name:           body.last_name,
      email:               body.email,
      date_birth:          body.date_birth,
      mobile_phone:        mobilePhone,
      home_phone:          mobilePhone,
      title:               "Mr.",
      street:              body.street,
      city:                body.city,
      state:               body.state,
      post_code:           body.post_code,
      house_number:        "",
      residence_type:      body.residence_type,
      move_here_date:      moveHereDate,
      loan_amount:         loanAmount,
      income_source:       body.income_source,
      monthly_income:      monthlyIncomeRaw,
      income_payment_type: body.income_payment_type,
      company_name:        body.company_name,
      job_title:           body.job_title,
      work_phone:          workPhone,
      employment_started:  employmentStarted,
      months_at_employer:  parseInt(body.months_at_employer || "12", 10),
      next_pay_date:       body.next_pay_date,
      second_pay_date:     body.second_pay_date,
      pay_frequency:       body.pay_frequency,
      social_security_number: ssn,
      driver_license_number:  cleanedDL,
      license_state:          body.license_state,
      bank_name:           body.bank_name,
      bank_aba:            cleanedBankABA,
      bank_account_number: cleanedBankAcct,
      bank_type:           body.bank_type,
      bank_start:          bankStart,
      months_at_bank:      parseInt(body.months_at_bank || "12", 10),
      military_active:          parseInt(body.military_active || "0", 10),
      approximate_credit_score: body.approximate_credit_score || "",
      loan_reason:              body.loan_reason || "",
      own_car:                  body.own_car || "",
      has_debit_card:           body.has_debit_card || "",
      best_time_to_call:        body.best_time_to_call || "",
      term_email:               1,
      term_sms:                 1,
      aff_id:  process.env.LP_AFF_ID  || "5922",
      ckm_key: process.env.LP_CKM_KEY || "ng2dp0YbGgp4",
      sub_aff: "",
      ip,
      user_agent: userAgent,
      website:    websiteRef,
      tcpa_text:  tcpaText,

      // ──── VENDOR 2 — XANADU / LEADCAPSULE ────────────────
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
      IncomeType:           mapIncomeType(body.income_source),
      Employer:             body.company_name,
      PayFrequency:         body.pay_frequency,
      DirectDeposit:        mapDirectDeposit(body.income_payment_type),
      MonthsAtEmployer:     parseInt(body.months_at_employer || "12", 10),
      NextPayDate:          toMMDDYYYY(body.next_pay_date),
      SecondPayDate:        toMMDDYYYY(body.second_pay_date),
      MonthlyIncome:        mapMonthlyIncomeBucket(body.monthly_income),
      BankAccountType:      mapBankAccountType(body.bank_type),
      BankAccountName:      body.bank_name,
      BankAccountNumber:    cleanedBankAcct,
      BankRoutingNumber:    cleanedBankABA,
      MonthsAtResidence:    monthsAtResidence,
      MonthsWithBank:       parseInt(body.months_at_bank || "12", 10),
      LoanAmountRequest:    loanAmount,
      Loan_Reason:          body.loan_reason || "Other",
      CreditRating:         body.approximate_credit_score || "Fair",
      WorkPhone:            workPhone,
      IPAddress:            ip,
      UserAgent:            userAgent,
      subOne:               process.env.XANADU_SUB_ONE || "RadCred",
      subTwo:               process.env.XANADU_SUB_TWO || "Website",
      Source_URL:           websiteRef,

      // ──── VENDOR 3 — LEADSMARKET (lm_ prefixed) ──────────
      // Campaign credentials
      lm_campaignid:        process.env.LEADSMARKET_CAMPAIGN_ID  || "332180",
      lm_campaignKey:       process.env.LEADSMARKET_CAMPAIGN_KEY || "aa58e69c-7bb0-4d24-9d1e-57d78424b5c3",
      lm_leadtypeid:        process.env.LEADSMARKET_LEAD_TYPE_ID || "19",
      lm_responsetype:      process.env.LEADSMARKET_RESPONSE_TYPE || "json",
      // Hardcoded
      lm_ResponseAsync:     "0",
      lm_FlexibleAmount:    "true",
      lm_AcceptedTerms:     "1",
      lm_SourceSubID:       "RadCred",
      // Test flag (blank = production)
      lm_TestResult:        process.env.LEADSMARKET_TEST_RESULT || "",
      // Personal
      lm_FirstName:         body.first_name,
      lm_LastName:          body.last_name,
      lm_Email:             body.email,
      lm_PhoneHome:         mobilePhone,
      lm_PhoneWork:         workPhone,
      lm_DOB:               toYYYYSlash(body.date_birth),
      lm_SSN:               ssn,
      // Address
      lm_Address1:          body.street,
      lm_State:             body.state,
      lm_ZipCode:           body.post_code,
      lm_MonthsAtAddress:   String(monthsAtResidence),
      lm_ResidenceType:     mapLMResidenceType(body.residence_type),
      lm_OwnHome:           mapLMBoolean(mapOwnHome(body.residence_type)),
      // Loan
      lm_RequestedAmount:   String(loanAmount),
      // Employment
      lm_IncomeType:        mapLMIncomeType(body.income_source),
      lm_EmployerName:      body.company_name,
      lm_MonthsEmployed:    String(parseInt(body.months_at_employer || "12", 10)),
      lm_MonthlyIncome:     String(Math.round(monthlyIncomeRaw)),
      lm_AnnualIncome:      String(Math.round(monthlyIncomeRaw * 12)),
      lm_PayFrequency:      mapLMPayFrequency(body.pay_frequency),
      lm_PayDate1:          toMMDDYYYY(body.next_pay_date),
      lm_DirectDeposit:     mapLMBoolean(mapDirectDeposit(body.income_payment_type)),
      // Banking
      lm_BankName:          body.bank_name,
      lm_BankABA:           cleanedBankABA,
      lm_BankAccountNumber: cleanedBankAcct,
      lm_BankAccountType:   mapLMBankAccountType(body.bank_type),
      lm_MonthsAtBank:      String(parseInt(body.months_at_bank || "12", 10)),
      // Credit & Flags
      lm_Credit:              body.approximate_credit_score || "Fair",
      lm_ActiveMilitary:      mapLMBoolean(body.military_active),
      lm_OwnCar:              mapLMBoolean(body.own_car),
      lm_DriversLicense:      cleanedDL,
      lm_DriversLicenseState: body.license_state,
      lm_BestTimeToCall:      body.best_time_to_call || "Anytime",
      // TCPA
      lm_TCPAConsentText:   tcpaText,
      // Client info
      lm_clientIP:          ip,
      lm_clientUserAgent:   userAgent,
      lm_clientUrl:         websiteRef,
    };

    // ══════════════════════════════════════════════════════════
    //  SEND TO LEADPROSPER
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

    // ══════════════════════════════════════════════════════════
    //  PARSE RESPONSE
    //
    //  LeadProsper wraps buyer responses:
    //    status: "ACCEPTED" / code: 0     → buyer accepted
    //    status: "ERROR"    / code: 1006  → lead stored, buyer rejected
    //    status: "ERROR"    / code: other → real error
    //
    //  LeadsMarket buyer response (inside LP data):
    //    Result "1"         → Accepted  → has Price + RedirectURL
    //    Result "2"         → Rejected  → try lower MinimumPrice
    //    Result "Duplicate" → Duplicate → do NOT repost
    //    Result "4"         → Errors    → field validation failures
    //
    //  RULE: If LP gave us a lead_id → lead was stored.
    //        Show success to user regardless of buyer outcome.
    //        Log buyer details for admin.
    // ══════════════════════════════════════════════════════════

    const hasLeadId = !!(lpData?.lead_id || lpData?.id);
    const isAccepted = lpData?.status === "ACCEPTED" || lpData?.code === 0;

    // ── Extract buyer data from any vendor format ───────────
    const redirectUrl =
      lpData?.redirect_url ||
      lpData?.redirect ||
      lpData?.RedirectURL ||
      lpData?.data?.RedirectURL ||
      lpData?.data?.redirect_url ||
      null;

    const price =
      lpData?.price ||
      lpData?.Price ||
      lpData?.data?.Price ||
      lpData?.data?.price ||
      null;

    // LeadsMarket specific
    const lmResult =
      lpData?.Result ||
      lpData?.data?.Result ||
      null;

    const lmLeadId =
      lpData?.LeadID ||
      lpData?.data?.LeadID ||
      null;

    const lmErrors =
      lpData?.Errors?.Error ||
      lpData?.data?.Errors?.Error ||
      null;

    const lmMessage =
      lpData?.Messages?.Message ||
      lpData?.data?.Messages?.Message ||
      null;

    // ── Log buyer-level details for admin ────────────────────
    if (lmResult) {
      const lmResultMap = { "1": "Accepted", "2": "Rejected", "4": "Errors" };
      const label = lmResultMap[lmResult] || lmResult;
      console.log(`[LeadsMarket] Result: ${lmResult} (${label})`);
      if (lmResult === "1") {
        console.log(`[LeadsMarket] Price: ${price}, RedirectURL: ${redirectUrl}`);
      }
      if (lmResult === "2") {
        console.warn("[LeadsMarket] Rejected —", lmMessage || "try lower MinimumPrice");
      }
      if (lmResult === "Duplicate") {
        console.warn("[LeadsMarket] DUPLICATE — do NOT repost this lead");
      }
      if (lmResult === "4" && lmErrors) {
        console.error("[LeadsMarket] Field errors:", JSON.stringify(lmErrors));
      }
    }

    if (!isAccepted && hasLeadId) {
      console.warn(
        "[LeadProsper] Lead stored but buyer rejected →",
        `code: ${lpData?.code}, message: ${lpData?.message}`
      );
    }

    // ── SUCCESS: LP received the lead (has lead_id) ─────────
    if (hasLeadId || isAccepted) {
      return NextResponse.json({
        success: true,
        message: "Application submitted successfully! We will contact you soon.",
        data: {
          lead_id:      lpData?.lead_id || lpData?.id || lmLeadId || null,
          redirect_url: redirectUrl,
          price:        price,
          lp_status:    lpData?.status || null,
          buyer_result: lmResult,
        },
      });
    }

    // ── FAILURE: LP could not ingest the lead ───────────────
    const errorMsg =
      lpData?.message ||
      lmMessage ||
      "Something went wrong. Please verify your information and try again.";

    console.error("[LeadProsper] Real failure (no lead_id):", errorMsg);

    return NextResponse.json({
      success: false,
      message: errorMsg,
      data:   lpData,
      errors: lmErrors || null,
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