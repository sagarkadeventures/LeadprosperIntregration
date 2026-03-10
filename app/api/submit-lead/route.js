import { NextResponse } from "next/server";
import axios from "axios";

// ═══════════════════════════════════════════════════════════════
//  POST /api/submit-lead
//
//  Sends form data to LeadProsper Direct Post.
//  LP handles ALL buyer transforms and routing.
//  We only send LP campaign fields in OUR format.
//
//  NO vendor-specific mapping needed:
//  - LP transforms Own → Home Owner (PDV)
//  - LP transforms Own → 1 (Xanadu)
//  - LP transforms YYYY-MM-DD → MM/DD/YYYY per buyer
//  - LP transforms Weekly → WEEKLY per buyer
// ═══════════════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const body = await request.json();

    // ── Server-side auto-detected ───────────────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "72.43.128.55"; // fallback US IP for local testing

    const userAgent =
      request.headers.get("user-agent") || "Unknown Browser";

    // ── Clean inputs ────────────────────────────────────────
    const mobilePhone = (body.mobile_phone || "").replace(/\D/g, "");
    const workPhone   = (body.work_phone || "").replace(/\D/g, "");
    const ssn         = (body.social_security_number || "").replace(/\D/g, "");
    const cleanedDL   = (body.driver_license_number || "").trim();
    const cleanedABA  = (body.bank_aba || "").replace(/\D/g, "");
    const cleanedAcct = (body.bank_account_number || "").replace(/\D/g, "");
    const loanAmount  = parseInt((body.loan_amount || "0").replace(/,/g, ""), 10);
    const monthlyIncomeRaw = parseFloat((body.monthly_income || "0").replace(/,/g, ""));

    // ── Computed dates (all YYYY-MM-DD — LP transforms per buyer) ──
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

    const websiteRef = process.env.WEBSITE_REF || "https://radcred.com/";

    const tcpaText = process.env.TCPA_CONSENT_TEXT ||
      "By clicking 'Submit' I agree by electronic signature to be contacted by RadCred through a live agent, artificial or prerecorded voice, and automated SMS text at my residential or cellular number, dialed manually or by autodialer, and by email. I agree to the Disclaimer, Privacy Policy and Terms of Use. I authorize RadCred and its partners to use autodialers, send SMS messages, or deliver prerecorded messages to my phone number. I understand consent is not required to obtain a loan.";

    // ══════════════════════════════════════════════════════════
    //  PAYLOAD — LP Campaign Fields ONLY
    //  No vendor-specific formatting. LP transforms per buyer.
    //  All dates: YYYY-MM-DD
    //  All values: exactly as our form collects them
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
      date_of_birth:        body.date_birth,                   // YYYY-MM-DD
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

      // ──── LP CAMPAIGN FIELDS ──────────────────────────────
      // Confirmed values with LP:
      //   residence_type:           Own, Rent, Other
      //   income_source:            Employment, Benefits, Self Employed, Unemployment, Currently Unemployed
      //   income_payment_type:      Direct Deposit, Check
      //   pay_frequency:            Weekly, Bi Weekly, Twice Monthly, Monthly
      //   approximate_credit_score: Excellent, Good, Fair, Poor, Unsure
      //   bank_type:                Checking, Savings
      //   All dates:                YYYY-MM-DD

      // Personal
      title:                "Mr.",
      date_birth:           body.date_birth,                   // YYYY-MM-DD
      mobile_phone:         mobilePhone,
      home_phone:           mobilePhone,

      // Address (house_number + street combined in one field)
      street:               body.street,
      post_code:            body.post_code,
      house_number:         "",
      residence_type:       body.residence_type,               // Own, Rent, Other
      move_here_date:       moveHereDate,                      // YYYY-MM-DD

      // Employment
      income_source:        body.income_source,                // Employment, Benefits, etc.
      company_name:         body.company_name,
      job_title:            body.job_title,
      work_phone:           workPhone,
      employment_started:   employmentStarted,                 // YYYY-MM-DD
      monthly_income:       monthlyIncomeRaw,
      income_payment_type:  body.income_payment_type,          // Direct Deposit, Check

      // Pay
      next_pay_date:        body.next_pay_date,                // YYYY-MM-DD
      second_pay_date:      body.second_pay_date,              // YYYY-MM-DD
      pay_frequency:        body.pay_frequency,                // Weekly, Bi Weekly, etc.

      // Loan
      loan_amount:          loanAmount,
      approximate_credit_score: body.approximate_credit_score || "",

      // Sensitive
      social_security_number: ssn,
      driver_license_number:  cleanedDL,

      // Banking
      bank_name:            body.bank_name,
      bank_aba:             cleanedABA,
      bank_account_number:  cleanedAcct,
      bank_type:            body.bank_type,                    // Checking, Savings
      bank_start:           bankStart,                         // YYYY-MM-DD

      // Flags
      military_active:      String(body.military_active || "0"),
      term_email:           "1",
      term_sms:             "1",

      // Source / PDV credentials
      ip:                   ip,
      website:              websiteRef,
      aff_id:               process.env.LP_AFF_ID  || "5922",
      ckm_key:              process.env.LP_CKM_KEY || "ng2dp0YbGgp4",
      sub_aff:              "",
    };

    // ══════════════════════════════════════════════════════════
    //  CONSOLE LOG
    // ══════════════════════════════════════════════════════════

    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║              LEAD SUBMISSION — LP CAMPAIGN DATA              ║");
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
    console.log("└─────────────────────────────────────────────────────────────\n");

    console.log("┌─── LP CAMPAIGN FIELDS (confirmed values) ──────────────────");
    console.log("│ residence_type:           ", payload.residence_type);
    console.log("│ income_source:            ", payload.income_source);
    console.log("│ income_payment_type:      ", payload.income_payment_type);
    console.log("│ pay_frequency:            ", payload.pay_frequency);
    console.log("│ approximate_credit_score: ", payload.approximate_credit_score);
    console.log("│ bank_type:                ", payload.bank_type);
    console.log("└─────────────────────────────────────────────────────────────\n");

    console.log("┌─── OTHER FIELDS ────────────────────────────────────────────");
    console.log("│ date_birth:         ", payload.date_birth);
    console.log("│ street:             ", payload.street);
    console.log("│ post_code:          ", payload.post_code);
    console.log("│ mobile_phone:       ", payload.mobile_phone);
    console.log("│ work_phone:         ", payload.work_phone);
    console.log("│ move_here_date:     ", payload.move_here_date);
    console.log("│ loan_amount:        ", payload.loan_amount);
    console.log("│ monthly_income:     ", payload.monthly_income);
    console.log("│ company_name:       ", payload.company_name);
    console.log("│ employment_started: ", payload.employment_started);
    console.log("│ next_pay_date:      ", payload.next_pay_date);
    console.log("│ second_pay_date:    ", payload.second_pay_date);
    console.log("│ SSN:                ", ssn ? "***" + ssn.slice(-4) : "missing");
    console.log("│ DL:                 ", payload.driver_license_number);
    console.log("│ bank_name:          ", payload.bank_name);
    console.log("│ bank_aba:           ", cleanedABA);
    console.log("│ bank_account:       ", cleanedAcct ? "***" + cleanedAcct.slice(-4) : "missing");
    console.log("│ bank_start:         ", payload.bank_start);
    console.log("│ military_active:    ", payload.military_active);
    console.log("│ aff_id:             ", payload.aff_id);
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