/* ═══════════════════════════════════════════════════════════════
   Clinical Engine
   Sources: Endotext NBK278972 · Endocrine Society 2012 · ADA 2019
   ═══════════════════════════════════════════════════════════════ */

// ── Sliding Scale Table 1 (lispro/aspart/glulisine or regular) ──
// Columns: [low-BMI <18.5, moderate 18.5-25, high >25, bedtime]
const SS_TABLE = [
  { bgMin: 131, bgMax: 150, doses: [0,  1,  2,  0] },
  { bgMin: 151, bgMax: 200, doses: [1,  2,  3,  0] },
  { bgMin: 201, bgMax: 250, doses: [2,  4,  6,  1] },
  { bgMin: 251, bgMax: 300, doses: [3,  6,  9,  2] },
  { bgMin: 301, bgMax: 350, doses: [4,  8, 12,  3] },
  { bgMin: 351, bgMax: 400, doses: [5, 10, 15,  3] },
  { bgMin: 401, bgMax: 999, doses: [6, 12, 18,  3] },
];

function getSsColumn(bmi) {
  if (!bmi || bmi < 18.5) return 0;       // low
  if (bmi <= 25)          return 1;       // moderate
  return 2;                               // high
}

// ── Lookup correction dose for a given BG and context ──
function getCorrectionDose(bg, bmi, isBedtime) {
  if (!bg || bg <= 130) return 0;
  const col = isBedtime ? 3 : getSsColumn(bmi);
  for (const row of SS_TABLE) {
    if (bg >= row.bgMin && bg <= row.bgMax) return row.doses[col];
  }
  return 0;
}

// ── Round to nearest 0.5 units (clinical precision) ──
function r(n) { return Math.round(n * 2) / 2; }

// ── Renal safety modifier ──
function renalFactor(renalStatus) {
  if (renalStatus === 'severe' || renalStatus === 'esrd') return 0.7;
  if (renalStatus === 'moderate') return 0.85;
  return 1.0;
}

// ── Hypoglycemia safety modifier ──
function hypoSafetyFactor(hypoYday, hypoToday, highHypoRisk) {
  if (hypoToday === 'severe' || hypoYday === 'severe') return 0.6;
  if (hypoToday === 'mild'   || hypoYday === 'mild')   return 0.8;
  if (highHypoRisk)                                    return 0.85;
  return 1.0;
}

