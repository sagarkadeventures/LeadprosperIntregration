import { NextResponse } from "next/server";
import { getUsersCollection, signToken, isEmailInLeads, checkPasswordStrength } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const { email, password, newPassword, confirmPassword, action } = await request.json();

    const col = await getUsersCollection();

    // ── REGISTER / SET PASSWORD ───────────────────────────
    if (action === "set_password") {
      // Check email exists in leads collection
      const exists = await isEmailInLeads(email);
      if (!exists) {
        return NextResponse.json(
          { error: "Email not found in our records. Please apply for a loan first." },
          { status: 403 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
      }

      const { strong } = checkPasswordStrength(newPassword);
      if (!strong) {
        return NextResponse.json({ error: "Password is not strong enough." }, { status: 400 });
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await col.updateOne(
        { email: email.toLowerCase() },
        { $set: { email: email.toLowerCase(), password: hashed, updated_at: new Date() } },
        { upsert: true }
      );

      const token = await signToken({ email: email.toLowerCase() });
      const response = NextResponse.json({ success: true });
      response.cookies.set("rc_token", token, {
        httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    // ── LOGIN ─────────────────────────────────────────────
    if (action === "login") {
      const user = await col.findOne({ email: email.toLowerCase() });

      // No account yet → show register/set password screen
      if (!user || !user.password) {
        // First check if email exists in leads
        const exists = await isEmailInLeads(email);
        if (!exists) {
          return NextResponse.json(
            { error: "Email not found in our records. Please apply for a loan first." },
            { status: 403 }
          );
        }
        return NextResponse.json({ needsPassword: true });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
      }

      const token = await signToken({ email: email.toLowerCase() });
      const response = NextResponse.json({ success: true });
      response.cookies.set("rc_token", token, {
        httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    // ── LOGOUT ────────────────────────────────────────────
    if (action === "logout") {
      const response = NextResponse.json({ success: true });
      response.cookies.delete("rc_token");
      return response;
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });

  } catch (err) {
    console.error("[Auth]", err.message);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}