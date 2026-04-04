import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";


let cachedClient = null;
async function getClient() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export async function GET(request) {
  // ── Auth check ────────────────────────────────────────
  const token = cookies().get("rc_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const client = await getClient();
    const col = client.db("leadprosper").collection("leadprosper");

    const leads = await col
      .find({}, {
        projection: {
          created_at: 1, first_name: 1, last_name: 1,
          email: 1, phone: 1, state: 1, city: 1,
          loan_amount: 1, status: 1, price: 1,
          redirected_to: 1, lp_response_ms: 1,
          "lead_payload.bank_name": 1,
          "lead_payload.bank_type": 1,
          "lead_payload.income_source": 1,
          "lead_payload.monthly_income": 1,
          "lead_payload.pay_frequency": 1,
          "lead_payload.approximate_credit_score": 1,
        }
      })
      .sort({ created_at: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}