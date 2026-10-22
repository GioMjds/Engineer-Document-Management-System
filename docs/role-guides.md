# CVTEC EDMS – Comprehensive Role Action & System Visibility Guide

> **Document Path**: `docs/role-guides.md`  
> **Applicable Version**: CVTEC EDMS 1.0  
> **Target Audience**: All System Users, Project Engineers, Administrators, Document Controllers, and Executive Leadership

---

## 1. Executive Summary & Architecture Overview

The CVTEC Engineering Document Management System (EDMS) enforces a strict, role-based operational model governing engineering drawings, statutory Non-Objection Certificates (NOCs), project lifecycles, and financial confidentiality.

The system defines exactly **seven canonical user roles** and **four engineering disciplines**. Disciplines are assigned per-project to engineering personnel and do not confer administrative or review privileges.

### Canonical Roles

1. **Administrator (`admin`)**: Unrestricted operational and governance authority across the platform.
2. **Chief Executive Officer (`ceo`)**: High-level strategic executive monitoring across all projects (read-only).
3. **Area Manager (`area_manager`)**: Regional oversight, second-level technical reviewer, and executive financials viewer.
4. **Resident Engineer (`resident_engineer`)**: First-level technical reviewer for submitted engineering drawings.
5. **Authority Engineer (`authority_engineer`)**: Statutory authority liaison managing permitting, submissions, and fees.
6. **Engineer (`engineer`)**: Technical author uploading drawings and revisions across assigned disciplines.
7. **Document Controller (`dc`)**: Document custodian managing file revisions, metadata, archiving, and permitting tracking.

### Engineering Disciplines

- **MEP (`mep`)**: Mechanical, Electrical, and Plumbing engineering.
- **Architect (`architect`)**: Architectural design and layout documentation.
- **Structure (`structure`)**: Structural calculations, foundation, and framing plans.
- **Civil (`civil`)**: Infrastructure, grading, utilities, and earthworks.

---

## 2. Master System Visibility & Access Matrix

The following table details the exact permissions, data visibility, and action boundaries for every role in the system:

| Functional Area                      |      Admin       |       CEO        |   Area Manager   | Resident Engineer | Authority Engineer |   Engineer    | Document Controller |
| :----------------------------------- | :--------------: | :--------------: | :--------------: | :---------------: | :----------------: | :-----------: | :-----------------: |
| **Project Scope**                    | **All Projects** | **All Projects** | **All Projects** |   Assigned Only   |   Assigned Only    | Assigned Only |    Assigned Only    |
| **Document View / Download**         |   All Projects   |   All Projects   |   All Projects   |   Assigned Only   |   Assigned Only    | Assigned Only |    Assigned Only    |
| **Initial Upload (R00)**             |        ✓         |        —         |        —         |         —         |      ✓ (Own)       |       ✓       |          ✓          |
| **Revision Upload (R01+)**           |        ✓         |        —         |        —         |         —         |      ✓ (Own)       | ✓ (On Reject) |          ✓          |
| **In-Place Edit / Replace**          |     ✓ (Any)      |        —         |        —         |         —         |    ✓ (Own Only)    |       —       |  ✓ (Any in Scope)   |
| **Archive / Soft Delete**            |        ✓         |        —         |        —         |         —         |         —          |       —       |          ✓          |
| **Permanent Purge**                  |  ✓ (Exclusive)   |        —         |        —         |         —         |         —          |       —       |          —          |
| **1st-Level Review (Submitted)**     |     ✓ (Any)      |        —         | ✓ (If RE Absent) |    ✓ (Primary)    |         —          |       —       |          —          |
| **2nd-Level Review (Escalated)**     |     ✓ (Any)      |        —         |   ✓ (Primary)    |         —         |         —          |       —       |          —          |
| **NOC Matrix View**                  |        ✓         |        —         |        —         |         —         |         ✓          |       —       |          ✓          |
| **NOC Matrix Edit**                  |        ✓         |        —         |        —         |         —         |         ✓          |       —       |          ✓          |
| **NOC Tracker View**                 |        ✓         |  ✓ (Read-Only)   |  ✓ (Read-Only)   |   ✓ (Read-Only)   |         ✓          | ✓ (Read-Only) |          ✓          |
| **NOC Tracker Update & Fees**        |        ✓         |        —         |        —         |         —         |         ✓          |       —       |          ✓          |
| **NOC Sequence Override**            |  ✓ (Exclusive)   |        —         |        —         |         —         |         —          |       —       |          —          |
| **Contractor Amount (Public)**       |        ✓         |        ✓         |        ✓         |         ✓         |         ✓          |       ✓       |          ✓          |
| **Consultant Amount (Confidential)** |        ✓         |        ✓         |        ✓         |    — (Hidden)     |     — (Hidden)     |  — (Hidden)   |     — (Hidden)      |
| **User Administration**              |        ✓         |        —         |        —         |         —         |         —          |       —       |          —          |
| **14-Day Expiry Email Alerts**       |        —         |        —         |        —         |         —         |         ✓          |       ✓       |          ✓          |

