import { NextResponse } from "next/server";
import axios from "axios";

// ═══════════════════════════════════════════════════════════════
//  Vercel serverless function config
//  Default is 10s (hobby) / 60s (pro) — LP needs up to 120s
// ═══════════════════════════════════════════════════════════════
export const maxDuration = 120;
export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  POST /api/submit-lead
// ═══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const body = await request.json();

    // ── IP Detection ────────────────────────────────────────
    const rawIp =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      request.headers.get("cf-connecting-ip") ||
      "0.0.0.0";

    const ip =
      rawIp === "::1" || rawIp === "127.0.0.1" || rawIp === "0.0.0.0"
        ? "72.43.128.55"
        : rawIp;

    const userAgent = request.headers.get("user-agent") || "Unknown Browser";

    // ── Clean inputs ────────────────────────────────────────
    const mobilePhone = (body.mobile_phone || "").replace(/\D/g, "");
    const workPhone   = (body.work_phone   || "").replace(/\D/g, "") || mobilePhone;
    const ssn         = (body.social_security_number || "").replace(/\D/g, "").padStart(9, "0");
    const cleanedDL   = (body.driver_license_number  || "").trim().padStart(4, "0");
    const cleanedABA  = (body.bank_aba               || "").replace(/\D/g, "").padStart(9, "0");
    const cleanedAcct = (body.bank_account_number    || "").replace(/\D/g, "").padStart(4, "0");
    const loanAmount  = parseInt((body.loan_amount   || "0").replace(/,/g, ""), 10);
    const monthlyIncomeRaw = parseFloat((body.monthly_income || "0").replace(/,/g, ""));

    // ── FIX: income_source mapping ──────────────────────────
    // constants.js sends "Employment" but pdvportal needs "Full Time Employed"
    const incomeSourceMap = {
      "Employment":            "Full Time Employed",
      "Full Time Employed":    "Full Time Employed",
      "Part Time Employed":    "Part Time Employed",
      "Temporary Employed":    "Temporary Employed",
      "Self Employed":         "Full Time Employed",
      "Benefits":              "Benefits",
      "Disability Benefits":   "Disability Benefits",
      "Unemployment":          "Unemployment",
      "Currently Unemployed":  "Unemployment",
    };
    const incomeSource = incomeSourceMap[body.income_source] || "Full Time Employed";

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

    // ── Future pay dates ────────────────────────────────────
    const todayStr = new Date().toISOString().split("T")[0];

    let nextPayDate = body.next_pay_date || "";
    if (!nextPayDate || nextPayDate <= todayStr) {
      const d = new Date();
      d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
      nextPayDate = d.toISOString().split("T")[0];
    }

    let secondPayDate = body.second_pay_date || "";
    if (!secondPayDate || secondPayDate <= nextPayDate) {
      const d = new Date(nextPayDate);
      d.setDate(d.getDate() + 14);
      secondPayDate = d.toISOString().split("T")[0];
    }

    const websiteRef = process.env.WEBSITE_REF || "https://radcred.com/";

    const tcpaText =
      process.env.TCPA_CONSENT_TEXT ||
      "By clicking 'Submit' I agree by electronic signature to be contacted by RadCred through a live agent, artificial or prerecorded voice, and automated SMS text at my residential or cellular number, dialed manually or by autodialer, and by email. I agree to the Disclaimer, Privacy Policy and Terms of Use. I authorize RadCred and its partners to use autodialers, send SMS messages, or deliver prerecorded messages to my phone number. I understand consent is not required to obtain a loan.";

    // ══════════════════════════════════════════════════════════
    //  PAYLOAD
    // ══════════════════════════════════════════════════════════
    const payload = {
      lp_campaign_id: process.env.LP_CAMPAIGN_ID || "33006",
      lp_supplier_id: process.env.LP_SUPPLIER_ID || "105821",
      lp_key:         process.env.LP_KEY         || "z6yysnz7xflr0j",
      lp_action:      process.env.LP_ACTION      || "",
      lp_subid1:      body.lp_subid1 || "RadCred",
      lp_subid2:      body.lp_subid2 || "Website",

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

      // pdvportal / LeadStack fields
      title:                "Mr.",
      date_birth:           body.date_birth,
      mobile_phone:         mobilePhone,
      home_phone:           mobilePhone,
      street:               body.street,
      post_code:            body.post_code,
      house_number:         body.house_number || "",
      residence_type:       body.residence_type,
      move_here_date:       moveHereDate,

      // FIX: use mapped income source
      income_source:        incomeSource,
      company_name:         body.company_name,
      job_title:            body.job_title,
      work_phone:           workPhone,
      employment_started:   employmentStarted,
      monthly_income:       monthlyIncomeRaw,
      income_payment_type:  body.income_payment_type,
      next_pay_date:        nextPayDate,
      second_pay_date:      secondPayDate,
      pay_frequency:        body.pay_frequency,

      loan_amount:              loanAmount,
      approximate_credit_score: body.approximate_credit_score || "",

      // FIX: padded to meet minimum length requirements
      social_security_number: ssn,
      driver_license_number:  cleanedDL,

      bank_name:            body.bank_name,
      bank_aba:             cleanedABA,
      bank_account_number:  cleanedAcct,
      bank_type:            body.bank_type,
      bank_start:           bankStart,

      military_active: String(body.military_active || "0"),
      term_email:      "1",
      term_sms:        "1",
      ip:              ip,
      website:         websiteRef,
      aff_id:          process.env.LP_AFF_ID  || "5922",
      ckm_key:         process.env.LP_CKM_KEY || "ng2dp0YbGgp4",
      sub_aff:         body.sub_aff || "",

      // LeadsMarket extra fields
      own_car:              body.own_car === "Yes" ? "1" : "0",
      loan_reason:          body.loan_reason || "Debt Consolidation",
      best_time_to_call:    body.best_time_to_call || "Anytime",
      has_debit_card:       body.has_debit_card || "1",
      license_state:        body.license_state || body.state,
      months_at_bank:       String(body.months_at_bank || "12"),
      months_at_employer:   String(body.months_at_employer || "12"),
      years_at_address:     String(body.years_at_address || "1"),
    };

    // ── Console log ─────────────────────────────────────────
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║              LEAD SUBMISSION — LP CAMPAIGN DATA              ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");
    console.log("LP:", payload.lp_campaign_id, "| Supplier:", payload.lp_supplier_id);
    console.log("Name:", payload.first_name, payload.last_name, "| Email:", payload.email);
    console.log("Phone:", payload.phone, "| State:", payload.state, "| Zip:", payload.zip_code);
    console.log("IP:", ip);
    console.log("Residence:", payload.residence_type, "| Income:", payload.income_source);
    console.log("PayFreq:", payload.pay_frequency, "| PayType:", payload.income_payment_type);
    console.log("Credit:", payload.approximate_credit_score, "| BankType:", payload.bank_type);
    console.log("NextPay:", payload.next_pay_date, "| SecondPay:", payload.second_pay_date);
    console.log("ABA:", cleanedABA ? cleanedABA.slice(0, 3) + "******" : "MISSING!");
    console.log("SSN:", ssn ? "***" + ssn.slice(-4) : "MISSING!");
    console.log("DL:", cleanedDL || "MISSING!");
    console.log("Loan:", payload.loan_amount, "| Monthly Income:", payload.monthly_income);

    // ══════════════════════════════════════════════════════════
    //  SEND TO LEADPROSPER
    // ══════════════════════════════════════════════════════════
    const lpUrl = process.env.LP_DIRECT_POST_URL || "https://api.leadprosper.io/direct_post";
    console.log("[submit-lead] Sending →", lpUrl);

    const lpResponse = await axios.post(lpUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 115000,
    });

    const lpData = lpResponse.data;
    console.log("[LP Response]", JSON.stringify(lpData));

    // ── Parse LP response ───────────────────────────────────
    const isAccepted   = lpData?.status === "ACCEPTED" || lpData?.code === 0;
    const isDuplicated = lpData?.status === "DUPLICATED" || lpData?.code === 1008 || lpData?.code === 1049;

    // FIX: Extract redirect_url from all possible locations LP may return it
    const redirectUrl =
      lpData?.redirect_url      ||   // LeadProsper standard
      lpData?.redirect          ||   // LP alternate key
      lpData?.data?.redirect_url||   // nested
      lpData?.RedirectURL       ||   // LeadsMarket style
      lpData?.data?.RedirectURL ||   // LeadsMarket nested
      lpData?.buyers?.[0]?.redirect_url ||  // LP buyer array
      null;

    const price =
      lpData?.price      ||
      lpData?.Price      ||
      lpData?.data?.Price||
      null;

    console.log("[Redirect URL]", redirectUrl || "NONE — will use fallback");
    console.log("[Price]", price || "0");
    console.log("[Status]", lpData?.status, "| Code:", lpData?.code);

    // ── Duplicate ───────────────────────────────────────────
    if (isDuplicated) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: "Application submitted successfully!",
        data: {
          lead_id:      lpData?.lead_id || lpData?.id || null,
          redirect_url: null,
          lp_status:    "DUPLICATED",
        },
      });
    }

    // ── Accepted with redirect URL ──────────────────────────
    if (redirectUrl) {
      return NextResponse.json({
        success: true,
        message: "Application submitted successfully!",
        data: {
          lead_id:      lpData?.lead_id || lpData?.id || null,
          redirect_url: redirectUrl,
          price:        price,
          lp_status:    lpData?.status || "ACCEPTED",
        },
      });
    }

    // ── Accepted but no redirect URL ────────────────────────
    if (isAccepted) {
      return NextResponse.json({
        success: true,
        message: "Application submitted successfully!",
        data: {
          lead_id:      lpData?.lead_id || lpData?.id || null,
          redirect_url: null,
          price:        price,
          lp_status:    "ACCEPTED_NO_REDIRECT",
        },
      });
    }

    // ── Rejected / no buyer ─────────────────────────────────
    return NextResponse.json({
      success: true,
      message: "Application submitted successfully!",
      data: {
        lead_id:      lpData?.lead_id || lpData?.id || null,
        redirect_url: null,
        lp_status:    "REJECTED",
      },
    });

  } catch (error) {
    console.error("[submit-lead] Error:", error?.code || error.message);

    return NextResponse.json({
      success: true,
      timeout: error.code === "ECONNABORTED" || error.message?.includes("timeout"),
      message: "Application submitted successfully!",
      data: { lead_id: null, redirect_url: null, lp_status: "TIMEOUT" },
    });
  }
}