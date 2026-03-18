import { NextResponse } from "next/server";
import axios from "axios";
import { MongoClient } from "mongodb";

// ═══════════════════════════════════════════════════════════════
//  Vercel serverless function config
// ═══════════════════════════════════════════════════════════════
export const maxDuration = 300;  // 300s — Vercel Pro required
export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  Fallback redirect URL
// ═══════════════════════════════════════════════════════════════
const FALLBACK_URL = "https://afflat3d3.com/trk/lnk/786BE43A-66BF-4957-B2D1-CEF4DF250208/?o=15451&c=918273&a=516670&k=340953338760B4DF749BD4BFBB0C1B83&l=17035&s1=radcredapplynow";

// ═══════════════════════════════════════════════════════════════
//  MongoDB — cached connection
// ═══════════════════════════════════════════════════════════════
let cachedClient = null;

async function getMongoClient() {
  if (cachedClient) return cachedClient;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI env variable is not set");
  const client = new MongoClient(uri, {
    serverApi: { version: "1", strict: true, deprecationErrors: true },
  });
  await client.connect();
  cachedClient = client;
  return client;
}

async function insertLead(leadDoc) {
  try {
    const client = await getMongoClient();
    const col = client.db("leadprosper").collection("leadprosper");
    const result = await col.insertOne(leadDoc);
    console.log("[MongoDB] Lead inserted →", result.insertedId.toString());
    return result.insertedId;
  } catch (err) {
    console.error("[MongoDB] Insert failed:", err.message);
    return null;
  }
}

async function updateLead(insertedId, update) {
  if (!insertedId) return;
  try {
    const client = await getMongoClient();
    const col = client.db("leadprosper").collection("leadprosper");
    await col.updateOne(
      { _id: insertedId },
      { $set: { ...update, updated_at: new Date() } }
    );
    console.log("[MongoDB] Lead updated →", insertedId.toString());
  } catch (err) {
    console.error("[MongoDB] Update failed:", err.message);
  }
}

function printDoc(doc, insertedId) {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                  MONGODB — DOCUMENT SAVED                   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("  InsertedId :", insertedId?.toString() ?? "—");
  console.log("  created_at :", doc.created_at?.toISOString());
  console.log("  status     :", doc.status);
  console.log("  lead_id    :", doc.lead_id    ?? "—");
  console.log("  redirect   :", doc.redirect_url ?? "—");
  console.log("  price      :", doc.price      ?? "—");
  console.log("  ─── Applicant ───────────────────────────────────────────────");
  console.log("  Name       :", doc.first_name, doc.last_name);
  console.log("  Email      :", doc.email);
  console.log("  Phone      :", doc.phone);
  console.log("  DOB        :", doc.lead_payload?.date_of_birth);
  console.log("  State      :", doc.state, "| Zip:", doc.lead_payload?.zip_code);
  console.log("  City       :", doc.city);
  console.log("  Address    :", doc.lead_payload?.address);
  console.log("  Residence  :", doc.lead_payload?.residence_type);
  console.log("  ─── Financial ───────────────────────────────────────────────");
  console.log("  Loan Amt   :", doc.loan_amount);
  console.log("  Income     :", doc.lead_payload?.monthly_income);
  console.log("  Income Src :", doc.lead_payload?.income_source);
  console.log("  Pay Freq   :", doc.lead_payload?.pay_frequency);
  console.log("  Pay Type   :", doc.lead_payload?.income_payment_type);
  console.log("  Next Pay   :", doc.lead_payload?.next_pay_date);
  console.log("  2nd Pay    :", doc.lead_payload?.second_pay_date);
  console.log("  Employer   :", doc.lead_payload?.company_name);
  console.log("  Job Title  :", doc.lead_payload?.job_title);
  console.log("  Credit     :", doc.lead_payload?.approximate_credit_score);
  console.log("  ─── Banking ─────────────────────────────────────────────────");
  console.log("  Bank Name  :", doc.lead_payload?.bank_name);
  console.log("  Bank Type  :", doc.lead_payload?.bank_type);
  const aba  = doc.lead_payload?.bank_aba?.toString()            || "";
  const acct = doc.lead_payload?.bank_account_number?.toString() || "";
  console.log("  ABA        :", aba  ? aba.slice(0, 3)  + "******" : "—");
  console.log("  Acct       :", acct ? "****" + acct.slice(-4)     : "—");
  console.log("  ─── LP Response ─────────────────────────────────────────────");
  console.log("  Raw        :", JSON.stringify(doc.lp_raw_response ?? {}));
  if (doc.error_message) console.log("  Error      :", doc.error_message);
  console.log("════════════════════════════════════════════════════════════════\n");
}