---

## 3. Core Entities & Lifecycle Governance

### 3.1 Projects & Scope Enforcement

- **Storage & Isolation**: Projects are stored in `public.projects`. Cross-project roles (`admin`, `ceo`, `area_manager`) see every project globally via `private.can_see_project()`. Field and operational roles (`resident_engineer`, `authority_engineer`, `engineer`, `dc`) only see projects where their user ID is explicitly assigned in `public.project_members`.
- **Project Registration**: Handled exclusively by `admin` at `/projects/new`. When an admin creates a project, the system automatically instantiates the complete statutory NOC requirement matrix and deliverable checklists for the selected Master Authority (e.g., Nakheel, Dubai Municipality, DDA).
- **Project Code Standard**: Project codes enforce a strict 5-digit numeric format (`^[0-9]{5}$`) via database check constraint `projects_code_check`. Standard convention uses a 2-digit year plus a 3-digit sequence (`YYNNN`, e.g., `26001`, `23015`, `23016`). Alphanumeric codes or prefixes (such as `PRJ-2026-001`) violate `projects_code_check` and are rejected by Supabase.

### 3.2 Documents & Engineering Drawing Review Lifecycle

Engineering documents pass through a strict state machine to ensure compliance before authority submission:

```text
[Initial Upload: R00]
         │
         ▼
     (submitted) ────────────── RE Reviews ─────────────────┐
         │                                                  │
   RE Rejects                                               │ RE Approves &
(Mandatory Note)                                            │ Escalates
         │                                                  ▼
         ▼                                             (escalated)
    (rejected)                                              │
         │                                            AM Reviews
         │ Author Resubmits                                 │
         │ (Uploads R01)                            AM Approves
         │                                                  │
         └──────────────────────────────────────────────────┴──────► (ready_for_authority)
```

1. **Submission**: Engineer, DC, or Authority Engineer uploads the initial drawing (Revision `R00`). Status is set to `submitted`.
2. **First-Level Review (RE)**:
   - **Direct Approval**: Transitions drawing directly to `ready_for_authority` (ready for statutory submission).
   - **Approve & Escalate**: Flags drawing for regional management review; status transitions to `escalated`.
   - **Rejection**: Requires a mandatory written comment (minimum 5 characters). Status transitions to `rejected`.
3. **Second-Level Review (AM)**:
   - Evaluates `escalated` drawings and `submitted` drawings where no RE is assigned to the project.
   - **Approve**: Transitions status to `ready_for_authority`.
   - **Reject**: Requires a mandatory written comment. Status transitions to `rejected`.
4. **Revision Recovery**: When a drawing is rejected, the author reviews the feedback and uploads revision `R01`. The revision is incremented, and status resets to `submitted` for re-review.
5. **Archiving vs Purging**:
   - **Soft Delete (Archive)**: Performed by `admin` and `dc`. Moves document to `/archive` (`archived_at` timestamp recorded). Can be restored at any time.
   - **Permanent Purge**: Executable **only** by `admin`. Completely erases the database record and deletes the binary blob from Supabase Storage.

### 3.3 NOC Permitting, Matrix & Expiry Lifecycles

- **Master & Reviewing Authorities**: Master Authorities (e.g., Nakheel & Trakhees, Dubai Municipality, Dubai Development Authority) define the jurisdiction. Reviewing Authorities (e.g., DEWA, RTA, DCD, DM) issue specific technical clearances.
- **Sequence Dependencies**: NOCs enforce strict prerequisite chains (e.g., DEWA Water cannot be submitted before Master Plan Approval is obtained). The system blocks premature submission unless overridden by an Administrator.
- **Statutory Permitting Flow**:
  1. **Not Started**: Requirement established from template.
  2. **Submitted**: Application reference number, submission date, and receipt proof logged.
  3. **Fee Recording**: Statutory fee amount (AED), paying party (`Client`, `Contractor`, `Consultant Advance`), and receipt number recorded.
  4. **Authority Result**:
     - **Obtained**: Stamped certificate uploaded, and **mandatory Expiry Date** recorded.
     - **Rejected**: Authority rejection reason recorded; creates a tracked resubmission cycle.
  5. **Automated Expiry Alert**: An automated background routine monitors expiry dates and sends alert emails 14 days prior to expiration to the assigned `authority_engineer`, `engineer`, and `dc`.

### 3.4 Financial Confidentiality Separation

To prevent commercial leaks, financial contract sums are physically split across two database tables:

1. **Contractor Contract Sum (`client_contractor_amount`)**:
   - Resides in `public.projects`.
   - Visible to all roles who have access to the project.
