# CVTEC EDMS – Role Flows

Baseline of the intended workflow, built from Jaylene's answers. Use it to test the app against. Updated 14 Oct 2026 with her answers to questions 1–6. **?** = not yet confirmed.

## 1. Who can do what

✓ allowed · — not allowed · ? open question. "Assigned" = only projects the user is assigned to.

| Capability                          | Admin          | CEO             | AM                       | RE       | Auth Eng    | Engineer      | DC             |
| ----------------------------------- | -------------- | --------------- | ------------------------ | -------- | ----------- | ------------- | -------------- |
| Project scope                       | All            | All (read-only) | All                      | Assigned | Assigned    | Assigned      | Assigned       |
| View documents and NOCs             | ✓              | ✓               | ✓                        | ✓        | ✓           | ✓             | ✓              |
| Upload documents                    | ✓              | —               | —                        | x        | ✓           | ✓             | ✓              |
| Edit / new revision                 | ✓              | —               | —                        | x        | ✓ own files | x (inform DC) | ✓ any in scope |
| Delete (archive, restorable)        | ✓              | —               | —                        | —        | —           | —             | ✓              |
| Approve drawings                    | ✓ either level | —               | ✓ if flagged / RE absent | ✓ first  | —           | —             | —              |
| Edit NOC Matrix                     | ✓              | —               | —                        | —        | ✓           | —             | ✓              |
| Update NOC tracker (status, fees)   | ✓              | —               | —                        | —        | ✓           | —             | ✓              |
| Override NOC sequence (with reason) | ✓              | —               | —                        | —        | —           | —             | —              |
| See client–consultant amount        | ✓              | ✓               | ✓                        | —        | —           | —             | —              |
| See client–contractor amount        | ✓              | ✓               | ✓                        | ✓        | ✓           | ✓             | ✓              |
| Manage users, roles, assignments    | ✓              | —               | —                        | —        | —           | —             | —              |
| Expiry email (14 days before)       | —              | —               | —                        | —        | ✓           | ✓             | ✓              |

## 2. Document and NOC lifecycle (all roles)

```mermaid
flowchart TD
A["Upload R00 (DC / Engineer)"] --> B{"RE review (or Admin)"}
B -- "Reject + comment" --> C["Uploader reads comment, uploads R01"]
C --> B
B -- "Approve" --> D{"Needs AM? (RE flags or RE absent)"}
D -- "Yes" --> E{"AM review (or Admin)"}
E -- "Reject + comment" --> C
E -- "Approve" --> F
D -- "No" --> F["Ready for authority"]
F --> G["Authority Eng submits on authority website"]
G --> H["NOC Tracker: Submitted"]
H --> I{"Authority result"}
I -- "Rejected" --> J["Log reason, resubmit R01"]
J --> H
I -- "Approved" --> K["Obtained + expiry date"]
K --> L["Alert 14 days before expiry"]
```

## 3. Flow per role

### Admin

Lands on: Dashboard (all projects). Nav: Dashboard, NOC Tracker, NOC Matrix, Documents, Review, Users, Archive.

```mermaid
flowchart TD
L["Login"] --> D["Dashboard: all projects"]
D --> U["Users"]
D --> T["NOC Tracker"]
D --> X["Documents"]
D --> R["Archive"]
D --> Q["Review Queue: approve or reject at either level"]
U --> U1["Invite user, set role"]
U --> U2["Assign engineers + DC to a project"]
T --> T1["Override prerequisite sequence (reason required)"]
X --> X1["Archive a file"]
R --> R1["Restore or purge"]
```

Create: users, assignmentsDelete: archive / purgeOverride with reasonUpload, edit, approve (either level). Edit NOC MatrixOnly Admin registers projects

### CEO

Lands on: Dashboard (read-only). Nav: Dashboard, NOC Tracker, Documents.

```mermaid
flowchart TD
L["Login"] --> D["Dashboard: KPIs, delays, expiries"]
D --> T["NOC Tracker (view)"]
T --> I["Open NOC: status, fees, history"]
D --> X["Documents (view, download)"]
D --> A["Amounts: consultant + contractor"]
```

View everything in scope. No create / edit / delete / approveSees all projects, read-only

### Area Manager (AM)

Lands on: Dashboard (all projects). Nav: Dashboard, NOC Tracker, Documents, Review Queue.

