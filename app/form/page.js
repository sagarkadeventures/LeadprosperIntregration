// app/form/page.js
// Access at: http://localhost:3000/form
// Production: https://radcred.com/form

import MultiStepForm from "../components/MultiStepForm";

export const metadata = {
  title: "Apply for a Loan | RadCred",
  description: "Apply for a personal or installment loan. Fast approval, secure application.",
};

export default function FormPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Logo / Brand */}
        <div className="mb-8 text-center logo-top-section">
          <img
            src="/radcred-logo.png"
            alt="RadCred"
            className="mx-auto h-10 w-auto"
          />
          <img
            src="/radcred-bot.gif"
            alt=""
            className="mx-auto mt-2"
            style={{ width: "70px" }}
          />
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-white shadow-xl shadow-blue-100/50 border border-gray-100 p-6 sm:p-8">
          <MultiStepForm />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} RadCred. All rights reserved.
        </p>
      </div>
    </main>
  );
}