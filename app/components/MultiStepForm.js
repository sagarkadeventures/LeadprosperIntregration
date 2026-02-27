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

export default function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);

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
    const stepErrors = validateStep(currentStep, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post("/api/submit-lead", formData, {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      });
      setApiResponse(res.data);
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (err) {
      console.error("Submission error:", err);
      const responseData = err?.response?.data;
      const msg =
        responseData?.message ||
        responseData?.error?.message ||
        err.message ||
        "Something went wrong. Please try again.";
      toast.error(msg, { duration: 8000 });
      if (responseData) setApiResponse(responseData);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ───────────────────────────────────────
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
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                Submitting...
              </>
            ) : isLastStep ? (
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