```mermaid
flowchart TD
L["Login"] --> D["Dashboard: all projects"]
D --> Q["Review Queue: flagged by RE, or RE absent"]
Q --> O["Open drawing"]
O --> A{"Decision"}
A -- "Approve" --> OK["Ready for authority"]
A -- "Reject" --> C["Comment required, back to uploader"]
D --> T["NOC Tracker (view)"]
D --> M["Amounts: consultant + contractor"]
```

Approve / reject (second level). No upload, no deleteNo NOC fee recording

### Resident Engineer (RE)

Lands on: Dashboard (assigned projects). Nav: Dashboard, Documents, Review Queue.

```mermaid
flowchart TD
L["Login"] --> D["Dashboard: assigned projects"]
D --> Q["Review Queue: submitted drawings"]
Q --> O["Open drawing"]
O --> A{"Decision"}
A -- "Approve" --> N{"Escalate to AM?"}
N -- "No" --> OK["Ready for authority"]
N -- "Yes" --> AM["Goes to AM queue"]
A -- "Reject" --> C["Comment required, back to uploader"]
D --> X["Documents (view, upload, edit own)"]
```

Approve / reject (first level), No delete, no consultant amountUpload; edit own uploads

### Authority Engineer

Lands on: Dashboard (assigned projects). Nav: Dashboard, NOC Tracker, NOC Matrix, Documents.

```mermaid
flowchart TD
L["Login"] --> D["Dashboard: assigned projects"]
D --> M["NOC Matrix"]
M --> M1["Edit item, justification required"]
M1 --> M2["Propagates to unobtained NOCs only"]
M2 --> M3["Revision history logged"]
D --> T["NOC Tracker"]
T --> T1["Open NOC, check prerequisites"]
T1 --> T2["Mark submitted, record fee payer + receipt"]
T2 --> T3{"Authority result"}
T3 -- "Rejected" --> T4["Log reason, resubmit R01"]
T3 -- "Approved" --> T5["Set expiry date"]
D --> X["Documents: upload, edit own, view"]
```

Edit matrix + trackerUpload + edit ownNo approve drawings, no delete, no sequence override

### Engineer (MEP / Architect / Structure / Civil)

Lands on: Dashboard (assigned projects). Nav: Dashboard, Documents. Discipline is set per project assignment.

```mermaid
flowchart TD
L["Login"] --> D["Dashboard: assigned projects"]
D --> X["Documents"]
X --> U["Upload drawing R00"]
U --> S["Status: submitted"]
S --> R{"Review result"}
R -- "Approved" --> OK["Done, visible to Authority Eng"]
R -- "Rejected" --> C["Read comment, upload R01"]
C --> S
D --> N["NOC Tracker (view, own project)"]
```

Upload only (R00, R01); for adjustments inform DC. No delete, no approve, no consultant amount.

### Document Controller (DC)

Lands on: Dashboard (assigned projects). Nav: Dashboard, NOC Tracker, NOC Matrix, Documents, Archive.

```mermaid
flowchart TD
L["Login"] --> D["Dashboard: assigned projects"]
D --> X["Documents"]
X --> U["Upload / edit / new revision"]
X --> A["Archive a file (restorable)"]
A --> R["Archive page: restore"]
D --> T["NOC Tracker"]
T --> T1["Update status, fees, receipts"]
D --> M["NOC Matrix"]
M --> M1["Edit item with justification"]
D --> E["Gets 14-day expiry email"]
```

Create / update / archive in own projects. No Users page, no approving drawings, no other projects.

## 4. Answered by Jaylene (14-15 Oct 2026)

1. Client and contractor staff never log in. They only receive emails from the system.
2. Admin can approve drawings and edit the NOC Matrix.
3. Engineers cannot edit or replace their own uploads (they only upload; for adjustments they must inform the DC).
4. The CEO sees all projects, read-only.
5. CVTEC uses 3 stages: Pre-Construction (Information and Design), Construction, Handover.
6. Only Admin registers new projects.
7. Authority Engineer can upload and edit own files. RE cannot upload or edit. Engineers upload only.
8. AM cannot record NOC fees. Only Authority Engineer, Document Controller and Admin can.

## 5. Still open

1. Client and contractor emails: she has no answer yet. Nothing gets built until she confirms which events trigger an email to each party and who sets their contact emails.