2. **Consultant Contract Sum (`client_consultant_amount`)**:
   - Resides in `public.project_confidential`.
   - Protected by Postgres Row-Level Security (`confidential_amounts_select`).
   - Accessible **exclusively** to `admin`, `ceo`, and `area_manager`.
   - Completely inaccessible to `dc`, `engineer`, `resident_engineer`, and `authority_engineer` across all API payloads and SQL queries.

---

## 4. Role-by-Role Step-by-Step UI Action Guides

---

### 4.1 Administrator (`admin`)

#### Role Mission

Full governance and operational authority. Responsible for user lifecycle, project onboarding, emergency sequence overrides, permanent purging, and cross-project oversight.

#### Sidebar Navigation

- **Overview**: Dashboard (`/dashboard`)
- **Authorities**: NOC Tracker (`/noc-tracker`), NOC Matrix (`/noc-matrix`)
- **Documents**: Documents (`/documents`), Review (`/review`), Archive (`/archive`)
- **Administration**: Users (`/users`)

#### Visibility

- **Projects**: All projects globally.
- **Documents**: All documents across all projects.
- **NOCs**: All statutory NOCs and blueprint matrix templates.
- **Financials**: Both Contractor Amount and Confidential Consultant Amount.

---

#### Step-by-Step Click Guides

##### A. Creating a New Project

1. Navigate to `/projects/new` (or click **"New Project"** on the projects list or empty tracker screen).
2. Enter the **Project Code** (e.g., `26001` or `23017`).
   - _Requirement_: Exactly 5 numeric digits (`YYNNN`, 2-digit year + 3-digit counter) per Supabase check constraint `projects_code_check`. Do not use prefixes or dashes like `PRJ-2026-001`.
3. Enter the **Project Title / Description** (e.g., `Al Wasl Residential Tower Phase 2`).
4. Enter the **Client Name** and **Contractor Name**.
5. Select the **Master Authority** from the dropdown (e.g., `Nakheel & Trakhees`, `Dubai Municipality`, or `Dubai Development Authority`).
6. Select the **Project Stage** (`Pre-Construction`, `Construction`, or `Handover`).
7. Enter financial values:
   - **Contractor Amount (AED)** (e.g., `45,000,000`).
   - **Consultant Amount (AED)** (e.g., `3,200,000`) _(stored in confidential vault)_.
8. Add notification emails:
   - Type client contact emails in the **Client Emails** input.
   - Type contractor contact emails in the **Contractor Emails** input.
9. Choose creation path:
   - **Quick Register (Skip Staffing)**: Creates the project immediately with no initial member assignments.
   - **Next: Assign Team**: Advances to **Phase 2: Consultant Staffing**.
10. In **Phase 2: Consultant Staffing (Optional)**:
    - Select oversight personnel: **Resident Engineer (RE)**, **Area Manager (AM)**, **Authority Engineer**, and **Document Controller (DC)**.
    - Select discipline engineering leads: **Architectural Lead**, **Structural Lead**, **MEP Lead**, and **Civil Lead**.
    - Click **"Register Project with Team"** (or **"Skip Staffing & Register"**).
    - _Result_: The system creates the project, stores confidential financials, assigns selected consultant team members to `public.project_members`, and automatically clones all statutory NOC checklist items from the selected Master Authority template.

##### B. Inviting a New User & Managing Roles

1. Click **Users** (`/users`) in the navigation bar.
2. Click the **"+ Invite User"** button in the upper right.
3. In the dialog:
   - Enter the user's **Email Address**.
   - Enter the user's **Full Name**.
   - Select the assigned **Role** (`Admin`, `CEO`, `Area Manager`, `Resident Engineer`, `Authority Engineer`, `Engineer`, `Document Controller`).
4. Click **"Send Invitation"**.
5. To change an existing user's role:
   - Find the user in the table.
   - Click the inline **Role Selector** dropdown.
   - Select the updated role. _(Self-demotion and demoting the last active admin are automatically prevented)._

##### C. Overriding a Blocked NOC Prerequisite Sequence

1. Click **NOC Tracker** (`/noc-tracker`).
2. Select the target project from the project picker.
3. Click on the blocked NOC item. The **NOC Inspector Drawer** slides out from the right.
4. Locate the prerequisite warning banner: _"Prerequisites Required"_.
5. Click the **"Override Sequence"** button (shield icon).
6. In the modal:
   - Enter a **Justification Reason** (minimum 5 characters, e.g., _"Statutory waiver granted under Ministerial Decree 412"_).
7. Click **"Confirm Override"**.
   - _Result_: The prerequisite block is cleared, submission is unlocked, and an audit log entry is permanently written.

##### D. Permanently Purging an Archived Document

1. Click **Archive** (`/archive`).
2. Locate the soft-deleted document in the table.
3. Click the red **"Purge"** button (trash icon).
4. In the **Purge Confirmation Modal**:
   - Type the confirmation phrase (the document number or `"CONFIRM PURGE"`).
