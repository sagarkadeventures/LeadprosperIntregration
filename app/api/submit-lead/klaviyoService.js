// app/lib/klaviyoService.js
import axios from "axios";

const KLAVIYO_PRIVATE_KEY = process.env.KLAVIYO_PRIVATE_KEY || "pk_54e1768b846d819e1eaafee5d8c6ae169e";
const LIST_SOLD     = process.env.KLAVIYO_LIST_ID_SOLD     || "WgUpfq";  // Accepted
const LIST_REJECTED = process.env.KLAVIYO_LIST_ID_REJECTED || "VNtnGd";  // Rejected/Error/Duplicate
const BASE_URL      = "https://a.klaviyo.com/api";
const REVISION      = "2025-10-15";

const headers = {
  "Authorization": `Klaviyo-API-Key ${KLAVIYO_PRIVATE_KEY}`,
  "Content-Type":  "application/json",
  "Accept":        "application/json",
  "revision":      REVISION,
};

// ── Step 1: Create or update Klaviyo profile ──────────────────
async function createOrUpdateProfile(payload) {
  const phone = payload.phone
    ? (payload.phone.startsWith("+") ? payload.phone : `+1${payload.phone}`)
    : null;

  const profilePayload = {
    data: {
      type: "profile",
      attributes: {
        email:        payload.email,
        phone_number: phone,
        first_name:   payload.first_name,
        last_name:    payload.last_name,
        properties: {
          // Address
          Address:          payload.address,
          City:             payload.city,
          State:            payload.state,
          ZipCode:          payload.zip_code,
          ResidenceType:    payload.residence_type,

          // Financial
          RequestedAmount:  payload.loan_amount,
          MonthlyIncome:    payload.monthly_income,
          IncomeType:       payload.income_source,
          LoanReason:       payload.loan_reason,
          CreditRating:     payload.approximate_credit_score,

          // Employment
          EmployerName:     payload.company_name,
          JobTitle:         payload.job_title,
          PayFrequency:     payload.pay_frequency,

          // Banking
          BankName:         payload.bank_name,
          BankAccountType:  payload.bank_type,

          // Additional
          OwnCar:           payload.own_car,
          DebitCard:        payload.has_debit_card,
          BestTimeToCall:   payload.best_time_to_call,
          ActiveMilitary:   payload.military_active,
          DOB:              payload.date_of_birth,

          // LP Status
          LP_Status:        payload.lp_status,
          LP_LeadID:        payload.lead_id,
          LP_Price:         payload.price,

          // Metadata
          Source:           "RadCred Form",
          ClientIP:         payload.ip_address,
          CreatedAt:        new Date().toISOString(),
        },
      },
    },
  };

  const res = await axios.post(`${BASE_URL}/profile-import/`, profilePayload, { headers });
  return res.data.data.id;
}

// ── Step 2: Add profile to list ───────────────────────────────
async function addToList(profileId, listId) {
  await axios.post(
    `${BASE_URL}/lists/${listId}/relationships/profiles`,
    { data: [{ type: "profile", id: profileId }] },
    { headers }
  );
}

// ── Main export: sync lead to Klaviyo ─────────────────────────
export async function syncToKlaviyo(payload, status = "rejected") {
  try {
    const listId   = status === "accepted" ? LIST_SOLD : LIST_REJECTED;
    const profileId = await createOrUpdateProfile(payload);
    await addToList(profileId, listId);
    console.log(`[Klaviyo] ✅ Synced to ${status} list (${listId}) — Profile: ${profileId}`);
    return { success: true, profileId };
  } catch (err) {
    console.error("[Klaviyo] ❌ Sync failed:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}