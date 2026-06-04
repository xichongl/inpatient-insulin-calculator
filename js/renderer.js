/* ═══════════════════════════════════════════════════════════════
   Results Renderer
   ═══════════════════════════════════════════════════════════════ */

function renderResults(d, recs) {
  const alertsEl = document.getElementById('results-alerts');
  const bodyEl   = document.getElementById('results-body');
  const subtitle = document.getElementById('results-subtitle');
  const resultsSection = document.getElementById('step-results');

  // Build subtitle
  const parts = [];
  if (d.dmType) parts.push(d.dmType);
  if (recs.scenario) parts.push(recs.scenario);
  if (d.nutrition) parts.push(d.nutrition.replace(/_/g, ' '));
  if (d.hospitalDay) parts.push('Day ' + d.hospitalDay);
  subtitle.textContent = parts.join(' · ') || 'Insulin Dosing Recommendations';

  // ── Alerts ────────────────────────────────────────────────────
  alertsEl.innerHTML = recs.alerts.map(a =>
    `<div class="alert-banner ${a.level}">
       <span class="alert-icon">${a.icon}</span>
       <div>${a.msg}</div>
     </div>`
  ).join('');

  // ── Build body ────────────────────────────────────────────────
  let html = '';

  // ─ Basal ─────────────────────────────────────────────────────
  html += `<div class="result-section">
    <div class="result-section-header">🌙 Basal Insulin</div>
    <div class="result-section-body">`;

  if (recs.basal && recs.basal.dose !== null && recs.basal.dose !== undefined) {
    const b = recs.basal;
    html += `
      <div class="dose-row">
        <div class="dose-label">Dose</div>
        <div class="dose-value highlight">${b.dose} units</div>
      </div>
      <div class="dose-row">
        <div class="dose-label">Insulin type</div>
        <div class="dose-value" style="font-size:0.88rem;font-weight:600">${b.type}</div>
      </div>
      <div class="dose-row">
        <div class="dose-label">Timing</div>
        <div class="dose-value" style="font-size:0.85rem;font-weight:500;color:var(--gray-600)">${b.timing}</div>
      </div>
      <div style="margin-top:10px;padding:10px 12px;background:var(--gray-50);border-radius:6px;font-size:0.8rem;color:var(--gray-600);line-height:1.55">
        <strong>Rationale:</strong> ${b.rationale}</div>`;
  } else {
    html += `<div class="info-box blue"><span class="icon">ℹ️</span>
      <div>No basal insulin on Day 1 for diet/oral patients. Add bedtime basal on Day 2 if fasting BG > 150 mg/dL, starting at 0.1–0.2 u/kg.</div>
    </div>`;
  }
  html += `</div></div>`;

  // ─ Nutritional ───────────────────────────────────────────────
  html += `<div class="result-section">
    <div class="result-section-header">🍽️ Nutritional (Mealtime) Insulin</div>
    <div class="result-section-body">`;

  if (recs.nutritional) {
    const n = recs.nutritional;
    html += `
      <div class="dose-row">
        <div class="dose-label">Dose per meal</div>
        <div class="dose-value highlight">${n.perMeal !== null ? n.perMeal + ' units' : '—'}</div>
      </div>`;
    if (n.totalDaily) {
      html += `<div class="dose-row">
        <div class="dose-label">Total daily nutritional</div>
        <div class="dose-value">${n.totalDaily} units/day</div>
      </div>`;
    }
    html += `
      <div class="dose-row">
        <div class="dose-label">Insulin type</div>
        <div class="dose-value" style="font-size:0.85rem;font-weight:600">${n.type}</div>
      </div>
      <div class="dose-row">
        <div class="dose-label">Timing</div>
        <div class="dose-value" style="font-size:0.83rem;font-weight:500;color:var(--gray-600)">${n.timing}</div>
      </div>
      ${n.steroidBoost ? `<div class="info-box amber" style="margin-top:10px"><span class="icon">💊</span><div>Steroid boost applied (+50%): heaviest glucose rise expected in afternoon/evening. Consider weighting dinner bolus higher.</div></div>` : ''}
      <div style="margin-top:10px;padding:10px 12px;background:var(--gray-50);border-radius:6px;font-size:0.8rem;color:var(--gray-600);line-height:1.55">
        <strong>Rationale:</strong> ${n.rationale}</div>`;
  } else {
    html += `<div class="info-box amber"><span class="icon">⚠️</span>
      <div><strong>No nutritional insulin ordered.</strong> Patient is NPO / not eating. Resume nutritional insulin when eating resumes, titrate to intake.</div>
    </div>`;
  }
  html += `</div></div>`;

  // ─ Correctional / Sliding Scale ──────────────────────────────
  const c = recs.correctional;
  const colNames = ['Low BMI (<18.5)', 'Standard (BMI 18.5–25)', 'High BMI (>25)'];
  const colKey   = ['Column A', 'Column B', 'Column C'];

  html += `<div class="result-section">
    <div class="result-section-header">📊 Correctional (Sliding Scale) Insulin</div>
    <div class="result-section-body">
      <div class="dose-row">
        <div class="dose-label">Selected scale</div>
        <div class="dose-value" style="font-size:0.88rem;font-weight:600">
          ${c.isBedtime ? 'Bedtime scale (conservative)' : colNames[c.column] + ' — ' + colKey[c.column]}
          ${c.bmi ? `<div class="dose-rationale">BMI ${c.bmi} kg/m²</div>` : ''}
        </div>
      </div>
      <div class="dose-row">
        <div class="dose-label">Correction for current BG (${c.currentBg} mg/dL)</div>
        <div class="dose-value highlight">${c.currentCorrDose} units</div>
      </div>`;

  // Full sliding scale table
  html += `<div style="margin-top:14px">
    <div class="section-label">Full correctional scale — lispro / aspart / glulisine (or regular)</div>
    <table class="ss-table">
      <thead>
        <tr>
          <th>BG (mg/dL)</th>
          <th>Low BMI<br><small>Col A</small></th>
          <th>Standard<br><small>Col B</small></th>
          <th>High BMI<br><small>Col C</small></th>
          <th>Bedtime<br><small>Col D</small></th>
        </tr>
      </thead>
      <tbody>
        ${SS_TABLE.map(row => {
          const highlight = c.currentBg >= row.bgMin && c.currentBg <= row.bgMax;
          return `<tr class="${highlight ? 'highlighted-row' : ''}">
            <td class="bg-col">${row.bgMax === 999 ? '>400' : row.bgMin + '–' + row.bgMax}</td>
            ${row.doses.map((d,i) => `<td class="dose-col">${d} u${highlight && (c.isBedtime ? i===3 : i===c.column) ? ' ✓' : ''}</td>`).join('')}
          </tr>`;
        }).join('')}
        <tr>
          <td class="bg-col" style="color:var(--green);font-weight:700">≤130</td>
          <td class="dose-col" colspan="4" style="color:var(--green)">0 units — no correction</td>
        </tr>
        <tr>
          <td class="bg-col" style="color:var(--red);font-weight:700">&lt;70</td>
          <td class="dose-col" colspan="4" style="color:var(--red)">Hold insulin — treat hypoglycemia</td>
        </tr>
      </tbody>
    </table>
  </div>`;

  html += `</div></div>`;

  // ─ Special Notes ─────────────────────────────────────────────
  if (recs.specialNotes.length) {
    html += `<div class="result-section">
      <div class="result-section-header">📌 Special Notes</div>
      <div class="result-section-body">
        <ul class="monitoring-list">
          ${recs.specialNotes.map(n => `<li>${n}</li>`).join('')}
        </ul>
      </div>
    </div>`;
  }

  // ─ Monitoring ─────────────────────────────────────────────────
  html += `<div class="result-section">
    <div class="result-section-header">🩺 Monitoring &amp; Hypoglycemia Protocol</div>
    <div class="result-section-body">
      <ul class="monitoring-list">
        ${recs.monitoring.map(m => `<li>${m}</li>`).join('')}
      </ul>
    </div>
  </div>`;

  // ─ Summary banner ─────────────────────────────────────────────
  const basalSummary      = recs.basal && recs.basal.dose != null
    ? `${recs.basal.dose} u ${recs.basal.type.split(' ')[0]} ${recs.basal.timing.split(',')[0]}`
    : 'None';
  const nutritionalSummary = recs.nutritional
    ? `${recs.nutritional.perMeal ?? '?'} u per meal (${recs.nutritional.type.split(':')[0]})`
    : 'None / NPO';
  const corrSummary       = `${c.currentCorrDose} u now for BG ${c.currentBg}`;

  html = `<div class="info-box green" style="margin-bottom:20px">
    <span class="icon">✅</span>
    <div>
      <strong>Quick Summary</strong><br>
      <span style="font-size:0.82rem;line-height:1.8">
        Basal: <strong>${basalSummary}</strong><br>
        Nutritional: <strong>${nutritionalSummary}</strong><br>
        Correction now: <strong>${corrSummary}</strong>
      </span>
    </div>
  </div>` + html;

  bodyEl.innerHTML = html;

  // Show results section
  resultsSection.classList.add('active');

  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