5. Click **"Delete Permanently"**.
   - _Result_: The file blob is purged from Supabase Storage and the database record is erased.

##### E. Performing an Administrative Drawing Review

1. Click **Review** (`/review`).
2. Locate any drawing with status `submitted` or `escalated`.
3. Click **"Review"** to open the `DrawingReviewModal`.
4. To approve: Click **"Approve (Direct)"** (transitions to `ready_for_authority`).
5. To reject: Click **"Reject Drawing"**, type technical feedback (min 5 characters), and click **"Confirm Rejection"**.

---

### 4.2 Document Controller (`dc`)

#### Role Mission

Central document administrator for assigned projects. Manages drawing uploads, administrative metadata adjustments, soft-delete archiving, document restoration, and statutory permitting records.

#### Sidebar Navigation

- **Overview**: Dashboard (`/dashboard`)
- **Authorities**: NOC Tracker (`/noc-tracker`), NOC Matrix (`/noc-matrix`)
- **Documents**: Documents (`/documents`), Archive (`/archive`)
- _(Hidden: Users, Review Queue)_

#### Visibility

- **Projects**: Assigned projects only.
- **Documents**: All documents within assigned projects.
- **NOCs**: NOC Tracker and Matrix for assigned projects.
- **Financials**: Contractor Amount only. Consultant Amount is strictly hidden.
- Subscribed to 14-day statutory NOC expiry emails.

---

#### Step-by-Step Click Guides

##### A. Uploading an Engineering Document / Drawing

1. Click **Documents** (`/documents`).
2. Click the **"+ Upload Document"** button.
3. In the upload modal:
   - Select the **Project** from the dropdown (only assigned projects are listed).
   - Select the **Discipline** (`MEP`, `Architect`, `Structure`, `Civil`).
   - Enter the **Document Number** (e.g., `CVTEC-PRJ1-MEP-DWG-001`).
   - Enter the **Title** and optional **Description**.
   - Attach the drawing or document file (PDF, DWG, BIM, DOCX).
4. Click **"Upload & Submit"**.
   - _Result_: Initial revision `R00` is registered with status `submitted`.

##### B. In-Place Editing Document Metadata or Replacing a File

1. On `/documents`, locate the target document.
2. In the right-hand **Actions** column, click the **Edit** icon (pencil).
3. In the edit modal:
   - Modify the Title, Description, Discipline, or Document Number.
   - Optionally choose a corrected replacement file if correcting an administrative upload mistake.
4. Click **"Save Changes"**.

##### C. Soft-Deleting / Archiving an Obsolete Document

1. On `/documents`, find the document row.
2. Click the **Archive** icon (archive box).
3. In the confirmation dialog, review the warning.
4. Click **"Confirm Archive"**.
   - _Result_: Document status updates to `archived` and disappears from active project views into `/archive`.

##### D. Restoring an Archived Document

1. Click **Archive** (`/archive`).
2. Browse or search for the archived document.
3. Click the **"Restore"** button (undo arrow).
4. Confirm restoration.
   - _Result_: Document clears `archived_at` and returns to active status in `/documents`.

##### E. Recording Statutory Applications & Fees in NOC Tracker

1. Click **NOC Tracker** (`/noc-tracker`).
2. Select the assigned project from the header picker.
3. Click on the statutory NOC item (e.g., `Civil Defence Approval`).
4. In the inspector drawer:
   - **Log Submission**: Click **"Submit Application"**, enter the Authority Portal Reference Number, submission date, attach proof, and click **"Save Submission"**.
   - **Record Fee**: Click **"Record Payment"**, enter the statutory fee in AED, select Payer (`Client`, `Contractor`, or `Consultant Advance`), input the Receipt Reference, and click **"Save Fee Record"**.
   - **Log Obtained NOC**: Click **"Record Authority Result"**, select **"Approved / Obtained"**, enter the **Mandatory Expiry Date**, attach the stamped certificate, and click **"Save Result"**.

#### What is Hidden or Blocked

- Cannot access `/users` or change user roles.
- Cannot approve or reject engineering drawings (`/review` route blocked).
- Cannot permanently purge files (Purge button not rendered).
- Cannot view confidential consultant fees (`client_consultant_amount` column is nullified).
- Cannot override prerequisite sequence without Admin authorization.

---

### 4.3 Authority Engineer (`authority_engineer`)

#### Role Mission

Statutory authority specialist and government liaison. Manages authority submissions, NOC tracking, statutory fee payments, permits, and authority matrix requirements.

#### Sidebar Navigation

- **Overview**: Dashboard (`/dashboard`)
- **Authorities**: NOC Tracker (`/noc-tracker`), NOC Matrix (`/noc-matrix`)
- **Documents**: Documents (`/documents`)
- _(Hidden: Review Queue, Archive, Users)_

