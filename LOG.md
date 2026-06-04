# Inpatient Insulin Dosing Assistant — Project Log

> This log documents the current state of the project before iterative improvements begin.
> Created: June 3, 2026

---

## Project Overview

A browser-based clinical decision support tool for subcutaneous insulin dosing on the general medicine inpatient service. Targeted at residents, interns, and attending physicians. All logic runs client-side — no data is transmitted or stored.

**Live URL:** https://xichongl.github.io/inpatient-insulin-calculator/

---

## Technology Stack (v2 — Refactored)

| Layer | Detail |
|-------|--------|
| Language | HTML5 + CSS3 + Vanilla JS (ES6) |
| Build | None — multi-file static app |
| Backend | None — fully client-side |
| Hosting | GitHub Pages |
| Dependencies | Zero external dependencies |
| Offline | Works offline after first page load |

---

## File Structure (v2)

```
vibe-coding-demo/
├── index.html          # HTML structure — slim, no inline CSS/JS
├── css/
│   └── styles.css      # All styles (extracted from monolithic file)
├── js/
│   ├── clinical.js     # Clinical engine — standalone, no DOM deps
│   ├── renderer.js     # Results page renderer
│   └── app.js          # UI logic, event handlers, validation, data collection
├── README.md           # Documentation, clinical references, deployment guide
├── LICENSE             # License file
└── LOG.md              # This file
```

---

## Application Architecture (v2)

### 1. UI / UX (v2 — Single-Page Layout)

- **Disclaimer Modal**: Full-screen overlay with checkbox consent; must be accepted before use
- **Sticky Header**: App title + icon, always visible
- **Single-Page Layout** (replaced 5-step wizard):
  - **Quick Start section** (always visible, green-bordered) — all *required* fields
  - **"Generate Recommendations"** button — prominent, appears twice (top + bottom)
  - **5 collapsible `<details>` sections** — all marked "Optional" with badges:
    1. 📐 Body & Labs — height (BMI), HbA1c
    2. 🩺 Clinical Context — renal function, steroids, infection, IV transition, hypo risk
    3. 💊 Home Regimen Details — insulin types/doses, oral agents, control level
    4. 📋 Prior Day Data — yesterday's BGs and doses (Day 2+ titration)
    5. 🩸 Additional Today's BGs — pre-meal BGs, hypo events
  - **Results section** — appears below form after calculation
- **Responsive Design**: Breakpoints at 600px and 380px; touch-optimized targets (≥44px)
- **Print Support**: `@media print` hides header, form sections, and navigation; shows only results
- **Conditional Fields**: Dynamic show/hide of insulin/oral agent panels, tube feed/TPN details, steroid/IV transition inputs (same as v1)
- **Scroll-to-top button**: Appears after scrolling down 400px

### 2. Input Fields — Required vs Optional

| Section | Field | Required | Notes |
|---------|-------|----------|-------|
| **Quick Start** | Diabetes type | ✅ | T1DM, T2DM, stress, unknown |
| | Weight (kg) | ✅ | |
| | Current BG (mg/dL) | ✅ | For immediate correction dose |
| | BG context | ✅ (defaulted) | Fasting/pre-meal/bedtime/random |
| | Home regimen | ✅ | Diet, oral, GLP-1, basal, basal-bolus, premixed |
| | Hospital day | ✅ | Day 1 / Day 2 / Day 3+ |
| | Nutritional status | ✅ | Eating, poor appetite, NPO, tube feeds, TPN |
| **Body & Labs** | Height (cm) | ❌ Optional | For BMI → sliding scale column |
| | HbA1c | ❌ Optional | For context |
| **Clinical Context** | Renal function | ❌ Optional (defaults to normal) | |
| | Steroids / Infection / IV transition / Hypo risk | ❌ Optional | Checkboxes with conditional sub-fields |
| **Home Regimen Details** | Insulin types & doses | ❌ Optional | Shown conditionally based on regimen |
| | Oral agents | ❌ Optional | Shown conditionally |
| **Prior Day Data** | Yesterday's BGs & doses | ❌ Optional | Enables Day 2+ titration |
| **Additional Today's BGs** | Pre-meal BGs & hypo events | ❌ Optional | Enables basal titration |

### 3. Clinical Engine (`computeRecommendations`)

The engine routes patients into different scenarios based on inputs:

