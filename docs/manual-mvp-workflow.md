# CVTEC EDMS – Manual Click-by-Click MVP Presentation Guide

> **Document Path**: `docs/manual-mvp-workflow.md`  
> **Target Audience**: Presenter, Evaluator, Demo Lead  
> **Test Project Code**: `26004` (or any fresh 5-digit number, e.g., `26005`)  
> **Baseline Reference**: [CVTEC_EDMS.md](file:///D:/giomj/Projects/engineer-docs-collab/CVTEC_EDMS.md)  
> **Simulated System Date**: **22 Oct 2026**  
> **Universal Password**: `cvtec123`

---

## 1. Overview & Demo Path

This manual guide takes you step-by-step through the live user interface:

1. **Global Navigation & Command Deck**: Use `Ctrl+K` for global search/actions and `Ctrl+B` for sidebar rail collapse.
2. **Admin**: Manually register project `26004` using sequential auto-code generation, contract schedules, and searchable 2-phase consultant staffing.
3. **Projects Workspace & Team Management**: Review registered project cards, modify team assignments post-registration, and inspect deliverables.
4. **Discipline Engineer**: Upload drawing `R00` and demonstrate discipline ownership enforcement (e.g. Architectural cannot upload MEP).
5. **Resident Engineer**: Review `R00` drawing and approve directly to `ready_for_authority`.
6. **Area Manager**: Review escalated submittals and audit confidential consultant fees.
7. **Authority Engineer**: Submit NOC, record payment receipt, toggle permanent clearances vs 14-day expiry radar, and execute dispatched resubmissions.
8. **Document Controller**: Upload revisions, archive obsolete files, and execute 1-click restore from archive.
9. **Stage Progression**: Advance across all four lifecycle stages: **Pre-Construction** $\rightarrow$ **Construction** $\rightarrow$ **Handover** $\rightarrow$ **Completed**!
10. **CEO**: Verify executive KPIs, financial margin separation, 14-day expiry radar (ignoring permanent/completed clearances), and read-only lockdown.

---

## 2. Nearest Dates Cheat Sheet (Keep Handy While Typing)

All dates align with `CVTEC_EDMS.md` (Oct 14–22, 2026 baseline):

| Field in Drawer / Form                | Date to Type | Purpose in Demo                                             |
| :------------------------------------ | :----------- | :---------------------------------------------------------- |
| **Design Contract Commencement**      | `2026-10-14` | Registration form: Design phase contract start              |
| **Design Contract Completion**        | `2026-10-21` | Registration form: Design contract delivery deadline        |
| **Supervision Contract Commencement** | `2026-10-22` | Registration form: Supervision contract start date          |
| **Supervision Contract Target**       | `2026-11-30` | Registration form: Supervision target completion            |
| **Kick-off Date**                     | `2026-10-14` | Milestone drawer: Matches Jaylene's baseline date           |
| **Survey Completion**                 | `2026-10-16` | Milestone drawer: Topographical baseline                    |
| **Concept Approval**                  | `2026-10-18` | Milestone drawer: Satisfies `gate-concept`                  |
| **Design Commencement**               | `2026-10-19` | Milestone drawer: Design phase start                        |
| **Planned Completion**                | `2026-10-21` | Milestone drawer: Design completion                         |
| **Building Permit Issuance**          | `2026-10-22` | Milestone drawer: Satisfies `gate-permit` (Today's date)    |
| **Site Commencement**                 | `2026-10-22` | Milestone drawer: Construction start date                   |
| **Target Substantial Completion**     | `2026-11-15` | Milestone drawer: Construction target milestone             |
| **Testing & Commissioning**           | `2026-11-20` | Milestone drawer: Handover milestone                        |
| **Civil Defence Inspection**          | `2026-11-25` | Milestone drawer: Handover milestone                        |
| **BCC Issuance Date**                 | `2026-11-30` | Milestone drawer: Building Completion Certificate           |
| **NOC Expiry Date (DEWA/RTA)**        | `2026-11-04` | **13 days from today $\rightarrow$ Triggers 14-day alert!** |

---

## 3. Global Productivity & Command Deck Features

Before starting the project lifecycle demo, showcase the high-productivity shell features:

- **Global Command Palette (`Ctrl + K` or `Cmd + K`)**:
  - Press `Ctrl + K` anywhere in the app to open the quick command modal.
  - Search any accessible route, switch light/dark/system themes, or trigger **Register New Project**.
- **Collapsible Sidebar Rail (`Ctrl + B` or `Cmd + B`)**:
  - Press `Ctrl + B` or click the collapse button in the bottom left or top header to toggle between the 260px expanded menu and the 72px icon rail.
- **Header Utility Deck**:
  - Quick Search bar with shortcut indicator.
  - Notifications popover with real-time indicator dot for upcoming expiries and submittals.
  - User Profile popover showing name, email, system role, and 1-click sign out.

---

## 4. Step-by-Step Manual Click Guide

### Step 1: Register New Project Manually

- **Login as**: `admin@test.com`
- **URL**: [localhost:3000/projects/new](http://localhost:3000/projects/new) (or open via `Ctrl+K` $\rightarrow$ **Register New Project**)

#### Phase 1: Scope, Commercials & Contract Schedules

1. **Project Code**:
   - Notice the code is auto-populated with the next sequential code, or click the **Auto-Generate** (`#` icon) button.
   - Observe the real-time code availability indicator in green: `Next available sequential code: #26004` (or type `26004` to see `Code #26004 is available`).
2. **Master Authority**: Select `Nakheel and Trakhees` (or `DEWA` / `Dubai Municipality`).
3. **Initial Stage**: Select `Pre-Construction (Design)` (options: `Planning`, `Pre-Construction (Design)`, `Construction`, `Handover`, `Completed`).
4. **Project Name / Description**: Type `Creek Marina Pavilion`.
5. **Client Name**: Type `Emaar Properties PJSC`.
6. **Contractor Name**: Type `Al Futtaim Construction`.
7. **Client Notification Emails**: Type `pm@emaar.ae, director@emaar.ae` (comma-separated validation).
8. **Contractor Notification Emails**: Type `project@alfuttaim.com`.
9. **Client–Contractor Contract Sum (AED)**: Type `25000000` (AED 25,000,000).
10. **Client–Consultant Sum (AED) [Confidential]**: Type `1800000` (AED 1,800,000).
    - _Point out_: Restricted to Admin, CEO, and Area Manager.
11. **Contract Schedules & Target Dates (Optional)**:
    - **Design Contract**: Commencement `2026-10-14`, Completion `2026-10-21`.
    - **Supervision Contract**: Commencement `2026-10-22`, Target Completion `2026-11-30`.
12. **Submission Options**:
    - **Option A (Quick Register)**: Click **Quick Register (Skip Staffing)** to save immediately without assigning a team.
    - **Option B (2-Phase Wizard)**: Click **Next: Assign Team $\rightarrow$** (bottom right).

#### Phase 2: Consultant Team Staffing (Optional)

1. **Searchable Staff Popover**:
   - Each slot features a searchable popover (`StaffSelect`) grouping users into **Suggested for this role** (matching system roles first) and **Other staff**.
2. **Management & Permitting Oversight**:
   - **Resident Engineer (RE)**: Select `Resident Engineer Lead (re@test.com)`.
   - **Area Manager (AM)**: Select `Hassan Al-Maktoum (am3@test.com)`.
   - **Authority Engineer**: Select `Zayed Al-Hashimi (ae3@test.com)`.
   - **Document Controller (DC)**: Select `Principal Document Controller (dc@test.com)`.
3. **Multidisciplinary Engineering Leads**:
   - **Architectural Lead**: Select `Liam Thorne (architect@test.com)`.
   - **Structural Lead**: Select `David Chen (structural@test.com)`.
   - **MEP Lead**: Select `Omar Farooq (mep@test.com)`.
   - **Civil Lead**: Select `Aisha Al-Nuaimi (civil@test.com)`.
4. Click button **Register Project (8 Assigned)**.
   - _Outcome_: Toast confirms `Project 26004 created with 8 team members.` You are redirected directly to the interactive project view at `/projects/[projectId]`.
   - _Dirty State Guard_: If you try to cancel with unsaved data, the system opens a **Discard Unsaved Project?** confirmation modal to prevent accidental data loss.

---

### Step 2: Post-Registration Projects Workspace & Dynamic Team Management

- **Login as**: `admin@test.com`
- **URL**: [localhost:3000/projects](http://localhost:3000/projects)

1. Locate project **26004** in the Projects directory.
2. **Manage Team Anytime**:
   - Click button **Manage Team** on the project card.
   - The `ProjectTeamDialog` opens, showing the 4 oversight roles and 4 discipline leads with their assigned team members.
   - Adjust any member or add unassigned disciplines without recreating the project.
   - Click **Save Team Assignments**.
3. **View Documents**:
   - Click button **View Documents** to open the `ProjectDocumentsView` modal.
   - View deliverables and test programmatic file downloads.
4. Click **NOC Tracker** button to transition directly into `/noc-tracker/[projectId]`.

---

### Step 3: Milestone Baseline Setup & Custom Gate Prerequisites

- **Login as**: `admin@test.com`, `am3@test.com`, or `re@test.com`
- **URL**: [localhost:3000/noc-tracker](http://localhost:3000/noc-tracker)

1. Select Project **26004** from the top project picker.
2. In the top right header, click **Inspect Gate Checklist**.
3. The `StageGateDrawer` opens on the right.
4. **Enter Baseline Milestone Dates**:
   - Under **Milestone Dates Reference**, click **Edit Dates** (top right of section).
   - Enter the baseline dates:
     - **Kickoff**: `2026-10-14`
     - **Survey Completion**: `2026-10-16`
     - **Concept Approval**: `2026-10-18`
     - **Design Commencement**: `2026-10-19`
     - **Planned Completion**: `2026-10-21`
     - **Building Permit**: `2026-10-22`
     - **Site Commencement**: `2026-10-22`
     - **Target Substantial Completion**: `2026-11-15`
   - Click **Save Milestone Dates**.
   - _Outcome_: Checklist recalculates immediately. `gate-concept` and `gate-permit` update to green `Satisfied` badges.
5. **Default Stage Gate Prerequisites & Role Satisfaction Matrix**:
   - **Pre-Construction -> Construction**:
     - `gate-topo` (**Topographical Affection Survey Completed**): Survey Specialist / Lead Engineer approves survey in Third-Party Studies drawer or sets `surveyCompletionDate` in Milestone Dates.
     - `gate-geotech` (**Geotechnical Soil Investigation Approved**): Geotechnical Specialist / Area Manager / Lead Engineer uploads borehole report and clicks **Approve** in the Third-Party Studies drawer or uploads approved geotech document.
     - `gate-concept` (**Concept Master Plan & Affection Sign-Off**): Project Manager / Area Manager records `conceptApprovalDate` under Milestone Dates Reference.
     - `gate-noc-*` (**Statutory Authority NOCs - Design/Information**): Authority Liaison / Discipline Engineer marks NOC `Approved` or `Not Needed` (Exempt) in the NOC tracker table.
     - `gate-permit` (**Official Building Permit Issuance**): Project Manager / Area Manager records `buildingPermitDate` under Milestone Dates Reference.
   - **Construction -> Handover**:
     - `gate-noc-*` (**Statutory Construction NOCs**): Authority Liaison / Site Engineer marks Construction NOC `Approved` or `Not Needed`.
     - `gate-superstructure` (**Core & Structural Superstructure Inspection**): Lead Structural Engineer marks Structure discipline `Approved` in the Discipline Progress card or uploads an approved structural inspection document.
     - `gate-mep-submittal` (**MEP Riser & Chilled Water Commissioning Sign-off**): Lead MEP Engineer marks MEP discipline `Approved` in the Discipline Progress card or uploads an approved MEP drawing.
   - **Handover -> Completed**:
     - `gate-noc-*` (**Statutory Handover NOCs**): Authority Liaison / QA-QC Engineer marks Handover NOC `Approved` or `Not Needed`.
     - `gate-dcd` (**Civil Defence Fire & Life Safety Clearance**): Authority Liaison marks DCD NOC `Approved` or manager enters `civilDefenceInspectionDate`.
     - `gate-bcc` (**Building Completion Certificate (BCC)**): Project Manager / Area Manager enters `bccIssuanceDate` in Milestone Dates Reference.
6. **Custom Stage Gate Prerequisites**:
   - In the drawer, click button **+ Add Gate**.
   - Title: `Client Special Aesthetic Clearance`.
   - Category: Select `Discipline Technical Approval`.
   - Check **Mandatory for Stage Advancement**.
   - Action Hint: `Obtain written sign-off from Client Project Director`.
   - Click **Save Gate Prerequisite**.
   - _Outcome_: Custom prerequisite attaches to the stage gate checklist with an interactive toggle switch and delete button for authorized managers.

---

### Step 3B: Operational Discipline Progress & Specialist Clearances (/noc-tracker vs /dashboard)

- **Dedicated Operational Workspace**: [localhost:3000/noc-tracker/26004](http://localhost:3000/noc-tracker/26004)
- **Executive Read-Only Overview**: [localhost:3000/dashboard](http://localhost:3000/dashboard)

1. **Clear Separation of Operational Execution vs Executive Analytics**:
   - **NOC Tracker (`/noc-tracker/[projectID]`)**: Dedicated operational workspace where authorized roles (Discipline Engineers, Resident Engineers, Area Managers) update discipline milestones, manage authority review stages, and submit/manage third-party specialist studies and files.
   - **Executive Dashboard (`/dashboard`)**: Pure read-only analytics and KPI oversight across the portfolio. Discipline cards display read-only badges ("Analytics View") and direct users with "Open in NOC Tracker" buttons to prevent operational submission confusion on executive summary views.
2. **Integrated Discipline Progress Tracking on NOC Tracker**:
   - Displays progress across core engineering disciplines:
     - **Architectural**: Concept, Schematic, Detail Design, Tender / IFC.
     - **Structural**: Calculations, Foundation Drawings, Superstructure, Peer Review.
     - **MEP**: HVAC Load, Electrical Schematic, Plumbing / Drainage, Firefighting.
     - **Authority Approvals**: Design Stage, Construction Stage, Revision Stage.
     - **Third-Party Specialists**: Soil Investigation, Traffic Impact Study, Acoustic, Environmental, Waste Management, Wind Tunnel.
3. **Discipline Updates & Real-time Sync**:
   - Resident Engineers, Area Managers, and authorized Discipline Engineers click discipline status badges or "Manage Studies & Files" on `/noc-tracker/[projectID]` to update status (In Progress, Under Review, Approved, Rejected) or upload specialist clearance files.
   - Updates persist to `projects.milestones.disciplineStatus` and broadcast in real time across the application.
4. **Specialist Studies Submittal, Review & Revision Workflow**:
   - **Dynamic File Attachment (No Static/Simulated Mock Files)**:
     - Specialist consultants and engineers click **Attach Report**, **Replace**, or **Upload Revision** to directly open their device's native file picker (`.pdf`, `.dwg`, `.docx`, etc.).
     - The system dynamically parses actual file names and calculates exact byte sizes (KB/MB) instead of populating static hardcoded values.
     - Uploaders and managers can click the trash icon button to remove an erroneous file submission, returning that scope to `Pending Submission`.
   - **View & Download Submittals**:
     - Any authorized project user can click the **Download** button on any scope with an uploaded file.
     - Automatically generates and downloads technical transmittal document containing project metadata, file name, revision tag, and authority clearance stamps.
   - **Technical Review (Approve / Reject with Remarks)**:
     - Reviewers (`resident_engineer`, `area_manager`, `admin`) see action buttons for pending submittals.
     - **Approve**: Marks the study `Approved Study` (satisfying downstream stage gate prerequisites).
     - **Reject**: Opens an inline review remarks prompt. Reviewer inputs specific statutory deficiencies (e.g. `Borehole depth insufficient for high-rise loads`). Marks status `Rejected (Revise & Resubmit)` and logs reviewer attribution.
   - **Revision Resubmittal**:
     - Lead Engineers and Specialist Consultants see the prominent **Upload Revision** button on rejected scopes.
     - Re-uploading automatically increments the revision index (e.g. `R00` -> `R01`), resets status to `Uploaded / Under Review`, and clears prior rejection blocks for re-inspection.

---

### Step 4: Discipline Engineer Drawing Upload & Scope Enforcement

- **Login as**: `architect@test.com` (Liam Thorne – Architectural Lead)
- **URL**: [localhost:3000/documents](http://localhost:3000/documents)

1. Click button **+ Upload Document** (top right).
2. **Discipline Ownership Enforcement Test**:
   - In the modal, select Project: `26004 - Creek Marina Pavilion`.
   - Set Discipline to: `MEP` (deliberate mismatch).
   - Document Number: `26004-MEP-001`.
   - Title: `HVAC Schematic`.
   - Attach any sample file and click **Upload & Submit**.
   - _Outcome_: The server action rejects the submittal with:  
     `Upload rejected: Engineers can only upload drawings for their assigned discipline (ARCHITECT).`
3. **Correct Architectural Upload**:
   - Switch Discipline to: `Architectural`.
   - Document Number: `26004-ARC-001`.
   - Title: `Pavilion Concept Layout & Elevations`.
   - Revision: `R00`.
   - Attach file $\rightarrow$ Click **Upload & Submit**.
   - _Outcome_: Drawing appears in the documents list with a blue **Submitted** badge.
4. _Key Presenter Talking Point_: Point out that Liam **cannot edit or delete** his upload. Under CVTEC policy (Jaylene Answer #3), engineers only upload; adjustments and archiving require the Document Controller.

---

### Step 5: Resident Engineer Level-1 Technical Review

- **Login as**: `re@test.com` (Resident Engineer Lead)
- **URL**: [localhost:3000/review](http://localhost:3000/review)

1. In the Review Queue, filter or locate `26004-ARC-001`.
2. Click **Review** on the row.
3. The `DrawingReviewModal` opens:
   - Show the 3 decision buttons:
     - `Reject + Comment` (routes back to Liam for R01).
     - `Escalate to Area Manager` (second-level managerial sign-off).
     - `Approve (Direct)`.
4. Click **Approve (Direct)**.
5. _Outcome_: Drawing status updates to green badge **Ready for Authority**. Submittal leaves review queue.

---

### Step 6: Authority Engineer Permitting, Permanent Clearances & Expiry Radar

- **Login as**: `ae3@test.com` (Zayed Al-Hashimi)
- **URL**: [localhost:3000/noc-tracker](http://localhost:3000/noc-tracker)

1. Select Project **26004**.
2. Click on the first NOC row: `DEWA Substation & Electrical Load NOC`.
3. **Statutory Requirements & Custom Deliverables**:
   - Under **Statutory Checklist Requirements**, verify items are satisfied.
   - Point out the **+ Add Requirement** input to add custom project deliverables, or the delete button to remove obsolete requirements.
   - Click button **Submit Application**.
   - Input Authority Tracking Ref: `DEWA-2026-004`, Date: `2026-10-22`.
   - Click **Confirm Submission**. Status changes to **Submitted** (`applied`).
4. **Authority Fee Settlement**:
   - In Drawer, scroll to **Record Fee Payment**:
   - Payer: Select `Contractor` (or `Consultant Advance` / `Client`).
   - Amount: `12000`.
   - Receipt Number: `RCP-DEWA-004`.
   - Click **Record Payment**. Green `Paid` badge displays with payer classification.
5. **Authority Decision Recording: Temporary vs Permanent Clearances**:
   - Click button **Record Decision**:
   - **Scenario A: Temporary Permit (14-Day Expiry Radar)**:
     - Decision: `Approved / Obtained`.
     - Certificate Ref: `CERT-DEWA-004`.
     - Expiry Date: **`2026-11-04`** (13 days from today).
     - Click **Confirm Obtained**. NOC status updates to **Approved**.
     - _Outcome_: Amber `Expiring in 14 Days` badge displays in the alert banner and CEO radar.
   - **Scenario B: Permanent Milestone Clearance (No False Alarms)**:
     - Click **Update Validity** on the approved NOC.
     - Check the checkbox: **Permanent Clearance / Milestone NOC**.
     - Notice the Expiry Date field clears and disables with helper text: `This clearance is permanent and will not trigger renewal alerts.`
     - Click **Confirm Obtained**.
     - _Outcome_: Table displays green **Permanent** badge in Expiry Date column. Zero false alerts on dashboard!
6. **Dispatched Drawing Resubmission Flow**:
   - If a NOC is **Rejected** or **Expired**, the drawer unlocks **Resubmit Rejected Drawings** / **Resubmit for Revalidation**.
   - Enter revised file name (e.g. `DWG-26004-DCD-R01.pdf`) and click **Confirm & Dispatch**.
   - The submittal directly updates to **Submitted** (`applied`) with today's dispatch date as revision `R01`.
7. **Two-Tier Expiry Radar (Upcoming vs Lapsed)**:
   - **14-Day Amber Warning**: Permits expiring within 14 days trigger an amber alert button.
   - **Permit Expired Red Alert**: Lapsed validity dates raise a prominent red `Permit Expired` alert button with relative lapsed day counts.

---

### Step 7: Document Controller Governance & Restore

- **Login as**: `dc@test.com` (Principal Document Controller)
- **URL**: [localhost:3000/documents](http://localhost:3000/documents)

1. Select Project `26004`.
2. Click **+ Upload Document**:
   - Doc Number: `26004-ARC-099`.
   - Title: `Superseded Concept Sketch`.
   - Revision: `R00`.
   - Attach file $\rightarrow$ Click **Upload & Submit**.
3. **Archive Document**:
   - On row `26004-ARC-099`, click `...` action menu $\rightarrow$ **Archive Document**.
   - Confirm archive. The file unlists from `/documents`.
4. **1-Click Restore**:
   - Click **Archive** in the left sidebar ([localhost:3000/archive](http://localhost:3000/archive)).
   - Locate `26004-ARC-099`.
   - Click button **Restore**.
   - _Outcome_: Document safely restores back to active directory with audit log intact.

---

### Step 8: Complete Full 4-Stage Lifecycle ($\rightarrow$ Handover $\rightarrow$ Completed!)

- **Login as**: `admin@test.com` or `am3@test.com`
- **URL**: [localhost:3000/noc-tracker](http://localhost:3000/noc-tracker)

1. **Advance Pre-Construction $\rightarrow$ Construction**:
   - Open `/noc-tracker` for Project `26004`.
   - Click **Inspect Gate Checklist**.
   - In the drawer footer, click:
     - **Advance to Construction** (if all gates satisfied) OR
     - **Advance to Construction (Advisory Override)** (amber button if specialist survey is still pending).
   - _Outcome_: Project stage changes to **Construction**! Stepper marks Construction active.

2. **Advance Construction $\rightarrow$ Handover**:
   - In **Construction**, click **Inspect Gate Checklist** again.
   - Click **Edit Dates** under Milestone Dates Reference:
     - Testing & Commissioning: `2026-11-20`
     - Civil Defence Inspection: `2026-11-25`
     - Building Completion Certificate (BCC): `2026-11-30`
     - Click **Save Milestone Dates**.
   - In the drawer footer, click:
     - **Advance to Handover (Advisory Override)** or **Advance to Handover**!
   - _Outcome_: Project stage changes to **Handover**! Stepper marks Handover active.

3. **Advance Handover $\rightarrow$ Completed (Full Project Completion)**:
   - With Project `26004` now in **Handover**, click **Inspect Gate Checklist** once more.
   - Notice the terminal gate evaluation checks BCC and permanent clearances.
   - In the drawer footer, click:
     - **Complete Project Lifecycle** (or amber **Complete Project Lifecycle (Advisory Override)**).
   - _Outcome_: Project stage changes to **Completed**! Stepper marks terminal completion badge.
   - _Completed projects have no active site permits and are automatically excluded from urgent renewal radars._

---

### Step 9: CEO Executive Health & Financial Margin Audit

- **Login as**: `ceo@test.com`
- **URL**: [localhost:3000/dashboard](http://localhost:3000/dashboard)

1. **Verify Financial Separation**:
   - CEO sees **Contractor Contract Sum (AED 25,000,000)**.
   - CEO sees **Confidential Consultant Fee (AED 1,800,000)** and calculates gross margin.
   - (Point out that Resident Engineer and Discipline Engineers are blocked from seeing the AED 1.8M consultant fee).
2. **Verify Lifecycle Progression**:
   - CEO sees Project `26004` in **Handover** or **Completed** stage.
3. **Verify Smart Expiry Radar**:
   - Look at **Upcoming Expiries Panel**.
   - Permanent clearances and completed projects never appear as false renewal alarms.
   - Only active temporary permits expiring within 14 days display in amber.
4. **Verify Tamper-Proof Safeguards**:
   - Observe that the CEO dashboard contains **zero upload, edit, or approval buttons**. Complete read-only executive oversight.

---

## 5. Resetting or Creating Another Project Anytime

If you want to run the manual demo again with a completely blank canvas:

- Press `Ctrl + K` and select **Register New Project**, or go to `/projects/new`.
- Click **Auto-Generate** to get the next clean sequential code (e.g. `26005`).
- Follow Steps 1 through 9 above.