#### Visibility

- **Projects**: Assigned projects only.
- **Documents**: Assigned project documents; can inspect approved drawings (`ready_for_authority`) to compile authority submission packages.
- **NOCs**: Full update rights on NOC Tracker and Matrix for assigned projects.
- **Financials**: Contractor Amount only. Consultant Amount is hidden.
- Subscribed to 14-day statutory NOC expiry emails.

---

#### Step-by-Step Click Guides

##### A. Downloading Approved Drawing Packages for Authority Submissions

1. Click **Documents** (`/documents`).
2. In the **Status Filter** dropdown, select **"Approved for Authority Submission"** (`ready_for_authority`).
3. Locate the drawings approved by RE/AM.
4. Click the **Download** icon on each row to download the official submission-ready drawing files.

##### B. Submitting an Application to a Statutory Authority

1. Click **NOC Tracker** (`/noc-tracker`).
2. Select your assigned project.
3. Click the target NOC card or row.
4. In the **NOC Inspector Drawer**:
   - Ensure all prerequisite approvals are marked as `obtained`.
   - Click **"Submit Application"**.
5. In the `SubmissionModal`:
   - Enter the **Authority Tracking / Reference Number** (e.g., `DCD-SUB-2026-00412`).
   - Select the **Submission Date**.
   - Upload the statutory submission receipt or portal acknowledgment slip.
   - Click **"Confirm Submission"**.
   - _Result_: Status updates to `submitted`.

##### C. Recording Authority Fee Payments & Receipts

1. In the **NOC Inspector Drawer**, locate the **Fee & Receipt Management** section.
2. Click **"Record Payment"**.
3. Enter:
   - **Fee Amount (AED)**.
   - **Paying Party** (`Client`, `Contractor`, or `Consultant Advance`).
   - **Receipt / Challan Number**.
   - Attach official payment voucher / receipt file.
4. Click **"Save Fee Record"**.

##### D. Logging Obtained NOC Approvals and Setting Expiry

1. In the **NOC Inspector Drawer**, click **"Record Authority Result"**.
2. In the `AuthorityResultModal`:
   - Choose **"Approved / Obtained"**.
   - Enter the **Mandatory Expiry Date** specified on the official permit.
   - Upload the stamped, final NOC certificate file.
3. Click **"Save Result"**.
   - _Result_: Status becomes `obtained`. The system calculates days remaining and activates the automated 14-day expiry warning alert.

##### E. Logging Authority Rejections & Initiating Resubmission

1. In the **NOC Inspector Drawer**, click **"Record Authority Result"**.
2. Choose **"Rejected"**.
3. In the mandatory **Rejection Reason** field, copy the exact rejection comments and technical deficiencies issued by the authority portal.
4. Click **"Save Result"**.
   - _Result_: Status becomes `rejected` and creates a resubmission cycle entry (R01).

##### F. Editing NOC Matrix Templates

1. Click **NOC Matrix** (`/noc-matrix`).
2. Select the Master Authority tab.
3. Click **"+ Add NOC Requirement"** or click an existing item to open `MatrixItemEditorDrawer`.
4. Update details: Title, Reviewing Authority, Stage, Prerequisites, Estimated Days, and Estimated Fee.
5. In the **Justification** field, enter a mandatory explanation for the change.
6. Click **"Publish Changes"**. (Updates propagate to unobtained project NOCs while keeping obtained ones locked).

#### What is Hidden or Blocked

- Cannot approve or reject engineering drawings.
- Cannot soft-delete or purge documents.
- Cannot view confidential consultant financials.
- Cannot override prerequisite sequence without Admin authorization.

---

### 4.4 Engineer (`engineer` - MEP, Architect, Structure, Civil)

#### Role Mission

Technical drawing production and design authoring. Uploads initial engineering drawings, tracks review status, and resubmits updated revisions when reviewers request changes.

#### Sidebar Navigation

- **Overview**: Dashboard (`/dashboard`)
- **Authorities**: NOC Tracker (`/noc-tracker`) (Read-Only)
- **Documents**: Documents (`/documents`)
- _(Hidden: Review Queue, NOC Matrix, Archive, Users)_

#### Visibility

- **Projects**: Assigned projects only.
- **Documents**: Assigned project documents; can filter by assigned discipline (`mep`, `architect`, `structure`, `civil`).
- **NOCs**: Read-only timeline of project statutory milestones.
- **Financials**: Contractor Amount only. Consultant Amount is hidden.
- Subscribed to 14-day statutory NOC expiry emails.

---

#### Step-by-Step Click Guides

##### A. Uploading an Initial Drawing (Revision R00)

