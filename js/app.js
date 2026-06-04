/* ═══════════════════════════════════════════════════════════════
   App Logic — UI interactions, data collection, validation
   ═══════════════════════════════════════════════════════════════ */

// ════════════════════════════════════════════════════════════════
//  DISCLAIMER
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  const agreeCheckbox = document.getElementById('agree-checkbox');
  const btnAccept = document.getElementById('btn-accept');

  if (agreeCheckbox && btnAccept) {
    agreeCheckbox.addEventListener('change', function() {
      btnAccept.disabled = !this.checked;
    });
    btnAccept.addEventListener('click', function() {
      document.getElementById('disclaimer-overlay').style.display = 'none';
    });
  }
});

// ════════════════════════════════════════════════════════════════
//  GENERIC HELPERS
// ════════════════════════════════════════════════════════════════

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function numVal(id) {
  const v = parseFloat(val(id));
  return isNaN(v) ? null : v;
}

function checked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

function radioVal(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

// ════════════════════════════════════════════════════════════════
//  RADIO / CHECKBOX HIGHLIGHTING
// ════════════════════════════════════════════════════════════════

function highlightSelected(input) {
  const group = input.closest('.radio-group, .check-group');
  if (!group) return;
  group.querySelectorAll('.radio-option, .check-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  if (input.type === 'radio') {
    const opt = input.closest('.radio-option');
    if (opt) opt.classList.add('selected');
  }
}

function updateCheckOption(input) {
  const opt = input.closest('.check-option');
  if (!opt) return;
  opt.classList.toggle('selected', input.checked);
}

// Wire up all radio and checkbox highlighting
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.radio-option input[type=radio]').forEach(r => {
    r.addEventListener('change', function() { highlightSelected(this); });
  });
  document.querySelectorAll('.check-option input[type=checkbox]').forEach(chk => {
    chk.addEventListener('change', function() { updateCheckOption(this); });
  });
});

// ════════════════════════════════════════════════════════════════
//  CONDITIONAL FIELD VISIBILITY
// ════════════════════════════════════════════════════════════════

function toggleConditional(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('visible', show);
}

// ── Home regimen conditionals ───────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('input[name="home_regimen"]').forEach(radio => {
    radio.addEventListener('change', function() {
      updateHomeRegimenConditionals(this.value);
    });
  });
});

function updateHomeRegimenConditionals(value) {
  const insulinTypes = ['basal_only', 'basal_bolus', 'premixed'];
  const showInsulin = insulinTypes.includes(value);
  const showOral    = value === 'oral';
  const showBolus   = value === 'basal_bolus' || value === 'premixed';

  toggleConditional('cond-home-insulin', showInsulin);
  toggleConditional('cond-oral-agents',  showOral);
  const bolusSection = document.getElementById('cond-bolus-section');
  if (bolusSection) bolusSection.style.display = showBolus ? 'block' : 'none';
}

// ── Nutrition conditionals ──────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('input[name="nutrition"]').forEach(radio => {
    radio.addEventListener('change', function() {
      toggleConditional('cond-tube-feed', this.value === 'tube_feeds');
      toggleConditional('cond-tpn',       this.value === 'tpn');
    });
  });
});

// ── Special checkboxes ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  const steroidChk = document.getElementById('chk-steroid');
  if (steroidChk) {
    steroidChk.addEventListener('change', function() {
      toggleConditional('cond-steroid', this.checked);
    });
  }

  const ivChk = document.getElementById('chk-iv-transition');
  if (ivChk) {
    ivChk.addEventListener('change', function() {
      toggleConditional('cond-iv-transition', this.checked);
    });
  }
});

// ════════════════════════════════════════════════════════════════
//  BMI AUTO-CALCULATOR
// ════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  ['weight', 'height'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', computeBMI);
  });
});

function computeBMI() {
  const w = parseFloat(document.getElementById('weight')?.value || '');
  const h_cm = parseFloat(document.getElementById('height')?.value || '');
  const h = h_cm / 100;
  const display = document.getElementById('bmi-display');
  const text    = document.getElementById('bmi-text');

  if (!display || !text) return;

  if (w > 0 && h > 0) {
    const bmi = (w / (h * h)).toFixed(1);
    let cat = '';
    if      (bmi < 18.5) cat = 'Underweight';
    else if (bmi < 25)   cat = 'Normal weight';
    else if (bmi < 30)   cat = 'Overweight';
    else                 cat = 'Obese';

    const ssCol = bmi < 18.5 ? 'Low-dose scale (Column A)' : bmi <= 25 ? 'Standard scale (Column B)' : 'High-dose scale (Column C)';

    text.innerHTML = `<strong>BMI: ${bmi} kg/m²</strong> — ${cat}<br>
      <span style="font-size:0.78rem">Sliding scale column: <strong>${ssCol}</strong></span>`;
    display.style.display = 'flex';
  } else {
    display.style.display = 'none';
  }
}

