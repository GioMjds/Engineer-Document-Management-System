# CVTEC EDMS – Manual Click-by-Click MVP Presentation Guide

> **Document Path**: `docs/manual-mvp-workflow.md`  
> **Target Audience**: Presenter, Evaluator, Demo Lead  
> **Test Project Code**: `26003` (or any fresh 5-digit number, e.g., `26004`)  
> **Baseline Reference**: [CVTEC_EDMS.md](file:///D:/giomj/Projects/engineer-docs-collab/CVTEC_EDMS.md)  
> **Simulated System Date**: **22 Oct 2026**  
> **Universal Password**: `cvtec123`

---

## 1. Overview & Demo Path

This manual guide takes you step-by-step through the live user interface:

1. **Admin**: Manually register project `26003`, staff the 7 roles, and set the baseline dates.
2. **Discipline Engineer**: Upload drawing `R00` and demonstrate strict edit/delete restrictions.
3. **Resident Engineer**: Review `R00` drawing and approve directly to `ready_for_authority`.
4. **Area Manager**: Review escalated submittals and audit confidential consultant fees.
5. **Authority Engineer**: Submit NOC, record payment receipt, and set the 14-day expiry date.
6. **Document Controller**: Upload revisions, archive obsolete file, and 1-click restore.
7. **Stage Progression**: Advance from **Pre-Construction** $\rightarrow$ **Construction** $\rightarrow$ **Handover** without getting stuck!
8. **CEO**: Verify executive KPIs, financial margin, 14-day expiry alert, and read-only lockdown.

---

## 2. Nearest Dates Cheat Sheet (Keep Handy While Typing)

All dates align with `CVTEC_EDMS.md` (Oct 14–22, 2026 baseline):

| Field in Drawer / Form            | Date to Type | Purpose in Demo                                             |
| :-------------------------------- | :----------- | :---------------------------------------------------------- |
| **Kick-off Date**                 | `2026-10-14` | Matches Jaylene's baseline date                             |
| **Survey Completion**             | `2026-10-16` | Topographical baseline                                      |
| **Concept Approval**              | `2026-10-18` | Satisfies `gate-concept`                                    |
| **Design Commencement**           | `2026-10-19` | Design phase start                                          |
| **Planned Completion**            | `2026-10-21` | Design completion                                           |
| **Building Permit Issuance**      | `2026-10-22` | Satisfies `gate-permit` (Today's date)                      |
| **Site Commencement**             | `2026-10-22` | Construction start date                                     |
| **Target Substantial Completion** | `2026-11-15` | Construction target milestone                               |
| **Testing & Commissioning**       | `2026-11-20` | Handover milestone                                          |
| **Civil Defence Inspection**      | `2026-11-25` | Handover milestone                                          |
| **BCC Issuance Date**             | `2026-11-30` | Building Completion Certificate                             |
| **NOC Expiry Date (DEWA/RTA)**    | `2026-11-04` | **13 days from today $\rightarrow$ Triggers 14-day alert!** |

---

## 3. Step-by-Step Manual Click Guide

### Step 1: Register New Project Manually

- **Login as**: `admin@test.com`
- **URL**: [localhost:3000/projects/new](http://localhost:3000/projects/new)

1. **Phase 1: Scope & Commercials**:
   - **Project Code**: Type `26003` (must be 5 numeric digits).
   - **Project Name**: Type `Creek Marina Pavilion`.
   - **Master Authority**: Select `Nakheel and Trakhees` (or `DEWA`).
   - **Initial Stage**: Select `Pre-Construction (Design)`.
   - **Client Name**: Type `Emaar Properties PJSC`.
   - **Contractor Name**: Type `Al Futtaim Construction`.
   - **Contractor Contract Sum**: Type `25000000` (AED 25,000,000).
   - **Confidential Consultant Fee**: Type `1800000` (AED 1,800,000).
   - **Client Email**: Type `client@emaar.ae`.
   - **Contractor Email**: Type `lead@alfuttaim.com`.
   - Click button **Next: Assign Team** (bottom right).

2. **Phase 2: Consultant Staffing**:
   - **Resident Engineer**: Select `Resident Engineer Lead (re@test.com)`.
   - **Area Manager**: Select `Hassan Al-Maktoum (am3@test.com)`.
   - **Authority Engineer**: Select `Zayed Al-Hashimi (ae3@test.com)`.
   - **Document Controller**: Select `Principal Document Controller (dc@test.com)`.
   - **Architectural Lead**: Select `Liam Thorne (architect@test.com)`.
   - **MEP Lead**: Select `Omar Farooq (mep@test.com)`.
   - **Structural Lead**: Select `David Chen (structural@test.com)`.
   - **Civil Lead**: Select `Aisha Al-Nuaimi (civil@test.com)`.
   - Click button **Register Project**.
   - _Outcome_: Toast notification displays `Project 26003 registered successfully.` You are redirected to `/projects`.

---

### Step 2: Milestone Baseline Setup

- **Login as**: `admin@test.com` (or `re@test.com`)
- **URL**: [localhost:3000/noc-tracker](http://localhost:3000/noc-tracker)

1. Select Project **26003** from the top project picker.
2. In the top right header, click **Inspect Gate Checklist**.
3. The `StageGateDrawer` opens on the right.
4. Under **Milestone Dates Reference**, click **Edit Dates** (top right of section).
5. Enter the dates:
   - **Kickoff**: `2026-10-14`
   - **Survey Completion**: `2026-10-16`
   - **Concept Approval**: `2026-10-18`
   - **Design Commencement**: `2026-10-19`
   - **Planned Completion**: `2026-10-21`
   - **Building Permit**: `2026-10-22`
   - **Site Commencement**: `2026-10-22`
   - **Target Substantial Completion**: `2026-11-15`
6. Click **Save Milestone Dates**.
7. _Outcome_: Checklist recalculates immediately. `gate-concept` and `gate-permit` update to green `Satisfied` badges.

---

### Step 3: Discipline Engineer Drawing Upload

- **Login as**: `architect@test.com` (Liam Thorne)
- **URL**: [localhost:3000/documents](http://localhost:3000/documents)

1. Click button **+ Upload Document** (top right).
2. In the modal:
   - **Project**: Select `26003 - Creek Marina Pavilion`.
   - **Discipline**: Select `Architectural`.
   - **Document Number**: Type `26003-ARC-001`.
   - **Title**: Type `Pavilion Concept Layout & Elevations`.
   - **Revision**: `R00`.
   - **File**: Drag-and-drop or browse any sample `.pdf` or `.dwg`.
   - Click **Upload & Submit**.
3. _Outcome_: Drawing appears in the documents list with a blue **Submitted** badge.
4. _Key Presenter Talking Point_: Point out that Liam **cannot edit or delete** his upload. Under CVTEC policy (Jaylene Answer #3), engineers only upload; adjustments require the Document Controller.

---

### Step 4: Resident Engineer Level-1 Technical Review

- **Login as**: `re@test.com` (Resident Engineer Lead)
- **URL**: [localhost:3000/review](http://localhost:3000/review)

1. In the Review Queue, filter or locate `26003-ARC-001`.
2. Click **Review** on the row.
3. The `DrawingReviewModal` opens:
   - Show the 3 decision buttons:
     - `Reject + Comment` (routes back to Liam for R01).
     - `Escalate to Area Manager` (second-level managerial sign-off).
     - `Approve (Direct)`.
4. Click **Approve (Direct)**.
5. _Outcome_: Drawing status updates to green badge **Ready for Authority**. Submittal leaves review queue.

---

### Step 5: Authority Engineer Permitting & 14-Day Expiry Radar

- **Login as**: `ae3@test.com` (Zayed Al-Hashimi)
- **URL**: [localhost:3000/noc-tracker](http://localhost:3000/noc-tracker)

1. Select Project **26003**.
2. Click on the first NOC row: `DEWA Substation & Electrical Load NOC`.
3. In `NocInspectorDrawer`:
   - Click button **Submit Application**.
   - Input Ref: `DEWA-2026-003`, Date: `2026-10-22`.
   - Click **Confirm Submission**. Status changes to **Submitted** (`applied`).
4. In Drawer, scroll to **Record Fee Payment**:
   - Payer: Select `Contractor`.
   - Amount: `12000`.
   - Receipt Number: `RCP-DEWA-003`.
   - Click **Record Payment**. Green `Paid` badge displays.
5. Scroll to **Record Authority Decision**:
   - Select: `Approved / Obtained`.
   - Certificate Ref: `CERT-DEWA-003`.
   - **Expiry Date**: Set to **`2026-11-04`** (13 days from today).
   - Click **Save Decision**.
6. _Outcome_: NOC status updates to **Approved**.
7. _Key Presenter Talking Point_: Because the expiry is set to 04 Nov 2026 (13 days away), the system immediately triggers the **14-day statutory expiry alert badge** in the CEO and Document Controller dashboards.

---

### Step 6: Document Controller Governance & Restore

- **Login as**: `dc@test.com` (Principal Document Controller)
- **URL**: [localhost:3000/documents](http://localhost:3000/documents)

1. Select Project `26003`.
2. Click **+ Upload Document**:
   - Doc Number: `26003-ARC-099`.
   - Title: `Superseded Concept Sketch`.
   - Revision: `R00`.
   - Attach file $\rightarrow$ Click **Upload & Submit**.
3. **Archive Document**:
   - On row `26003-ARC-099`, click `...` action menu $\rightarrow$ **Archive Document**.
   - Confirm archive. The file unlists from `/documents`.
4. **1-Click Restore**:
   - Click **Archive** in the left sidebar ([localhost:3000/archive](http://localhost:3000/archive)).
   - Locate `26003-ARC-099`.
   - Click button **Restore**.
   - _Outcome_: Document safely restores back to active directory with audit log intact.

---

### Step 7: Overcoming Construction Stoppage $\rightarrow$ Advance to Handover!

- **Login as**: `admin@test.com` or `am3@test.com`
- **URL**: [localhost:3000/noc-tracker](http://localhost:3000/noc-tracker)

> **Where you stopped previously**: In Project 26001, you advanced into Construction and stopped because you weren't sure how to transition from Construction to Handover. Here is how to complete both stage transitions cleanly:

1. **Advance Pre-Construction $\rightarrow$ Construction**:
   - Open `/noc-tracker` for Project `26003`.
   - Click **Inspect Gate Checklist**.
   - In the drawer footer, click:
     - **Advance to Construction** (if 7/7 gates satisfied) OR
     - **Advance to Construction (Advisory Override)** (amber button if specialist survey is still pending).
   - _Outcome_: Project stage changes to **Construction**! Stepper updates to show Construction active.

2. **Advance Construction $\rightarrow$ Handover**:
   - With Project `26003` now in **Construction**, click **Inspect Gate Checklist** again.
   - The drawer now shows **Construction Stage Milestones** and **Handover Target Milestones**.
   - Click **Edit Dates** in the drawer:
     - Testing & Commissioning: `2026-11-20`
     - Civil Defence Inspection: `2026-11-25`
     - Building Completion Certificate (BCC): `2026-11-30`
     - Click **Save Milestone Dates**.
   - Look at the sticky footer at the bottom of the drawer:
     - Click button: **Advance to Handover (Advisory Override)** (amber button) or **Advance to Handover**!
   - _Outcome_: Project stage changes to **Handover**! Stepper marks `Handover` stage active!
   - _You have now successfully driven the project through all 3 stages without getting stuck._

---

### Step 8: CEO Executive Health & Financial Margin Audit

- **Login as**: `ceo@test.com`
- **URL**: [localhost:3000/dashboard](http://localhost:3000/dashboard)

1. **Verify Financial Separation**:
   - CEO sees **Contractor Contract Sum (AED 25,000,000)**.
   - CEO sees **Confidential Consultant Fee (AED 1,800,000)** and calculates gross margin.
   - (Point out that Resident Engineer and Discipline Engineers are blocked from seeing the AED 1.8M consultant fee).
2. **Verify Lifecycle Progression**:
   - CEO sees Project `26003` in **Handover** stage.
3. **Verify 14-Day Expiry Radar**:
   - Look at **Upcoming Expiries Panel**.
   - Notice the DEWA NOC expiring on `04 Nov 2026` highlighted in amber.
4. **Verify Tamper-Proof Safeguards**:
   - Observe that the CEO dashboard contains **zero upload, edit, or approval buttons**. Complete read-only executive oversight.

---

## 4. Resetting or Creating Another Project Anytime

If you want to run the manual demo again with a completely blank canvas:

- Register a new project with code `26004` or `26005` at `/projects/new`.
- Follow Steps 1 through 8 above.
