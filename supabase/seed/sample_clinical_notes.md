# Sample clinical notes for testing AI Medical Coding

Copy-paste these into Doctor -> Medical Coding -> pick an appointment -> Clinical
Note form, then click "Suggest Billing Codes" to see real Groq-generated
ICD-10/CPT suggestions. Each one is written to plausibly produce a different
set of codes so you can show range in a demo.

---

## 1. Diabetes + hypertension follow-up

**Chief complaint:** Follow-up visit for type 2 diabetes and hypertension
management. Patient reports increased thirst and mild fatigue over the past
2 weeks.

**Examination findings:** BP 148/92 mmHg, HR 88 bpm, BMI 31. Mild peripheral
edema noted. Fasting glucose 168 mg/dL.

**Diagnosis:** Type 2 diabetes mellitus, poorly controlled. Essential
hypertension, stage 2.

**Treatment plan:** Increase metformin to 1000mg twice daily. Start
lisinopril 10mg once daily. Recheck HbA1c and renal function in 4 weeks.

**Tests ordered:** HbA1c, Basic metabolic panel

**Notes:** Patient counseled on medication adherence and lifestyle
modification.

Expect something like: E11.9 (T2DM), I10 (hypertension), 99213/99214
(office visit), 80048 (metabolic panel).

---

## 2. Asthma exacerbation

**Chief complaint:** Patient presents with worsening shortness of breath and
wheezing over the last 3 days, following an upper respiratory infection.

**Examination findings:** Respiratory rate 24/min, SpO2 94% on room air,
bilateral expiratory wheeze on auscultation, mild use of accessory muscles.

**Diagnosis:** Acute asthma exacerbation, moderate severity.

**Treatment plan:** Administered nebulized albuterol in-office, prescribed
short course of oral prednisone, albuterol inhaler for home use. Follow up
in 1 week or sooner if symptoms worsen.

**Tests ordered:** Peak flow measurement, chest X-ray

**Notes:** Reviewed inhaler technique with patient.

Expect something like: J45.901 (asthma, unspecified with exacerbation),
94640 (nebulizer treatment), 71046 (chest X-ray).

---

## 3. Ankle injury

**Chief complaint:** Patient twisted right ankle playing basketball
yesterday, presents with pain and swelling, difficulty bearing weight.

**Examination findings:** Moderate swelling and bruising over the lateral
right ankle, tenderness over the anterior talofibular ligament, no bony
tenderness at the malleoli, unable to bear weight for 4 steps.

**Diagnosis:** Right ankle sprain, lateral ligament complex, grade II.

**Treatment plan:** RICE protocol, ankle brace fitted, NSAIDs for pain and
swelling. Weight-bearing as tolerated. Follow up in 2 weeks, sooner if no
improvement.

**Tests ordered:** Ankle X-ray (3 views) to rule out fracture

**Notes:** Ottawa ankle rules reviewed; imaging obtained given inability to
bear weight in-office.

Expect something like: S93.401A (sprain of right ankle, initial encounter),
73610 (ankle X-ray, 3 views), 29405 (short leg cast/brace application) or a
99213/99214 office visit code.

---

Tip: try submitting a note with only the Chief Complaint filled in and
everything else blank — the model should return few or no codes rather than
guessing, since low-detail notes should not produce confident suggestions.