1. Click **Documents** (`/documents`).
2. Click the **"+ Upload Document"** button in the header.
3. In the upload dialog:
   - Select the assigned **Project**.
   - Select your **Discipline** (MEP, Architect, Structure, or Civil).
   - Enter the **Drawing Sheet Number** (e.g., `MEP-E-201`).
   - Enter the **Drawing Title** (e.g., `Basement Level 1 Electrical Power Layout`).
   - Choose the drawing file (PDF, DWG, BIM).
4. Click **"Upload & Submit"**.
   - _Result_: The file is uploaded, tagged with revision `R00`, and set to `submitted` status for Resident Engineer technical evaluation.

##### B. Tracking Drawing Review Status

1. On `/documents`, inspect the **Status** column:
   - **Yellow Badge (`submitted`)**: Under first-level review by the Resident Engineer.
   - **Orange Badge (`escalated`)**: Escalated to Area Manager for complex technical sign-off.
   - **Green Badge (`ready_for_authority`)**: Drawing approved! Ready for statutory submission.
   - **Red Badge (`rejected`)**: Reviewer requested modifications.

##### C. Addressing Rejections and Resubmitting Revisions (R01+)

1. When a drawing displays the red **`rejected`** badge on `/documents`:
2. Click on the row or expand the **Rejection Feedback Card** beneath the item.
3. Read the reviewer's technical non-compliance comments.
4. Correct the drawing in your CAD/BIM software.
5. In the drawing row actions, click the **"Upload Revision"** icon (`FileUp`).
6. In the `DocumentRevisionModal`:
   - Notice the revision label is automatically bumped (e.g., `R00` -> `R01`).
   - Upload the corrected drawing file.
   - In the **Revision Changelog**, describe the adjustments made (e.g., _"Upgraded cable tray sizing and recalculated voltage drop per RE comments"_).
7. Click **"Submit Revision"**.
   - _Result_: Revision `R01` is saved, status resets to `submitted`, and the drawing re-enters the Resident Engineer's review queue.

##### D. Checking Project Statutory Progress

1. Click **NOC Tracker** (`/noc-tracker`).
2. Select your assigned project.
3. View the pipeline of required authority clearances and milestone completion bars.

#### What is Hidden or Blocked

- Cannot edit metadata or replace files in-place (must route adjustments through DC).
- Cannot delete or archive documents.
- Cannot approve drawings or access `/review`.
- Cannot edit the NOC Matrix or modify NOC Tracker items.
- Cannot view confidential consultant financials.

---

### 4.5 Resident Engineer (`resident_engineer`)

#### Role Mission

First-level technical reviewer on assigned projects. Evaluates engineering drawings for technical standard compliance, approves drawings directly, escalates complex items to the Area Manager, or rejects non-compliant submissions with clear feedback.

#### Sidebar Navigation

- **Overview**: Dashboard (`/dashboard`)
- **Authorities**: NOC Tracker (`/noc-tracker`) (Read-Only)
- **Documents**: Documents (`/documents`), Review (`/review`)
- _(Hidden: NOC Matrix, Archive, Users)_

#### Visibility

- **Projects**: Assigned projects only.
- **Documents**: Assigned project documents.
- **Review Queue**: All drawings with status `submitted` in assigned projects.
- **Financials**: Contractor Amount only. Consultant Amount is hidden.

---

#### Step-by-Step Click Guides

##### A. Reviewing Submitted Drawings

1. Click **Review** (`/review`) in the sidebar.
2. Review the list of drawings awaiting first-level evaluation (`status === 'submitted'`).
3. Check the Project, Discipline, Drawing Sheet Number, Title, Author, and Revision.
4. Click the **"Review"** button on the row to launch the `DrawingReviewModal`.

##### B. Inspecting Drawing Details

1. In the `DrawingReviewModal`:
   - Click **"Download / Preview Drawing"** to open and inspect the CAD/PDF technical submittal.
   - Check the **Author Information** and **Submission Timestamp**.
   - If reviewing a revision (e.g., `R01`), review the **Revision History** list and the author's changelog notes.

##### C. Option 1: Direct Approval (Standard Drawings)

1. If the drawing complies with all engineering codes and specifications:
2. In the **Review Decision Panel**, click the green **"Approve (Direct)"** button.
3. _Result_: Drawing status immediately updates to `ready_for_authority` (Approved for Authority Submission) and is removed from your pending queue.

##### D. Option 2: Approve & Escalate (Complex Drawings)

1. If the drawing contains structural deviations, high-budget impacts, or complex utility tie-ins:
2. In the **Review Decision Panel**, click the amber **"Approve & Escalate (AM)"** button.
3. _Result_: Drawing status transitions to `escalated` and routes directly to the Area Manager's review queue.

##### E. Option 3: Rejecting a Non-Compliant Drawing