// ════════════════════════════════════════════════════════════════
//  MAIN CALCULATION
// ════════════════════════════════════════════════════════════════
function computeRecommendations(d) {
  const recs = {
    alerts:        [],   // {level: 'danger'|'warning'|'info', icon, msg}
    scenario:      '',
    basal:         null, // {dose, type, timing, rationale, adjustment, adjustReason}
    nutritional:   null, // {perMeal, totalDaily, type, timing, rationale} or null if NPO
    correctional:  null, // {column, isBedtime, currentCorrDose, table}
    monitoring:    [],
    specialNotes:  [],
  };

  const rf  = renalFactor(d.renalStatus || 'normal');
  const hf  = hypoSafetyFactor(d.hypoYday || 'none', d.hypoToday || 'none', d.highHypoRisk || false);
  const bmi = d.bmi;
  const wt  = d.weight;

  // ── Safety: T1DM + NPO warning ────────────────────────────────
  if (d.dmType === 'T1DM') {
    recs.alerts.push({
      level: 'danger',
      icon:  '🚨',
      msg:   '<strong>Type 1 DM:</strong> Patient ALWAYS requires exogenous basal insulin, even when NPO. Withholding basal insulin in a T1DM patient can cause DKA within hours.'
    });
  }

  // ── Hypoglycemia alerts ───────────────────────────────────────
  if (d.hypoToday === 'severe') {
    recs.alerts.push({ level: 'danger', icon: '⚠️',
      msg: '<strong>Severe hypoglycemia today (BG &lt;54):</strong> Doses are reduced by ~40%. Hold nutritional insulin if eating is unreliable. Reassess cause and consider endocrinology consult.' });
  } else if (d.hypoToday === 'mild' || d.hypoYday === 'mild') {
    recs.alerts.push({ level: 'warning', icon: '⚠️',
      msg: '<strong>Recent hypoglycemia:</strong> Doses are reduced by ~20%. Ensure meals are consistently eaten before giving nutritional insulin. Set a lower BG threshold for correction.' });
  } else if (d.hypoYday === 'severe') {
    recs.alerts.push({ level: 'danger', icon: '⚠️',
      msg: '<strong>Severe hypoglycemia yesterday (BG &lt;54):</strong> Significant dose reduction applied. IV dextrose protocol should be in place. Consider endocrinology.' });
  }

  // ── Renal alert ───────────────────────────────────────────────
  if (d.renalStatus === 'severe' || d.renalStatus === 'esrd') {
    recs.alerts.push({ level: 'warning', icon: '🔬',
      msg: '<strong>Severe renal impairment / ESRD:</strong> Insulin clearance is significantly reduced. Doses reduced by ~30%. Monitor closely for prolonged hypoglycemia. Prefer shorter-acting insulins where possible.' });
  } else if (d.renalStatus === 'moderate') {
    recs.alerts.push({ level: 'warning', icon: '🔬',
      msg: '<strong>Moderate renal impairment (eGFR 30–44):</strong> Doses reduced by ~15% due to decreased insulin clearance.' });
  }

  // ── NPO surgical / ICU ────────────────────────────────────────
  if (d.nutrition === 'npo_surgery_icu') {
    recs.alerts.push({ level: 'warning', icon: '🏥',
      msg: '<strong>Surgical / ICU patient NPO:</strong> IV insulin infusion should be strongly considered per institutional protocol. This tool provides SQ insulin guidance only and is not a substitute for a standardized insulin drip protocol.' });
  }

  // ── Oral agents hold ──────────────────────────────────────────
  if (d.homeRegimen === 'oral' || d.homeRegimen === 'non_insulin_injectable') {
    recs.alerts.push({ level: 'info', icon: 'ℹ️',
      msg: '<strong>Oral agents / GLP-1:</strong> Metformin (renal/contrast risk), sulfonylureas (hypoglycemia risk when NPO), SGLT-2 inhibitors (euglycemic DKA risk), and GLP-1 agonists should generally be held during hospitalization. DPP-4 inhibitors may be continued if glucose is minimally elevated and the patient is eating.' });
  }

  // ── Steroid alert ─────────────────────────────────────────────
  if (d.onSteroid) {
    recs.alerts.push({ level: 'warning', icon: '💊',
      msg: `<strong>Glucocorticoid use:</strong> Steroids primarily elevate <em>post-prandial</em> glucose with less effect on fasting levels. Nutritional (mealtime) insulin doses are increased by ~50%. Glucose may be highest in the afternoon/evening, especially with once-daily AM steroid dosing. Monitor BG q4–6h.` });
  }

  // ════════════════════════════════════════════════════════════════
  //  SCENARIO ROUTING
  // ════════════════════════════════════════════════════════════════

  if (d.ivTransition && d.ivRate) {
    // ── IV → SQ TRANSITION ──────────────────────────────────────
    recs.scenario = 'IV-to-SQ Transition';
    const tddFromDrip = d.ivRate * 24;
    const safeTdd     = r(tddFromDrip * 0.80 * rf * hf);
    const basalDose   = r(safeTdd * 0.5);
    const perMeal     = (d.nutrition === 'eating' || d.nutrition === 'poor_appetite')
                        ? r((safeTdd * 0.5) / 3) : null;
    const tfDose      = d.nutrition === 'tube_feeds' ? r(safeTdd * 0.5 / 10) : null;

    recs.basal = {
      dose:     basalDose,
      type:     'Glargine (or detemir)',
      timing:   'Give 1–2 hours BEFORE discontinuing IV infusion',
      rationale:`IV rate ${d.ivRate} u/hr × 24 h = ${r(tddFromDrip)} u/day TDD. 80% safety factor → ${safeTdd} u/day. Basal = 50% of that.`,
    };

    if (perMeal !== null) {
      recs.nutritional = {
        perMeal,
        totalDaily: r(perMeal * 3),
        type:       'Rapid-acting (lispro / aspart / glulisine)',
        timing:     'With each meal',
        rationale:  `50% of safe TDD (${r(safeTdd * 0.5)} u) divided by 3 meals.`,
      };
    } else if (tfDose !== null) {
      recs.nutritional = {
        perMeal:    tfDose,
        totalDaily: null,
        type:       'Rapid-acting q4h while tube feeds running',
        timing:     'Every 4 hours while tube feed is active',
        rationale:  `50% of safe TDD divided by 10 for tube-feed nutritional dosing.`,
      };
    }

    if (d.ivStableHours && d.ivStableHours < 4) {
      recs.alerts.push({ level: 'warning', icon: '⏱️',
        msg: `<strong>Drip not yet stable:</strong> The infusion rate has only been stable for ${d.ivStableHours} hour(s). Best practice is ≥4–6 h of rate stability before transitioning to SQ insulin.` });
    }

  } else if (d.nutrition === 'tpn') {
    // ── TPN ─────────────────────────────────────────────────────
    recs.scenario = 'TPN';
    const glucoseGramPerHr = d.tpnGlucoseConc && d.tpnRate
                             ? (d.tpnGlucoseConc / 100) * d.tpnRate
                             : null;
    const glucoseGramPerDay = glucoseGramPerHr ? r(glucoseGramPerHr * 24) : null;
    const tpnInsulin = glucoseGramPerDay ? r(glucoseGramPerDay * 0.1 * rf * hf) : null;

    recs.basal = {
      dose:     tpnInsulin,
      type:     'Regular insulin added to TPN bag',
      timing:   'In TPN — start with 0.1 u/g dextrose; adjust daily',
      rationale: glucoseGramPerDay
        ? `TPN glucose: ${d.tpnGlucoseConc}% × ${d.tpnRate} mL/h = ${r(glucoseGramPerHr)} g/h × 24 = ${glucoseGramPerDay} g/day. At 0.1 u/g = ${tpnInsulin} u/day in bag.`
        : 'Enter TPN concentration and rate for a calculated dose. Start at 0.1 u/g dextrose.',
    };
    recs.nutritional = null;
    recs.specialNotes.push('Add insulin directly to TPN bag — unexpected TPN discontinuation will also stop insulin, reducing hypoglycemia risk.');
    recs.specialNotes.push('Check BG q4–6h. Titrate insulin in TPN bag by 2–4 units/day based on pattern.');
    recs.specialNotes.push('Correction-only sliding scale SQ while TPN running.');

  } else if (d.nutrition === 'tube_feeds') {
    // ── CONTINUOUS TUBE FEEDS ────────────────────────────────────
    recs.scenario = 'Continuous Tube Feeds';
    let tdd = null;
    let tddSource = '';

    if (d.tfCarbsPerHr) {
      const dailyCHO = d.tfCarbsPerHr * 24;
      tdd = r(dailyCHO / 10 * rf * hf);
      tddSource = `CHO ${d.tfCarbsPerHr} g/h × 24 = ${r(dailyCHO)} g/day; 1 u/10 g = ${r(dailyCHO/10)} u, adjusted.`;
    } else if (wt) {
      const baseTdd = d.dmType === 'T1DM' ? wt * 0.4 : wt * 0.5;
      tdd = r(baseTdd * rf * hf);
      tddSource = `Weight-based estimate (${d.dmType === 'T1DM' ? '0.4' : '0.5'} u/kg × ${wt} kg).`;
    }

    const basalDose = tdd ? r(tdd / 2) : null;
    const q4Dose    = tdd ? r(tdd / 2 / 10) : null;

    recs.basal = {
      dose:     basalDose,
      type:     'Glargine (or detemir)',
      timing:   'Once daily',
      rationale:`${tddSource} Basal = 50% of TDD.`,
    };
    recs.nutritional = {
      perMeal:    q4Dose,
      totalDaily: null,
      type:       'Rapid-acting (lispro / aspart / glulisine) or Regular',
      timing:     'Every 4 hours while tube feeds are running',
      rationale:  'Nutritional = 50% of TDD ÷ 10 for q4h dosing.',
    };
    recs.specialNotes.push('If tube feeds are held or rate changes, adjust nutritional insulin proportionally or hold until feeds resume.');
    recs.specialNotes.push('Check BG q4–6h while on tube feeds.');

  } else if (d.nutrition === 'npo_procedure' || d.nutrition === 'npo_surgery_icu') {
    // ── NPO ──────────────────────────────────────────────────────
    recs.scenario = 'NPO';
    let basalDose = null;
    let basalNote = '';

    if (d.homeRegimen === 'basal_bolus' || d.homeRegimen === 'basal_only') {
      const homeBD = d.homeBasalDose;
      if (homeBD) {
        if (d.homeBasalType === 'nph') {
          basalDose = r(homeBD * 0.5 * rf * hf);
          basalNote = `Home NPH dose (${homeBD} u) × 50% for morning NPO. If bedtime NPH, give usual dose.`;
        } else {
          basalDose = r(homeBD * 0.75 * rf * hf);
          basalNote = `Home ${d.homeBasalType || 'basal'} (${homeBD} u) × 75% (↓25%) for NPO.`;
        }
      } else if (wt) {
        basalDose = r(wt * 0.2 * rf * hf);
        basalNote = 'Home dose unknown; estimated at 0.2 u/kg.';
      }
    } else if (d.hospitalDay >= 2 && d.doseBasalYday) {
      const prevBasal = d.doseBasalYday;
      basalDose = r(prevBasal * 0.75 * rf * hf);
      basalNote = `Prior day basal (${prevBasal} u) × 75% for NPO.`;
    } else if (wt) {
      basalDose = r(wt * 0.2 * rf * hf);
      basalNote = 'Starting estimate: 0.2 u/kg.';
    }

    recs.basal = {
      dose:     basalDose,
      type:     d.homeBasalType === 'nph' ? 'NPH' : 'Glargine (preferred) or detemir',
      timing:   'Continue scheduled basal; DO NOT give nutritional insulin while NPO',
      rationale: basalNote,
    };
    recs.nutritional = null;
    recs.specialNotes.push('Hold ALL nutritional (mealtime) insulin while patient is NPO.');
    recs.specialNotes.push('Continue correctional sliding scale for hyperglycemia.');
    recs.specialNotes.push('Type 1 DM: NEVER withhold basal insulin, even when NPO.');
    recs.specialNotes.push('Resume nutritional insulin when patient is eating again, titrating to intake.');

  } else {
    // ── EATING PATIENTS (main basal-bolus pathway) ───────────────
    const isDay1 = d.hospitalDay === 1;

    // ── Determine base TDD ───────────────────────────────────────
    let tdd = null, tddSource = '';

    if (d.homeRegimen === 'basal_bolus' && d.homeBasalDose && d.homeBolusDose) {
      const homeTdd = d.homeBasalDose + d.homeBolusDose;
      if (d.homeControl === 'well') {
        tdd = r(homeTdd * 0.75 * rf * hf);
        tddSource = `Home TDD (${homeTdd} u) × 75% (↓25% for in-hospital safety).`;
      } else {
        tdd = r(homeTdd * 0.80 * rf * hf);
        tddSource = `Home TDD (${homeTdd} u) × 80%.`;
      }
    } else if (d.homeRegimen === 'basal_only' && d.homeBasalDose) {
      const homeTdd = d.homeBasalDose;
      tdd = r(homeTdd * 0.75 * rf * hf);
      tddSource = `Home basal (${homeTdd} u) × 75% as estimated TDD.`;
    } else if (d.homeRegimen === 'premixed' && d.homeBasalDose) {
      tdd = r(d.homeBasalDose * 0.80 * rf * hf);
      tddSource = `Premixed home dose (${d.homeBasalDose} u/day) × 80%.`;
    } else {
      // Weight-based starting dose
      let baseRate = 0.4;
      if (d.dmType === 'T2DM' || d.homeRegimen === 'oral') baseRate = 0.5;
      if (d.dmType === 'stress') baseRate = 0.3;
      tdd = wt ? r(wt * baseRate * rf * hf) : null;
      tddSource = `Weight-based estimate (${baseRate} u/kg × ${wt} kg).`;
    }

    // ── Basal (50% of TDD) ───────────────────────────────────────
    let basalDose   = tdd ? r(tdd * 0.5) : null;
    let basalAdj    = 0;
    let basalAdjReason = '';

    if (!isDay1 && d.bgFastingToday !== null && d.bgFastingToday !== undefined) {
      const fbg = d.bgFastingToday;
      if (fbg < 140) {
        basalAdj = 0; basalAdjReason = `Fasting BG ${fbg} — at goal (<140). No change.`;
      } else if (fbg <= 160) {
        basalAdj = 2; basalAdjReason = `Fasting BG ${fbg} (141–160) → increase basal by 2–3 u.`;
      } else if (fbg <= 180) {
        basalAdj = 4; basalAdjReason = `Fasting BG ${fbg} (161–180) → increase basal by 4–5 u.`;
      } else if (fbg <= 200) {
        basalAdj = 6; basalAdjReason = `Fasting BG ${fbg} (181–200) → increase basal by 6–7 u.`;
      } else {
        basalAdj = 8; basalAdjReason = `Fasting BG ${fbg} (>200) → increase basal by 8 u.`;
      }

      if (d.doseBasalYday !== null && d.doseBasalYday !== undefined && basalDose !== null) {
        basalDose = r(d.doseBasalYday + basalAdj);
        basalAdjReason = `Prior day basal: ${d.doseBasalYday} u + ${basalAdj} u adjustment. ${basalAdjReason}`;
      } else if (basalDose !== null) {
        basalDose = r(basalDose + basalAdj);
      }
    }

    let infectionNote = '';
    if (d.onInfection && tdd) {
      const infAdj = r(tdd * 0.1);
      infectionNote = `Active infection: ~10% additional insulin requirement factored in.`;
    }

    let basalType   = 'Glargine (Lantus/Basaglar) — preferred';
    let basalTiming = 'Once daily, same time each day (bedtime preferred)';
    if (d.homeBasalType === 'nph') {
      basalType   = 'NPH';
      basalTiming = 'Twice daily (bedtime + morning) or bedtime only';
    } else if (d.homeBasalType === 'detemir') {
      basalType   = 'Detemir (Levemir)';
      basalTiming = 'Once or twice daily';
    } else if (d.homeBasalType === 'degludec') {
      basalType   = 'Degludec (Tresiba)';
      basalTiming = 'Once daily';
    }

    recs.basal = {
      dose:        basalDose,
      type:        basalType,
      timing:      basalTiming,
      rationale:   tddSource + (basalAdjReason ? ' ' + basalAdjReason : ''),
      adjustment:  basalAdj,
      adjustReason: basalAdjReason,
    };

    // ── Nutritional (mealtime) insulin ───────────────────────────
    let perMeal    = tdd ? r((tdd * 0.5) / 3) : null;
    let nutRationale = '';
    let steroidBoost = false;

    if (d.onSteroid && perMeal) {
      perMeal = r(perMeal * 1.5);
      steroidBoost = true;
      nutRationale = 'Steroid use: nutritional insulin increased by ~50% to address post-prandial hyperglycemia. ';
    }

    let poorAppNote = '';
    if (d.nutrition === 'poor_appetite') {
      perMeal = perMeal ? r(perMeal * 0.6) : null;
      poorAppNote = 'Poor appetite: nutritional insulin reduced by ~40%. Consider post-meal dosing based on amount eaten.';
    }

    if (!isDay1) {
      let nutAdj = 0, nutAdjReason = '';
      if (d.bgFastingYday !== null && d.bgPrelunchYday !== null && d.doseBreakfastYday !== null &&
          d.bgFastingYday !== undefined && d.bgPrelunchYday !== undefined && d.doseBreakfastYday !== undefined) {
        const delta = d.bgPrelunchYday - d.bgFastingYday;
        if (delta > 50 && d.bgPrelunchYday > 150) {
          nutAdj = r(d.doseBreakfastYday + 2);
          nutAdjReason = `Pre-lunch BG (${d.bgPrelunchYday}) was significantly higher than pre-breakfast (${d.bgFastingYday}); breakfast dose was ${d.doseBreakfastYday} u → use ${nutAdj} u as breakfast nutritional tomorrow.`;
        } else if (d.bgPrelunchYday < 80) {
          nutAdj = r(Math.max((d.doseBreakfastYday || perMeal || 0) - 2, 1));
          nutAdjReason = `Pre-lunch BG was low (${d.bgPrelunchYday} mg/dL); reduce breakfast nutritional dose.`;
        } else {
          nutAdj = d.doseBreakfastYday;
          nutAdjReason = `Pre-lunch BG at goal; use yesterday's total breakfast dose (${d.doseBreakfastYday} u) as tomorrow's nutritional dose.`;
        }
        if (nutAdj) perMeal = r(nutAdj * rf * hf);
      }
      nutRationale += nutAdjReason;
    }

    let bolusType = 'Rapid-acting: lispro (Humalog) / aspart (NovoLog) / glulisine (Apidra)';
    if (d.homeBolusType === 'regular') bolusType = 'Regular insulin';
    let bolusTiming = 'Immediately before meals (rapid-acting) or 30 min before (regular)';
    if (d.nutrition === 'poor_appetite') {
      bolusTiming = 'Administer AFTER meals, dose based on amount eaten (reduce for partial meals)';
    }

    recs.scenario = isDay1 ? 'Day 1 Initiation' : `Day ${d.hospitalDay} Adjustment`;

    recs.nutritional = (d.nutrition === 'npo_procedure' || d.nutrition === 'npo_surgery_icu')
      ? null
      : {
          perMeal:    perMeal,
          totalDaily: perMeal ? r(perMeal * 3) : null,
          type:       bolusType,
          timing:     bolusTiming,
          rationale:  (nutRationale || `50% of TDD (${tdd ? r(tdd*0.5) : '?'} u) ÷ 3 meals.`)
                       + (poorAppNote ? ' ' + poorAppNote : '')
                       + (infectionNote ? ' ' + infectionNote : ''),
          steroidBoost,
        };

    // Day 1 diet/oral patients → only sliding scale on Day 1
    if (isDay1 && (d.homeRegimen === 'diet' || d.homeRegimen === 'oral')) {
      recs.scenario = 'Day 1 – Diet/Oral Agent Patient';
      recs.basal = null;
      recs.nutritional = null;
      recs.specialNotes.push('Day 1: Use correctional sliding scale only. Monitor fasting BG.');
      recs.specialNotes.push('Day 2: If fasting BG > 150 mg/dL, add bedtime basal glargine at 0.1–0.2 u/kg.');
      recs.specialNotes.push('Day 2: If pre-meal BGs > 150 mg/dL, add nutritional insulin at 0.1–0.2 u/kg/day divided by 3 meals.');
    }
  }

  // ── Correctional sliding scale ──────────────────────────────
  const isBedtime = d.bgCurrentContext === 'bedtime';
  const corrDose  = getCorrectionDose(d.bgCurrent, bmi, isBedtime);
  recs.correctional = {
    column:          getSsColumn(bmi),
    isBedtime,
    currentBg:       d.bgCurrent,
    currentCorrDose: corrDose,
    table:           SS_TABLE,
    bmi,
  };

  // ── Monitoring plan ────────────────────────────────────────────
  const isNpo = d.nutrition === 'npo_procedure' || d.nutrition === 'npo_surgery_icu';
  const isTF  = d.nutrition === 'tube_feeds';
  const isTPN = d.nutrition === 'tpn';

  if (isNpo || isTF || isTPN) {
    recs.monitoring.push('Blood glucose every 4–6 hours (qid or q6h).');
  } else {
    recs.monitoring.push('Blood glucose before each meal and at bedtime (qid AC+HS).');
  }
  if (d.onSteroid) {
    recs.monitoring.push('Additional BG check 4–6 hours after steroid dose (peak effect on post-prandial glucose).');
  }
  recs.monitoring.push('Hold nutritional insulin if patient is not eating or meal is significantly reduced.');
  recs.monitoring.push('For BG < 70 mg/dL: if patient can take PO, give 15–20 g fast-acting carbohydrate (glucose tabs or 6 oz juice). If NPO, give 25 mL D50 IV push. Recheck BG every 15 min until ≥ 100 mg/dL.');
  recs.monitoring.push('Notify provider for BG < 70 or > 300 mg/dL.');
  if (d.dmType === 'T1DM') {
    recs.monitoring.push('T1DM: Check urine/serum ketones if BG > 250 mg/dL or patient feels unwell. Absent basal insulin → DKA risk.');
  }

  return recs;
}