// ════════════════════════════════════════════════════════════════
//  STEP SEQUENCE (for Day 1 skip)
// ════════════════════════════════════════════════════════════════

function getStepSequence() {
  const day = document.getElementById('hospital-day')?.value;
  if (day === '1') return [1, 2, 3, 5];
  return [1, 2, 3, 4, 5];
}

// ════════════════════════════════════════════════════════════════
//  VALIDATION
// ════════════════════════════════════════════════════════════════

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
}

function showError(errId, inputEl) {
  const errEl = document.getElementById(errId);
  if (errEl) errEl.classList.add('show');
  if (inputEl) inputEl.classList.add('error');
}

function validateMinimal() {
  clearErrors();
  let valid = true;

  const dmType = document.querySelector('input[name="dm_type"]:checked');
  if (!dmType) { showError('err-dm-type', null); valid = false; }

  const weight = document.getElementById('weight');
  if (!weight?.value || +weight.value <= 0) { showError('err-weight', weight); valid = false; }

  const bgCurrent = document.getElementById('bg-current');
  if (!bgCurrent?.value || +bgCurrent.value < 40) { showError('err-bg-current', bgCurrent); valid = false; }

  const regimen = document.querySelector('input[name="home_regimen"]:checked');
  if (!regimen) { showError('err-home-regimen', null); valid = false; }

  const day = document.getElementById('hospital-day');
  if (!day?.value) { showError('err-hospital-day', day); valid = false; }

  const nutrition = document.querySelector('input[name="nutrition"]:checked');
  if (!nutrition) { showError('err-nutrition', null); valid = false; }

  return valid;
}

// ════════════════════════════════════════════════════════════════
//  DATA COLLECTION
// ════════════════════════════════════════════════════════════════

function collectData() {
  const weight = numVal('weight');
  const height = numVal('height') / 100;
  const bmi    = weight && height ? +(weight / (height * height)).toFixed(1) : null;

  return {
    // Quick start / minimal
    dmType:       radioVal('dm_type'),
    weight,
    heightCm:     numVal('height') || null,
    bmi,
    hospitalDay:  parseInt(val('hospital-day')) || 1,
    homeRegimen:  radioVal('home_regimen'),
    nutrition:    radioVal('nutrition'),
    bgCurrent:    numVal('bg-current'),
    bgCurrentContext: val('current-bg-context') || 'random',

    // ── Expandable: Body & Labs ──
    homeA1c:      numVal('home-a1c'),

    // ── Expandable: Clinical Context ──
    renalStatus:  val('renal-status') || 'normal',
    onSteroid:    checked('chk-steroid'),
    steroidType:  val('steroid-type') || null,
    steroidDose:  numVal('steroid-dose'),
    onInfection:  checked('chk-infection'),
    ivTransition: checked('chk-iv-transition'),
    ivRate:       numVal('iv-rate'),
    ivStableHours: numVal('iv-stable-hours'),
    highHypoRisk: checked('chk-hypoglycemia-risk'),

    // ── Expandable: Home Regimen Details ──
    homeControl:      val('home-control') || 'unknown',
    homeBasalType:    val('home-basal-type') || null,
    homeBasalDose:    numVal('home-basal-dose'),
    homeBolusType:    val('home-bolus-type') || null,
    homeBolusDose:    numVal('home-bolus-dose'),

    // ── Expandable: Prior Day Data ──
    bgFastingYday:    numVal('bg-fasting-yday'),
    bgPrelunchYday:   numVal('bg-prelunch-yday'),
    bgPredinnerYday:  numVal('bg-predinner-yday'),
    bgBedtimeYday:    numVal('bg-bedtime-yday'),
    doseBasalYday:    numVal('dose-basal-yday'),
    doseBreakfastYday:numVal('dose-breakfast-yday'),
    doseLunchYday:    numVal('dose-lunch-yday'),
    doseDinnerYday:   numVal('dose-dinner-yday'),
    hypoYday:         radioVal('hypo_yday') || 'none',

    // ── Expandable: Additional Today's BGs ──
    bgFastingToday:   numVal('bg-fasting-today'),
    bgPrelunchToday:  numVal('bg-prelunch-today'),
    bgPredinnerToday: numVal('bg-predinner-today'),
    bgBedtimeToday:   numVal('bg-bedtime-today'),
    hypoToday:        radioVal('hypo_today') || 'none',
  };
}

// ════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ════════════════════════════════════════════════════════════════

function calculate() {
  if (!validateMinimal()) return;

  const data = collectData();
  const recs = computeRecommendations(data);
  renderResults(data, recs);
}

function restartApp() {
  location.reload();
}

// ════════════════════════════════════════════════════════════════
//  SCROLL TO TOP BUTTON
// ════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  const scrollBtn = document.getElementById('scroll-top-btn');
  if (!scrollBtn) return;

  window.addEventListener('scroll', function() {
    scrollBtn.classList.toggle('visible', window.scrollY > 400);
  });

  scrollBtn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