1. If the drawing fails technical compliance:
2. Click the red **"Reject Drawing"** button.
3. In the expanded rejection form, enter detailed technical instructions in the **Rejection Comment** textarea:
   - _Requirement_: Minimum 5 non-whitespace characters (e.g., _"Pipe slope does not meet minimum 1:100 fall requirement per Dubai Municipality plumbing code"_).
   - The confirmation button remains disabled until valid text is entered.
4. Click **"Confirm Rejection"**.
5. _Result_: Drawing status updates to `rejected` and returns to the author's dashboard with your comments attached.

#### What is Hidden or Blocked

- Cannot upload new drawings directly (`/documents` upload modal is disabled).
- Cannot in-place edit or replace drawings.
- Cannot soft-delete or purge documents.
- Cannot edit NOC Matrix or update NOC Tracker items.
- Cannot view confidential consultant financials.

---

### 4.6 Area Manager (`area_manager`)

#### Role Mission

Regional engineering oversight and second-level technical reviewer. Resolves escalated drawings, acts as primary reviewer when RE is absent, and monitors regional project delivery and full contract financials.

#### Sidebar Navigation

- **Overview**: Dashboard (`/dashboard`)
- **Authorities**: NOC Tracker (`/noc-tracker`) (Read-Only)
- **Documents**: Documents (`/documents`), Review (`/review`)
- _(Hidden: NOC Matrix, Archive, Users)_

#### Visibility

- **Projects**: All projects across the region (`project.viewAll`).
- **Documents**: All documents across all projects.
- **Review Queue**: Drawings with status `escalated`, plus drawings with status `submitted` on projects with no assigned Resident Engineer.
- **Financials**: Both Contractor Amount and Confidential Consultant Amount.

---

#### Step-by-Step Click Guides

##### A. Reviewing Escalated Drawings

1. Click **Review** (`/review`).
2. Look for rows marked with the orange **"Escalated by RE"** badge.
3. Click **"Review"** to open `DrawingReviewModal`.
4. Inspect the drawing and read the Resident Engineer's escalation comments.
5. **To Approve**: Click the green **"Approve (Ready for Authority)"** button.
   - _Result_: Drawing status becomes `ready_for_authority`.
6. **To Reject**: Click **"Reject Drawing"**, enter technical non-compliance comments (minimum 5 characters), and click **"Confirm Rejection"**.
   - _Result_: Drawing returns to the author as `rejected`.

##### B. Reviewing Drawings when Resident Engineer is Absent

1. If a project does not have an assigned Resident Engineer, drawings uploaded by Engineers appear directly in the Area Manager's queue with status `submitted`.
2. Inspect drawing details and click either **"Approve (Ready for Authority)"** or **"Reject Drawing"** with comments.

##### C. Monitoring Regional Performance & Financials

1. Click **Dashboard** (`/dashboard`).
2. Review the `AreaManagerSummaryCards`: Active Projects, Total Escalations, Pending Authorities.
3. Inspect the `FinancialPortfolioWidget`:
   - View Total Contractor Contract Sums.
   - View Total Confidential Consultant Contract Sums.
   - Compare financial figures across projects in your region.

#### What is Hidden or Blocked

- Cannot upload or edit documents directly.
- Cannot soft-delete or purge files.
- Cannot edit the NOC Matrix or record NOC fees.
- Cannot manage users or system roles.

---

### 4.7 Chief Executive Officer (`ceo`)

#### Role Mission

Executive leadership and strategic governance. Full high-level visibility across all projects, permitting milestones, project delays, review backlogs, and confidential financials. Operating strictly in read-only mode to safeguard records.

#### Sidebar Navigation

- **Overview**: Dashboard (`/dashboard`)
- **Authorities**: NOC Tracker (`/noc-tracker`) (Read-Only)
- **Documents**: Documents (`/documents`) (Download & View Only)
- _(Hidden: Review Queue, NOC Matrix, Archive, Users)_

#### Visibility

- **Projects**: All projects globally (`project.viewAll`).
- **Documents**: All documents and drawings across all projects.
- **NOCs**: Complete permitting status and statutory milestone timelines across all projects.
- **Financials**: Full visibility into both Contractor Sums and Confidential Consultant Sums.

---

#### Step-by-Step Click Guides

##### A. Reviewing Executive KPIs & Portfolio Health

1. Click **Dashboard** (`/dashboard`).
2. Inspect the **Executive Summary Cards**:
   - **Active Projects**: Total number of projects currently under management.
   - **NOC Completion Rate**: Percentage of required statutory NOCs obtained.
   - **Critical Delays**: Count of statutory permits past their scheduled target completion date.
   - **Upcoming Expiries**: Number of obtained permits expiring in the next 14 days.
   - **Review Backlog**: Total engineering drawings currently waiting in review queues (`submitted` or `escalated`).

##### B. Auditing Contract Financials & Margins

