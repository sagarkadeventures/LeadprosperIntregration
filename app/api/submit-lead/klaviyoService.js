// app/api/submit-lead/klaviyoService.js
import axios from "axios";

const KLAVIYO_PRIVATE_KEY = process.env.KLAVIYO_PRIVATE_KEY || "pk_54e1768b846d819e1eaafee5d8c6ae169e";
const LIST_SOLD           = process.env.KLAVIYO_LIST_ID_SOLD     || "WgUpfq";
const LIST_REJECTED       = process.env.KLAVIYO_LIST_ID_REJECTED || "VNtnGd";
const BASE_URL            = "https://a.klaviyo.com/api";
const REVISION            = "2024-02-15";  // ✅ correct stable revision

const headers = {
  "Authorization": `Klaviyo-API-Key ${KLAVIYO_PRIVATE_KEY}`,
  "Content-Type":  "application/json",
  "Accept":        "application/json",
  "revision":      REVISION,
};

async function createOrUpdateProfile(payload) {
  const phone = payload.phone
    ? (payload.phone.startsWith("+") ? payload.phone : `+1${payload.phone}`)
    : null;

  const profilePayload = {
    data: {
      type: "profile",
      attributes: {
        email:      payload.email,
        first_name: payload.first_name,
        last_name:  payload.last_name,
        // ✅ Only include phone_number if exists — null causes Klaviyo validation error
        ...(phone && { phone_number: phone }),
        properties: {
          Address:         payload.address,
          City:            payload.city,
          State:           payload.state,
          ZipCode:         payload.zip_code,
          ResidenceType:   payload.residence_type,
          RequestedAmount: payload.loan_amount,
          MonthlyIncome:   payload.monthly_income,
          IncomeType:      payload.income_source,
          LoanReason:      payload.loan_reason,
          CreditRating:    payload.approximate_credit_score,
          EmployerName:    payload.company_name,
          JobTitle:        payload.job_title,
          PayFrequency:    payload.pay_frequency,
          BankName:        payload.bank_name,
          BankAccountType: payload.bank_type,
          OwnCar:          payload.own_car,
          DebitCard:       payload.has_debit_card,
          BestTimeToCall:  payload.best_time_to_call,
          ActiveMilitary:  payload.military_active,
          DOB:             payload.date_of_birth,
          LP_Status:       payload.lp_status,
          LP_LeadID:       payload.lead_id,
          LP_Price:        payload.price,
          Source:          "RadCred Form",
          ClientIP:        payload.ip_address,
          CreatedAt:       new Date().toISOString(),
        },
      },
    },
  };

  const res = await axios.post(`${BASE_URL}/profile-import/`, profilePayload, { headers });
  return res.data.data.id;
}

async function addToList(profileId, listId) {
  await axios.post(
    `${BASE_URL}/lists/${listId}/relationships/profiles`,
    { data: [{ type: "profile", id: profileId }] },
    { headers }
  );
}

export async function syncToKlaviyo(payload, status = "rejected") {
  try {
    const listId    = status === "accepted" ? LIST_SOLD : LIST_REJECTED;
    const profileId = await createOrUpdateProfile(payload);
    await addToList(profileId, listId);
    console.log(`[Klaviyo] ✅ Synced to ${status} list (${listId}) — Profile: ${profileId}`);
    return { success: true, profileId };
  } catch (err) {
    console.error("[Klaviyo] ❌ Sync failed:", err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}