# Inpatient Insulin Dosing Assistant

A browser-based clinical decision support tool for subcutaneous insulin dosing on the general medicine inpatient service. Designed for use by residents, interns, and attending physicians.

**Live tool:** https://xichongl.github.io/inpatient-insulin-calculator/

> ⚠️ **This tool is for licensed healthcare professionals only. All recommendations are decision support only and must be reviewed by the responsible clinician. See [Disclaimer](#disclaimer) below.**

---

## Features

### Multi-step guided wizard
The tool walks through five structured input steps before generating recommendations:

1. **Patient information** — diabetes type, weight, height (auto-calculates BMI), hospital day, renal function
2. **Pre-admission regimen** — diet-controlled, oral agents, basal-only, basal-bolus, premixed insulin
3. **Current hospital status** — nutritional route, steroids, active infection, IV drip transition, hypoglycemia risk
4. **Prior day BGs and doses** *(Day 2+ only)* — fasting / pre-meal / bedtime BGs and administered doses
5. **Today's blood glucose** — current readings and correction context

### Clinical scenarios covered

| Scenario | Logic applied |
|---|---|
| Diet/oral patient — Day 1 | Correction-only sliding scale; add basal Day 2 if FBG > 150 |
| Oral agent patient — Day 2+ | Add nutritional insulin if pre-meal BG > 150; titrate basal from FBG |
| Insulin at home | Continue home TDD × 75–80% for in-hospital safety; adjust Day 2+ from actual BGs |
| NPO for procedure | Basal reduced 25% (glargine/detemir) or 50% AM (NPH); hold nutritional |
| Continuous tube feeds | TDD from g CHO/hr; 50% basal, 50% q4h nutritional split |
| TPN | Insulin added to TPN bag at 0.1 u/g dextrose |
| IV insulin → SQ transition | 80% of (rate × 24h) TDD; basal 50%, bolus 50%; give basal 1–2h before stopping drip |
| Glucocorticoid use | Nutritional insulin +50%; post-prandial pattern warning |
| Renal impairment | 15–30% dose reduction based on eGFR tier |
| Hypoglycemia | 20–40% dose reduction based on severity; monitoring protocol |

### Correctional sliding scale (Table 1 from NBK278972)
BMI-stratified three-column scale (low / standard / high BMI) + conservative bedtime column, covering all BG bands from 131 to > 400 mg/dL. The appropriate column and current correction dose are highlighted automatically.

### Safety features
- Hard alert for **Type 1 DM**: never withhold basal insulin, even when NPO
- Hypoglycemia protocol displayed on every results page
- Renal and hypoglycemia safety modifiers applied to all weight-based dose estimates
- One-time disclaimer acknowledgment required before use

---

## Clinical References

This tool implements guidelines from the following sources:

1. **Rushakoff RJ.** Inpatient Diabetes Management. In: Feingold KR et al., editors. *Endotext* [Internet]. MDText.com; 2000–2019. NCBI Bookshelf ID: [NBK278972](https://www.ncbi.nlm.nih.gov/books/NBK278972/).

2. **Umpierrez GE, et al.; Endocrine Society.** Management of Hyperglycemia in Hospitalized Patients in Non-Critical Care Setting: An Endocrine Society Clinical Practice Guideline. *J Clin Endocrinol Metab.* 2012 Jan;97(1):16–38. [PubMed 22223765](https://pubmed.ncbi.nlm.nih.gov/22223765).

3. **American Diabetes Association.** Diabetes Care in the Hospital: Standards of Medical Care in Diabetes — 2019. *Diabetes Care.* 2019 Jan;42(Suppl 1):S173–S181. [PubMed 30559241](https://pubmed.ncbi.nlm.nih.gov/30559241).

---

## Technology

- **Single static HTML file** — no build step, no backend, no external dependencies
- **Pure HTML / CSS / JavaScript** — works offline after the first page load
- **GitHub Pages** — hosted for free; no server to maintain
- No patient data is transmitted or stored — all calculations run locally in the browser

---

## Local Development

```bash
# Clone
git clone https://github.com/xichongl/inpatient-insulin-calculator.git
cd inpatient-insulin-calculator

# Open locally
open index.html        # macOS
# or just drag index.html into any browser
```

### Deploying updates

```bash
git add index.html README.md
git commit -m "describe your change"
git push
# GitHub Pages redeploys automatically within ~60 seconds
```

---

## Disclaimer

This tool is intended for use by **licensed healthcare professionals** as **clinical decision support only**.

- Recommendations are generated from published guidelines and do not account for all individual patient factors, institutional protocols, or evolving clinical evidence.
- The responsible clinician must review and approve all insulin orders before they are executed.
- This tool does **not** replace formal diabetes or endocrinology consultation.
- Patients with complex insulin requirements, hypoglycemia unawareness, DKA, HHS, or other high-acuity presentations require specialist involvement.
- Glucose targets cited reflect general medicine inpatient standards and may differ from your institution's protocols.

The authors assume no liability for clinical outcomes resulting from use of this tool.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

The clinical content and dosing algorithms are based on publicly available medical literature. This software does not constitute medical advice. Use is at the clinician's sole discretion and professional judgment.