// ═══════════════════════════════════════════════════════════════
//  POST /api/submit-lead
// ═══════════════════════════════════════════════════════════════
export async function POST(request) {
  // ── Parse body ONCE — shared by try AND catch ─────────────
  let body = {};
  try { body = await request.json(); }
  catch { console.error("[submit-lead] Failed to parse request body"); }

  // ── IP Detection ─────────────────────────────────────────
  const rawIp =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()        ||
    request.headers.get("x-real-ip")                                     ||
    request.headers.get("cf-connecting-ip")                              ||
    "0.0.0.0";
 

  const ip =
  rawIp === "::1" || rawIp === "127.0.0.1" || rawIp === "0.0.0.0"
    ? "72.43.128.55" : rawIp.replace(/\s/g, "");  // ✅ strip spaces

  const userAgent = request.headers.get("user-agent") || "Unknown Browser";

  // ── Clean inputs ─────────────────────────────────────────
  const mobilePhone      = (body.mobile_phone             || "").replace(/\D/g, "");
  const workPhone        = (body.work_phone               || "").replace(/\D/g, "") || mobilePhone;
  const ssn              = (body.social_security_number   || "").replace(/\D/g, "").padStart(9, "0");
  const cleanedDL        = (body.driver_license_number    || "").trim().padStart(4, "0");
  const cleanedABA       = (body.bank_aba                 || "").replace(/\D/g, "").padStart(9, "0");
  const cleanedAcct      = (body.bank_account_number      || "").replace(/\D/g, "").padStart(4, "0");
  const loanAmount       = parseInt((body.loan_amount     || "0").replace(/,/g, ""), 10);
  // ADD after clean inputs:
const zipCode = (body.post_code || "").replace(/[^0-9]/g, "").slice(0, 5);
  const monthlyIncomeRaw = parseFloat((body.monthly_income|| "0").replace(/,/g, ""));

  // ── income_source mapping ─────────────────────────────────
  const incomeSourceMap = {
    "Employment":           "Employment",
    "Full Time Employed":   "Employment",
    "Part Time Employed":   "Employment",
    "Temporary Employed":   "Employment",
    "Self Employed":        "Self Employed",
    "Benefits":             "Benefits",
    "Disability Benefits":  "Benefits",
    "Unemployment":         "Unemployment",
    "Currently Unemployed": "Unemployment",
  };
  const incomeSource = incomeSourceMap[body.income_source] || "Employment";

  // ── Computed dates ────────────────────────────────────────
  const yearsBack = parseInt(body.years_at_address   || "0",  10);
  const moveDate  = new Date();
  moveDate.setFullYear(moveDate.getFullYear() - yearsBack);
  const moveHereDate = moveDate.toISOString().split("T")[0];

  const monthsBack = parseInt(body.months_at_bank    || "12", 10);
  const bankDate   = new Date();
  bankDate.setMonth(bankDate.getMonth() - monthsBack);
  const bankStart  = bankDate.toISOString().split("T")[0];

  const empMonths  = parseInt(body.months_at_employer || "12", 10);
  const empDate    = new Date();
  empDate.setMonth(empDate.getMonth() - empMonths);
  const employmentStarted = empDate.toISOString().split("T")[0];

  // ── Future pay dates ──────────────────────────────────────
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
  const freq = body.pay_frequency || "";
  if (freq === "Monthly") {
    d.setMonth(d.getMonth() + 1);        // ✅ +1 month for Monthly
  } else if (freq === "Twice Monthly") {
    d.setDate(d.getDate() + 15);         // ✅ +15 days for Twice Monthly
  } else {
    d.setDate(d.getDate() + 14);         // ✅ +14 days for Weekly/BiWeekly
  }
  secondPayDate = d.toISOString().split("T")[0];
}
  const websiteRef = process.env.WEBSITE_REF || "https://radcred.com/";
  const tcpaText   =
    process.env.TCPA_CONSENT_TEXT ||
    "By clicking 'Submit' I agree by electronic signature to be contacted by RadCred through a live agent, artificial or prerecorded voice, and automated SMS text at my residential or cellular number, dialed manually or by autodialer, and by email. I agree to the Disclaimer, Privacy Policy and Terms of Use. I authorize RadCred and its partners to use autodialers, send SMS messages, or deliver prerecorded messages to my phone number. I understand consent is not required to obtain a loan.";

  // ══════════════════════════════════════════════════════════
  //  PAYLOAD — clean, no duplicate fields
  //  LP maps internally to each buyer's required format
  // ══════════════════════════════════════════════════════════
  const payload = {
    // ── LP credentials ──────────────────────────────────────
    lp_campaign_id: process.env.LP_CAMPAIGN_ID || "33006",
    lp_supplier_id: process.env.LP_SUPPLIER_ID || "105821",
    lp_key:         process.env.LP_KEY         || "z6yysnz7xflr0j",
    lp_action:      process.env.LP_ACTION      || "",
    lp_subid1:      body.lp_subid1 || "RadCred",
    lp_subid2:      body.lp_subid2 || "Website",

    // ── Personal ────────────────────────────────────────────
    first_name:           body.first_name,
    last_name:            body.last_name,
    email:                body.email,
    phone:                mobilePhone,
    date_of_birth:        body.date_birth,
    gender:               body.gender || "Other",
    title:                "Mr.",

    // ── Address ─────────────────────────────────────────────
    address:              body.street,
    city:                 body.city,
    state:                body.state,
    zip_code: zipCode,  // ✅ always 5 digits
    ip_address:           ip,
    user_agent:           userAgent,
    landing_page_url:     websiteRef,
    jornaya_leadid:       body.jornaya_leadid       || "",
    trustedform_cert_url: body.trustedform_cert_url || "",
    tcpa_text:            tcpaText,

    // ── Contact ─────────────────────────────────────────────
    mobile_phone:    mobilePhone,
    home_phone:      mobilePhone,
    work_phone:      workPhone,
    residence_type:  body.residence_type,
    move_here_date:  moveHereDate,

    // ── Employment & Income ──────────────────────────────────
    income_source:       incomeSource,
    company_name:        body.company_name,
    job_title:           body.job_title,
    employment_started:  employmentStarted,
    monthly_income:      monthlyIncomeRaw,
    income_payment_type: body.income_payment_type,
    next_pay_date:       nextPayDate,
    second_pay_date:     secondPayDate,
    pay_frequency:       body.pay_frequency,

    // ── Loan ────────────────────────────────────────────────
    loan_amount:              loanAmount,
    loan_reason:              body.loan_reason || "Other",       // ✅ ADD
    approximate_credit_score: body.approximate_credit_score || "Fair",
    own_car:                  body.own_car || "No",   // ✅ ADD THIS
    has_debit_card:           body.has_debit_card || "No",       // ✅ ADD
best_time_to_call:        body.best_time_to_call || "Anytime", // ✅ ADD


    // ── Identity ─────────────────────────────────────────────
    social_security_number: ssn,
    driver_license_number:  cleanedDL,
    driver_license_state:   body.license_state || body.state,  // ✅ ADD


    // ── Banking ──────────────────────────────────────────────
    bank_name:           body.bank_name,
    bank_aba:            cleanedABA,
    bank_account_number: cleanedAcct,
    bank_type:           body.bank_type,
    bank_start:          bankStart,

    // ── Compliance ───────────────────────────────────────────
    military_active: String(body.military_active || "0"),
    term_email:      "1",
    term_sms:        "1",
    ip:              ip,
    website:         websiteRef,
    aff_id:          process.env.LP_AFF_ID  || "5922",
    ckm_key:         process.env.LP_CKM_KEY || "ng2dp0YbGgp4",
    sub_aff:         "",
  };

  // ── Terminal: submission log ──────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║              LEAD SUBMISSION — LP CAMPAIGN DATA              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("  LP Campaign :", payload.lp_campaign_id, "| Supplier:", payload.lp_supplier_id);
  console.log("  SubID1      :", payload.lp_subid1, "| SubID2:", payload.lp_subid2);
  console.log("  Name        :", payload.first_name, payload.last_name);
  console.log("  Email       :", payload.email);
  console.log("  Phone       :", payload.phone);
  console.log("  DOB         :", payload.date_of_birth);
  console.log("  State       :", payload.state, "| Zip:", payload.zip_code);
  console.log("  Address     :", payload.address, payload.city);
  console.log("  Residence   :", payload.residence_type);
  console.log("  IP          :", payload.ip_address);
  console.log("  ─── Financial ───────────────────────────────────────────────");
  console.log("  Loan Amt    :", payload.loan_amount);
  console.log("  Income      :", payload.monthly_income);
  console.log("  Income Src  :", payload.income_source);
  console.log("  Pay Freq    :", payload.pay_frequency);
  console.log("  Pay Type    :", payload.income_payment_type);
  console.log("  Next Pay    :", payload.next_pay_date);
  console.log("  2nd Pay     :", payload.second_pay_date);
  console.log("  Employer    :", payload.company_name);
  console.log("  Job Title   :", payload.job_title);
  console.log("  Credit      :", payload.approximate_credit_score);
  console.log("  ─── Banking ─────────────────────────────────────────────────");
  console.log("  Bank Name   :", payload.bank_name);
  console.log("  Bank Type   :", payload.bank_type);
  console.log("  ABA         :", cleanedABA  ? cleanedABA.slice(0, 3)  + "******" : "MISSING!");
  console.log("  Acct        :", cleanedAcct ? "****" + cleanedAcct.slice(-4)      : "MISSING!");
  console.log("  SSN         :", ssn         ? "***"  + ssn.slice(-4)              : "MISSING!");
  console.log("  ─── Compliance ──────────────────────────────────────────────");
  console.log("  Jornaya     :", payload.jornaya_leadid       || "—");
  console.log("  TrustedForm :", payload.trustedform_cert_url || "—");
  console.log("  Military    :", payload.military_active);
  console.log("  Fields      :", Object.keys(payload).length);
  console.log("════════════════════════════════════════════════════════════════\n");

  // ══════════════════════════════════════════════════════════
  //  STEP 1 — SAVE TO MONGODB FIRST (before LP call)
  // ══════════════════════════════════════════════════════════
  const leadDoc = {
    created_at:      new Date(),
    source:          "radcred-form",
    lead_id:         null,
    status:          "PENDING",
    redirect_url:    null,
    price:           null,
    first_name:      payload.first_name,
    last_name:       payload.last_name,
    email:           payload.email,
    phone:           mobilePhone,
    state:           payload.state,
    city:            payload.city,
    loan_amount:     loanAmount,
    ip_address:      ip,
    lead_payload:    payload,
    lp_raw_response: null,
  };

  const insertedId = await insertLead(leadDoc);
  printDoc(leadDoc, insertedId);

  // ══════════════════════════════════════════════════════════
  //  STEP 2 — SEND TO LEADPROSPER
  // ══════════════════════════════════════════════════════════
  const lpUrl = process.env.LP_DIRECT_POST_URL || "https://api.leadprosper.io/direct_post";
  console.log("[submit-lead] Sending →", lpUrl);

  try {
    const lpResponse = await axios.post(lpUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 295000,
    });

    const lpData = lpResponse.data;
    console.log("[LP Response]", JSON.stringify(lpData, null, 2));

    // ── Parse LP response ────────────────────────────────────
    const hasLeadId    = !!(lpData?.lead_id || lpData?.id);
    const isAccepted   = lpData?.status === "ACCEPTED" || lpData?.code === 0;
    const isDuplicated =
      lpData?.status === "DUPLICATED" ||
      lpData?.code   === 1008         ||
      lpData?.code   === 1049;
    const isError      =
      lpData?.status === "ERROR" ||
      (lpData?.code && lpData?.code !== 0 && !isDuplicated);

    const redirectUrl =
      lpData?.redirect_url      ||
      lpData?.redirect          ||
      lpData?.RedirectURL       ||
      lpData?.data?.RedirectURL || null;

    const price =
      lpData?.price       ||
      lpData?.Price       ||
      lpData?.data?.Price || null;

    let finalStatus = "REJECTED";
    if (isDuplicated)                 finalStatus = "DUPLICATED";
    else if (isError)                 finalStatus = "ERROR";
    else if (hasLeadId || isAccepted) finalStatus = lpData?.status || "ACCEPTED";

    // ── ERROR — all buyers rejected ───────────────────────────
    if (isError) {
      await updateLead(insertedId, {
        lead_id:         lpData?.lead_id || lpData?.id || null,
        status:          "ERROR",
        redirect_url:    FALLBACK_URL,   // ✅ save fallback URL
        price:           null,
        lp_raw_response: lpData,
        lp_message:      lpData?.message || null,
      });

      console.log(`\n✅ MongoDB UPDATED — status: ERROR | redirect: ${FALLBACK_URL}\n`);

      return NextResponse.json({
        success: true,
        message: "Application submitted successfully!",
        data: {
          lead_id:      lpData?.lead_id || lpData?.id || null,
          lp_status:    "ERROR",
          lp_message:   lpData?.message || "Unknown error",
          redirect_url: FALLBACK_URL,    // ✅ send fallback to frontend
        },
      });
    }

    // ── DUPLICATED ────────────────────────────────────────────
    if (isDuplicated) {
      await updateLead(insertedId, {
        lead_id:         lpData?.lead_id || lpData?.id || null,
        status:          "DUPLICATED",
        redirect_url:    redirectUrl || FALLBACK_URL,  // ✅ fallback if no redirect
        price:           null,
        lp_raw_response: lpData,
        lp_message:      lpData?.message || null,
      });

      console.log(`\n✅ MongoDB UPDATED — status: DUPLICATED | redirect: ${redirectUrl || FALLBACK_URL}\n`);

      return NextResponse.json({
        success:   true,
        duplicate: true,
        message:   "Application submitted successfully!",
        data: {
          lead_id:      lpData?.lead_id || lpData?.id || null,
          lp_status:    "DUPLICATED",
          redirect_url: redirectUrl || FALLBACK_URL,
        },
      });
    }

    // ── ACCEPTED ──────────────────────────────────────────────
    if (hasLeadId || isAccepted) {
      await updateLead(insertedId, {
        lead_id:         lpData?.lead_id || lpData?.id || null,
        status:          lpData?.status || "ACCEPTED",
        redirect_url:    redirectUrl || FALLBACK_URL,  // ✅ fallback if no redirect
        price:           price,
        lp_raw_response: lpData,
        lp_message:      lpData?.message || null,
      });

      console.log(`\n✅ MongoDB UPDATED — status: ACCEPTED | redirect: ${redirectUrl || FALLBACK_URL} | price: ${price}\n`);

      return NextResponse.json({
        success: true,
        message: "Application submitted successfully!",
        data: {
          lead_id:      lpData?.lead_id || lpData?.id || null,
          redirect_url: redirectUrl || FALLBACK_URL,
          price:        price,
          lp_status:    lpData?.status || null,
        },
      });
    }

    // ── REJECTED ──────────────────────────────────────────────
    await updateLead(insertedId, {
      lead_id:         lpData?.lead_id || lpData?.id || null,
      status:          "REJECTED",
      redirect_url:    FALLBACK_URL,   // ✅ always fallback on rejection
      price:           null,
      lp_raw_response: lpData,
      lp_message:      lpData?.message || null,
    });

    console.log(`\n✅ MongoDB UPDATED — status: REJECTED | redirect: ${FALLBACK_URL}\n`);

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully!",
      data: {
        lead_id:      lpData?.lead_id || lpData?.id || null,
        lp_status:    "REJECTED",
        redirect_url: FALLBACK_URL,    // ✅ fallback to frontend
      },
    });

  } catch (error) {
    const isTimeout =
      error.code === "ECONNABORTED" || error.message?.includes("timeout");

    console.error(`\n[submit-lead] ${isTimeout ? "TIMEOUT" : "ERROR"}:`, error.message);

    await updateLead(insertedId, {
      status:        isTimeout ? "TIMEOUT" : "ERROR",
      redirect_url:  null,             // null on timeout — LP never responded
      error_message: error.message,
    });

    console.log(`\n⚠️  MongoDB UPDATED — status: ${isTimeout ? "TIMEOUT" : "ERROR"}\n`);

    return NextResponse.json({
      success: true,
      timeout: isTimeout,
      message: "Application submitted successfully!",
      data: {
        lead_id:      null,
        lp_status:    isTimeout ? "TIMEOUT" : "ERROR",
        redirect_url: null,
      },
    });
  }
}