| Scenario | Logic |
|----------|-------|
| **IV → SQ Transition** | 80% of (drip rate × 24h) as TDD; basal 50%, bolus 50%; give basal 1-2h before stopping drip |
| **TPN** | 0.1 u/g dextrose; insulin in TPN bag; correction-only SQ |
| **Continuous Tube Feeds** | 1 u per 10 g CHO; 50% basal (glargine), 50% nutritional q4h |
| **NPO** | Basal ↓25% (glargine) or ↓50% (AM NPH); no nutritional insulin |
| **Eating (main pathway)** | Weight-based or home-dose TDD × safety factor; 50% basal, 50% nutritional ÷ 3 meals |
| **Day 1 Diet/Oral** | Correction-only sliding scale; add basal Day 2 if FBG > 150 |

#### Safety Modifiers

- **Renal factor**: eGFR 30–44 → 0.85×; eGFR <30/ESRD → 0.7×
- **Hypoglycemia factor**: Mild → 0.8×; Severe → 0.6×; High risk → 0.85×
- **T1DM**: Hard alert — ALWAYS needs basal insulin, even when NPO
- **Steroids**: Nutritional insulin +50%
- **Infection**: +10% additional insulin requirement
- **Poor appetite**: Nutritional insulin −40%

#### Sliding Scale (Table 1, NBK278972)

BMI-stratified 3-column scale + conservative bedtime column covering BG 131 → >400 mg/dL:

| BG Range | Low BMI (<18.5) | Standard (18.5–25) | High BMI (>25) | Bedtime |
|----------|:---:|:---:|:---:|:---:|
| 131–150 | 0 | 1 | 2 | 0 |
| 151–200 | 1 | 2 | 3 | 0 |
| 201–250 | 2 | 4 | 6 | 1 |
| 251–300 | 3 | 6 | 9 | 2 |
| 301–350 | 4 | 8 | 12 | 3 |
| 351–400 | 5 | 10 | 15 | 3 |
| >400 | 6 | 12 | 18 | 3 |

#### Dose Titration (Day 2+)

- Basal adjusted from fasting BG trend (+2 to +8 u based on FBG)
- Nutritional adjusted from pre-lunch BG delta + prior breakfast dose
- Yesterday's actual administered doses used when available

### 4. JavaScript Architecture

| Function | Role |
|----------|------|
| `validateStep(n)` | Per-step field validation with inline error messages |
| `collectData()` | Gathers all form inputs into a structured data object |
| `computeRecommendations(data)` | Main clinical engine; returns recommendations object |
| `renderResults(data, recs)` | Renders results page with alerts, doses, tables, monitoring |
| `calculate()` | Entry point — validates step 5, computes, renders, shows results |
| `goToStep(n)` / `showStep(n)` | Wizard navigation with validation on forward moves |
| `updateProgress(n)` | Updates progress bar width, percentage, step count |
| `computeBMI()` | Auto-calculates BMI on weight/height input |
| `getCorrectionDose(bg, bmi, isBedtime)` | Looks up correction dose from sliding scale |
| `renalFactor()` / `hypoSafetyFactor()` | Safety modifiers |
| `r(n)` | Rounds to nearest 0.5 units |

### 5. Clinical References (from README)

1. Rushakoff RJ. Inpatient Diabetes Management. *Endotext*. NBK278972.
2. Umpierrez GE et al.; Endocrine Society. *JCEM* 2012;97(1):16–38.
3. ADA Diabetes Care in the Hospital — 2019. *Diabetes Care* 2019;42(Suppl 1):S173–S181.

---

## Current State Assessment

### Strengths
- ✅ Fully self-contained single file — easy to deploy, no build chain
- ✅ Comprehensive clinical logic covering many inpatient scenarios
- ✅ BMI-stratified sliding scale with highlighted current dose
- ✅ Safety modifiers for renal impairment and hypoglycemia
- ✅ Mobile-responsive with touch-friendly UI
- ✅ Print-to-PDF support
- ✅ Clear disclaimer/consent flow

### Areas for Potential Improvement
- 🔧 Single monolithic file — hard to maintain as complexity grows
- 🔧 No automated tests for clinical logic
- 🔧 Basic form validation (no real-time cross-field validation)
- 🔧 Prior day data (Step 4) only shown on Day 2+ but Day 1 selection is on Step 1 — user can't see Day 4 logic until they revisit
- 🔧 No persistence (refresh loses all data) — could use `localStorage` for session recovery
- 🔧 No keyboard shortcuts or accessibility audit beyond basic ARIA
- 🔧 No unit/meal-specific steroid spliting (all meals boosted equally, but steroids have diurnal effect)
- 🔧 No CI/CD pipeline defined
- 🔧 All home insulin doses are free-text — no validation that basal + bolus match expected ranges

---

## Known Deployment

- **Repository**: `xichongl/inpatient-insulin-calculator` (GitHub)
- **Deployment**: GitHub Pages — auto-deploys on push to main
- **Local**: Open `index.html` in any browser

---

*End of log — ready for iterative improvements.*