1. On `/dashboard`, scroll to the **Financial Portfolio Widget**.
2. Review top-level totals:
   - **Total Contractor Contract Sum (AED)**.
   - **Total Consultant Contract Sum (AED)**.
3. Inspect the per-project financial table:
   - Review each project's current stage, contractor value, and consultant revenue.

##### C. Inspecting Project Permitting Progress

1. Click **NOC Tracker** (`/noc-tracker`).
2. Use the project picker to switch between projects.
3. Inspect progress bars for Pre-Construction, Construction, and Handover stages.
4. Click on any statutory NOC card to open the inspector drawer and view historical submission references, fee audit records, and approval dates.

##### D. Viewing and Downloading Project Documents

1. Click **Documents** (`/documents`).
2. Search by document number, title, project, or discipline.
3. Click the **Download** icon on any document row to download original drawings or approved submission files.

#### Zero-Mutation Safeguards

- All upload, edit, review, delete, purge, fee entry, and sequence override buttons are completely excluded from the CEO's interface.
- Mutation server actions strictly verify role permissions and deny requests from the CEO role.

---

## 5. End-to-End Operational Scenarios

### Scenario 1: Standard Drawing Submission & Approval

1. **Engineer**: Logs in, goes to `/documents`, clicks `+ Upload Document`, selects project & discipline (`MEP`), uploads drawing sheet `MEP-001`, clicks `Upload & Submit`. Drawing is created as revision `R00` with status `submitted`.
2. **Resident Engineer**: Logs in, sees notification badge on `/review`, clicks `Review`. Opens drawing `MEP-001`, reviews CAD file, finds full compliance. Clicks `Approve (Direct)`.
3. **System**: Status updates to `ready_for_authority`.
4. **Authority Engineer**: Filters `/documents` by `ready_for_authority`, downloads `MEP-001`, and compiles the package for DEWA statutory submission.

### Scenario 2: Drawing Rejection & Resubmission Cycle

1. **Engineer**: Uploads drawing `STR-001` (R00, `submitted`).
2. **Resident Engineer**: Reviews drawing `STR-001`. Detects foundation rebar spacing violation. Clicks `Reject Drawing`, enters: _"Rebar spacing at Grid C-4 does not comply with ACI 318-19 minimum clearance"_, clicks `Confirm Rejection`.
3. **Engineer**: Logs in, views `/documents`, sees red `rejected` badge on `STR-001`. Expands Rejection Feedback Card, reads RE notes. Fixes CAD drawing. Clicks `Upload Revision` icon. Uploads updated file with changelog notes. System creates revision `R01` and resets status to `submitted`.
4. **Resident Engineer**: Sees `STR-001 (R01)` back in review queue. Verifies rebar correction. Clicks `Approve (Direct)`. Status updates to `ready_for_authority`.

### Scenario 3: Statutory NOC Permitting & Expiry Tracking

1. **Authority Engineer / DC**: Opens `/noc-tracker`, selects project, clicks `DEWA Water NOC`. Verifies prerequisite approvals are obtained.
2. Clicks `Submit Application`, enters application number `DEWA-W-2026-9901`, submission date, uploads submission slip. Status transitions to `submitted`.
3. Clicks `Record Payment`, logs fee of `15,000 AED` paid by `Contractor`, enters receipt number `RCP-8831`.
4. Once authority issues permit, clicks `Record Authority Result`, selects `Approved / Obtained`, enters expiry date (e.g., 6 months ahead), uploads stamped permit. Status becomes `obtained`.
5. **Automated Scheduler**: 14 days before permit expires, automated email notification is triggered and delivered to the assigned `authority_engineer`, `engineer`, and `dc`.

### Scenario 4: Sequence Dependency Override

1. **Authority Engineer / DC**: Attempts to submit `DCD Fire Life Safety NOC` while prerequisite `Master Plan NOC` is still unobtained. The system disables submission and shows a prerequisite warning.
2. Authority Engineer requests an administrative override due to an official statutory waiver.
3. **Admin**: Opens `/noc-tracker`, selects project, clicks `DCD Fire Life Safety NOC`. Clicks `Override Sequence`, enters mandatory justification: _"Ministerial special project exemption decree signed by authority director"_, clicks `Confirm Override`.
4. **Authority Engineer**: The submission button is unlocked; AE logs application reference and proceeds with permitting.

### Scenario 5: Soft-Delete Archiving vs Permanent Purge

1. **Document Controller**: Detects an obsolete specification on `/documents`. Clicks the `Archive` icon, reviews confirmation, clicks `Confirm Archive`.
2. The document disappears from active project views and moves to `/archive`.
3. If archived by mistake: Document Controller or Admin clicks `/archive` and clicks `Restore` to reactivate it.
4. If legally mandated to be erased permanently: **Admin** clicks `/archive`, clicks `Purge`, types confirmation phrase, and clicks `Delete Permanently`. The record and storage blob are permanently destroyed.
