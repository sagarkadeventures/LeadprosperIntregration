"use client";

import React, { useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { INITIAL_FORM_DATA, STEP_LABELS } from "../lib/constants";
import { validateStep } from "../lib/validation";
import StepPersonal from "./StepPersonal";
import StepAddress from "./StepAddress";
import StepFinancial from "./StepFinancial";
import StepBanking from "./StepBanking";
import StepFinal from "./StepFinal";

const TOTAL_STEPS = STEP_LABELS.length;

// Fallback redirect — when no buyer redirect_url (duplicates, timeouts, errors)
const FALLBACK_REDIRECT_URL =
  "https://afflat3d3.com/trk/lnk/786BE43A-66BF-4957-B2D1-CEF4DF250208/?o=15451&c=918273&a=516670&k=340953338760B4DF749BD4BFBB0C1B83&l=17035&s1=radcredapplynow";

// Processing messages shown while waiting for LP response
const PROCESSING_MESSAGES = [
  "Submitting your application...",
  "Searching for the best lenders...",
  "Matching you with available offers...",
  "Reviewing your information...",
  "Almost there, finding the best rate...",
  "Checking lender availability...",
  "Finalizing your matches...",
];

export default function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [processingMsg, setProcessingMsg] = useState("");

  // ── Field change handler ─────────────────────────────────
  const handleChange = useCallback(
    (name, value) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (errors[name]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    },
    [errors]
  );

  // ── Redirect helper ──────────────────────────────────────
  // Uses real anchor click — cannot be intercepted by Next.js dev router,
  // browser popup policy, or any JS framework.
  // In iframe: breaks out to parent via window.top
  const redirectUser = (url) => {
    console.log("[redirectUser] Redirecting to:", url);
    // ✅ Anchor click with target="_top" works in ALL cases:
    //    - standalone / localhost
    //    - iframe with allow="top-navigation"
    // window.top.location.href is silently blocked by modern browsers
    // without throwing an error, so try/catch does NOT help.
    // Anchor click is the correct way to use the top-navigation permission.
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_top";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      window.location.href = url;
    }
  };

  // ── Navigation ───────────────────────────────────────────
  const goNext = () => {
    const stepErrors = validateStep(currentStep, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      const firstField = Object.keys(stepErrors)[0];
      const el = document.querySelector(`[name="${firstField}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setErrors({});
    setCurrentStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validate final step
    const stepErrors = validateStep(currentStep, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      const firstField = Object.keys(stepErrors)[0];
      const el = document.querySelector(`[name="${firstField}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    setProcessingMsg(PROCESSING_MESSAGES[0]);

    // Rotate processing messages every 8 seconds
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % PROCESSING_MESSAGES.length;
      setProcessingMsg(PROCESSING_MESSAGES[msgIndex]);
    }, 8000);

    try {
      const res = await axios.post("/api/submit-lead", formData, {
        headers: { "Content-Type": "application/json" },
        timeout: 310000, // 310s — must exceed backend maxDuration (300s)
      });

      clearInterval(msgInterval);
      setApiResponse(res.data);

      const redirectUrl = res.data?.data?.redirect_url;
      const lpStatus    = res.data?.data?.lp_status;

      // CASE 0: LP returned ERROR (bad field/invalid data) → show error to user
      // if (lpStatus === "ERROR") {
      //   setSubmitting(false);
      //   toast.error(
      //     "We could not process your application. Please check your information and try again.",
      //     { duration: 6000 }
      //   );
      //   return;
      // }
      if (lpStatus === "ERROR") {
  setProcessingMsg("Application submitted! Redirecting...");
  setTimeout(() => redirectUser(FALLBACK_REDIRECT_URL), 500);
  return;
}

      // CASE 1: Buyer returned redirect URL → go to lender
      if (redirectUrl) {
        setProcessingMsg("Application approved! Redirecting to your lender...");
        setTimeout(() => redirectUser(redirectUrl), 500);
        return;
      }

      // CASE 2: No redirect URL (duplicate, rejected, no buyer) → fallback
      setProcessingMsg("Application submitted! Redirecting...");
      setTimeout(() => redirectUser(FALLBACK_REDIRECT_URL), 500);

    } catch (err) {
      clearInterval(msgInterval);
      console.error("Submission error:", err);

      // CASE 3: Timeout or network error → redirect to fallback
      // Lead was likely received by LP even if we timed out
      setProcessingMsg("Application submitted! Redirecting...");
      setTimeout(() => redirectUser(FALLBACK_REDIRECT_URL), 1000);
    }
    // Note: we do NOT set submitting=false — user is being redirected
  };

  // ── Processing overlay ───────────────────────────────────
  if (submitting) {
    return (
      <div className="animate-fade-in-up flex flex-col items-center justify-center py-16 px-4">
        {/* Spinning loader */}
        <div className="relative mb-8">
          <div className="h-20 w-20 rounded-full border-4 border-gray-200"></div>
          <div className="absolute top-0 left-0 h-20 w-20 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
        </div>

        {/* Processing message */}
        <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl text-center mb-3">
          Finding Your Best Offer
        </h2>
        <p className="text-sm text-gray-600 text-center max-w-sm animate-pulse">
          {processingMsg}
        </p>

        {/* Progress dots */}
        <div className="flex gap-2 mt-6">
          <div className="h-2 w-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="h-2 w-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="h-2 w-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>

        {/* Reassurance text */}
        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50/60 px-6 py-4 text-center text-sm text-blue-700 max-w-sm">
          <p>🔒 Your information is encrypted and secure.</p>
          <p className="mt-1">Please do not close this window.</p>
        </div>
      </div>
    );
  }

  // ── Success screen (only if redirect somehow fails) ──────
  if (submitted) {
    return (
      <div className="animate-fade-in-up text-center py-8">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
          Application Submitted Successfully!
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-gray-600">
          Thank you, <span className="font-semibold text-gray-900">{formData.first_name}</span>!
          Your loan application has been received and is being reviewed.
        </p>
        <p className="mx-auto mt-2 max-w-md text-base text-gray-600">
          A representative will <span className="font-semibold text-primary-600">contact you soon</span> to
          discuss your options.
        </p>

        <div className="mx-auto mt-8 max-w-sm rounded-xl border border-blue-100 bg-blue-50/60 px-6 py-4 text-left text-sm text-blue-800">
          <p className="font-semibold mb-1">📞 What happens next?</p>
          <ul className="space-y-1 text-blue-700">
            <li>• We are matching you with the best available lender</li>
            <li>• Expect a call or email within 24 hours</li>
            <li>• Have your ID ready for verification</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setApiResponse(null);
            setFormData({ ...INITIAL_FORM_DATA });
            setCurrentStep(0);
          }}
          className="mt-8 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
        >
          Submit Another Application
        </button>
      </div>
    );
  }

  // ── Step content ─────────────────────────────────────────
  const stepComponents = [
    <StepPersonal key={0} data={formData} errors={errors} onChange={handleChange} />,
    <StepAddress key={1} data={formData} errors={errors} onChange={handleChange} />,
    <StepFinancial key={2} data={formData} errors={errors} onChange={handleChange} />,
    <StepBanking key={3} data={formData} errors={errors} onChange={handleChange} />,
    <StepFinal key={4} data={formData} errors={errors} onChange={handleChange} />,
  ];

  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const progressPct = ((currentStep + 1) / TOTAL_STEPS) * 100;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">APPLY FOR A LOAN</h1>
        <span className="text-sm font-medium text-gray-500">Step {currentStep + 1} of {TOTAL_STEPS}</span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Step labels (desktop) */}
      <div className="mb-8 hidden sm:flex">
        {STEP_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            disabled={i > currentStep}
            onClick={() => { if (i < currentStep) { setErrors({}); setCurrentStep(i); } }}
            className={`flex-1 py-2 text-center text-xs font-semibold transition-colors
              ${i === currentStep ? "text-primary-600" : i < currentStep ? "cursor-pointer text-primary-400 hover:text-primary-600" : "cursor-default text-gray-400"}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={(e) => { e.preventDefault(); isLastStep ? handleSubmit() : goNext(); }}>
        {stepComponents[currentStep]}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between gap-4">
          {currentStep > 0 ? (
            <button type="button" onClick={goBack} className="btn-press flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
          ) : <div />}

          <button
            type="submit"
            disabled={submitting}
            className={`btn-press flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white shadow-lg transition
              ${isLastStep ? "bg-green-600 shadow-green-600/25 hover:bg-green-700" : "bg-primary-500 shadow-primary-500/25 hover:bg-primary-600"}
              ${submitting ? "cursor-not-allowed opacity-70" : ""}
            `}
          >
            {isLastStep ? (
              <>
                Submit Application
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </>
            ) : (
              <>
                Next
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Security footer */}
      <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-center text-xs text-gray-500">
        🔒 Your information is encrypted and secure. By submitting this form, you consent to be contacted by lenders regarding your loan request and agree to our terms of service.
      </div>
    </div>
  );
}