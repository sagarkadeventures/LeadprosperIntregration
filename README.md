# LeadProsper Multi-Step Loan Application Form

Next.js + React (JavaScript) multi-step loan form integrated with **LeadProsper Direct Post API** and PDV Portal buyer (RoundSky/LeadStackMedia).

## Features

- **5-Step Form**: Personal → Address → Financial → Banking → Final
- **LeadProsper Direct Post** → `https://api.leadprosper.io/direct_post`
- **PDV Portal Buyer** – RoundSky `aff_id` / `ckm_key` included in payload
- **Date Pickers** – `react-datepicker` for DOB, pay dates, employment dates
- **Per-step validation** with inline error messages
- **Tailwind CSS** – fully responsive
- **Axios** – all HTTP requests
- **Toast notifications** via `react-hot-toast`
- **Server-side API route** (`/api/submit-lead`) keeps credentials secure

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables (`.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_LP_CAMPAIGN_ID` | LeadProsper campaign ID |
| `NEXT_PUBLIC_LP_SUPPLIER_ID` | LeadProsper supplier ID |
| `NEXT_PUBLIC_LP_KEY` | LeadProsper API key |
| `LP_AFF_ID` | RoundSky affiliate ID |
| `LP_CKM_KEY` | RoundSky CKM key |
| `LP_DIRECT_POST_URL` | LeadProsper endpoint |
| `WEBSITE_REF` | Website reference |

## Testing

Set `lp_action: "test"` in `app/api/submit-lead/route.js` — remove before going live.

## Project Structure

```
app/
├── api/submit-lead/route.js     # Server-side API proxy
├── components/
│   ├── FormFields.js            # Reusable input/select/toggle/date
│   ├── MultiStepForm.js         # Form orchestrator
│   ├── StepPersonal.js          # Step 1
│   ├── StepAddress.js           # Step 2
│   ├── StepFinancial.js         # Step 3
│   ├── StepBanking.js           # Step 4
│   └── StepFinal.js             # Step 5
├── lib/
│   ├── constants.js             # Options & initial state
│   └── validation.js            # Per-step validation
├── globals.css
├── layout.js
└── page.js
```
