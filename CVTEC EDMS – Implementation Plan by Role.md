# CVTEC EDMS – Implementation Plan by Role

Next.js + Supabase · Prepared for Gio · 14 Oct 2026 · Source of truth: CVTEC EDMS Role Flows (Baseline) and lib/permissions.ts

## How to use this plan

Each role has its own section that can be built and tested on its own. All of them depend on the shared foundation in Section 1. A role is done only when its baseline flow passes with a seeded test account and its denied actions also fail at the database (RLS), not just in the UI.

Task tags: \[UI\] page or component, \[ACTION\] server action or route handler, \[DB\] migration or RLS policy, \[TEST\] acceptance check.

Suggested order: Foundation, Admin, Document Controller, Authority Engineer, Engineer, Resident Engineer, Area Manager, CEO, then client and contractor emails. Admin comes first because it creates the users, projects and assignments that nothing else can be tested without. The CEO comes late because it is mostly the absence of write access.

## 1. Shared foundation (do first)

- F1 Permissions in code. Add lib/permissions.ts, add requireCan(capability) to lib/auth.ts, and build the header nav from navFor(role). Replace every inline role array and role === check.
- F2 Role cleanup. Collapse the Role type to the 7 roles. Migrate legacy doc_controller and manager rows with normalizeRole. Delete the dead discipline roles in canUserEditDiscipline. Store the engineer discipline (MEP, Architect, Structure, Civil) on project_members, not as extra roles.
- F3 Never trust user_metadata for roles. getCurrentUser falls back to user_metadata.role when no profile row exists, and users can edit their own metadata. Create profiles with a trigger on auth.users and make the fallback deny access.
- F4 Schema in the repo. Export the live schema (profiles, documents, reviews, storage policies) into supabase/migrations so RLS can be reviewed and the database rebuilt.
- F5 RLS helpers. In a private schema, add security definer functions with an empty search_path: private.has_role(roles) and private.can_see_project(project_id), which is true for admin, ceo and area_manager and otherwise checks project_members. Use (select auth.uid()) inside policies. Policies mirror the PERMISSIONS table: one policy per command, with WITH CHECK on writes.
- F6 Close the open NOC tables. Replace SELECT USING (true) on the NOC child tables with can_see_project checks.
- F7 Three stages. Replace Feasibility, Design, Construction, Handover with Pre-construction, Construction, Handover. Check existing rows before changing the enum.
- F8 Test accounts. Seed one user per role (admin, ceo, area manager, resident engineer, authority engineer, engineer, dc at a test domain) plus two projects, so assigned-only roles can be checked for what they must not see.
- F9 Review state machine. Document status: submitted, escalated, ready_for_authority, rejected. Each reviews row records level (re, am, admin), decision and comment, with a database check that a comment is required on rejection. Every transition goes through one server action that calls requireCan('review.decide') and checks the transition is allowed.
- F10 Soft delete and audit. documents get archived_at and archived_by, and no role has a DELETE policy on documents. Purge is a separate Admin-only server action. An audit_log table (actor, action, entity, entity_id, at) is filled by triggers on documents, project NOCs, profiles and project_members.

## 2. Admin

Scope: all projects, full control, can approve at either review level. Nav: Dashboard, NOC Tracker, NOC Matrix, Documents, Review, Archive, Users.

Build

- &#91;UI\]\[ACTION\] Users page. Invite by email with supabase.auth.admin.inviteUserByEmail in a server action using the service-role key, set role, deactivate. Block removing the last Admin and block self-demotion.
- &#91;UI\]\[ACTION\] Project registration (new route, for example /projects/new). Fields: name, client, contractor, stage, client and contractor contact emails, contract amounts. Admin only.
- &#91;UI\]\[ACTION\] Assignments. Assign Resident Engineer, Authority Engineer, Engineers and DC to a project through project_members. Set the discipline for each Engineer.
- &#91;ACTION\] Review at either level, reusing the F9 action (reviewStageFor returns any).
- &#91;ACTION\] NOC sequence override. A modal requires a reason, the action writes to audit_log, and only Admin can call it.
- &#91;UI\]\[ACTION\] Archive page: restore and purge. Purge is the only hard delete in the system and needs a typed confirmation. It removes the storage object too.
- &#91;DB\] Admin policies use private.has_role. The service-role client lives only in lib/supabase/admin.ts and is imported only by server actions.

Acceptance tests

- &#91;TEST\] Invite a user, set the role to DC, assign to project A: they see project A and not project B.
- &#91;TEST\] Demote the only Admin: blocked.
- &#91;TEST\] Override a blocked NOC without a reason: rejected. With a reason: allowed and an audit_log row exists.
- &#91;TEST\] Approve a drawing at RE level and at AM level.
- &#91;TEST\] Purge from Archive removes the row and the file. A DC calling the same action is rejected.

## 3. Document Controller (DC)

Scope: assigned projects only. Nav: Dashboard, NOC Tracker, NOC Matrix, Documents, Archive.

Build

- &#91;UI\]\[ACTION\] Documents: upload, edit or replace any file in scope, upload a new revision, archive (soft delete, restorable).
- &#91;UI\]\[ACTION\] Archive page: list archived files of assigned projects and restore. No purge.
- &#91;UI\]\[ACTION\] NOC Tracker and NOC Matrix editing, same screens as the Authority Engineer (Section 6).
- &#91;ACTION\] Remove DC from the Users actions and from review decisions. The current code allows both, which breaks the baseline and allows privilege escalation.
- &#91;DB\] Policies: insert and update on documents and NOC tables where can_see_project; no DELETE policy; no access to the consultant amount table.
- &#91;ACTION\] Receives the 14-day expiry email.

Acceptance tests

- &#91;TEST\] Upload, edit and archive a file in an assigned project, then restore it from Archive.
- &#91;TEST\] Open Users or call the role-change action: denied, including with a direct Supabase call.
- &#91;TEST\] Approve or reject a drawing: denied.
- &#91;TEST\] Open a document of an unassigned project by URL: not found or denied, and its signed download URL is refused.
- &#91;TEST\] Consultant amount is not visible anywhere.

## 4. Authority Engineer

Scope: assigned projects. Owns the NOC Matrix and the NOC Tracker work. Nav: Dashboard, NOC Tracker, NOC Matrix, Documents.

Build

- &#91;UI\]\[ACTION\] NOC Matrix editor. Every edit needs a justification and writes a revision row. Changes apply only to NOCs not yet obtained.
- &#91;DB\] Matrix versioning: noc_matrix_revisions (item, old value, new value, justification, actor, at). A project's NOC requirements copy their values when created, so a later matrix edit never rewrites an obtained NOC.
- &#91;UI\]\[ACTION\] NOC Tracker. Open a NOC, check prerequisites (hard block, only Admin can override), mark submitted, record fee payer and receipt. On rejection log the reason and resubmit as R01 with history kept. On approval set the expiry date.
- &#91;ACTION\] Change recordNocFeePayment to requireCan('noc.tracker.update'). Today it also lets area_manager through.
- &#91;DB\] One status-transition action for NOCs. Obtained and rejected transitions write to notification_outbox (Section 9).
- &#91;UI\]\[ACTION\] Upload documents and edit or replace own uploads.
- &#91;ACTION\] Receives the 14-day expiry email.

Acceptance tests

- &#91;TEST\] Edit a matrix item without a justification: blocked. With one: a revision row exists.
- &#91;TEST\] Edit the matrix: an unobtained NOC picks up the change, an obtained NOC does not.
- &#91;TEST\] Submit a NOC whose prerequisite is not obtained: blocked. As Admin with a reason: allowed.
- &#91;TEST\] Reject then resubmit: R01 exists and the R00 history is still visible.
- &#91;TEST\] Approve drawings, archive a file, or open Users: denied.

## 5. Engineer (MEP, Architect, Structure, Civil)

Scope: assigned projects. Discipline comes from project_members. Nav: Dashboard, Documents.

Build

- &#91;UI\]\[ACTION\] Documents: upload R00. Edit or replace own uploads (own-only rule through canEditDocument and an RLS check uploaded_by = auth.uid()).
- &#91;ACTION\] Recommended guard, confirm with the client: once a drawing is approved, a change must be a new revision rather than an in-place replace, so approved drawings never change silently.
- &#91;UI\] Show the status of each upload and the reviewer comment on a rejection. Upload R01 sends it back to review.
- &#91;UI\] NOC Tracker, view only, for own projects.
- &#91;DB\] Insert with uploaded_by = auth.uid(); update only own rows; no DELETE policy; no consultant amount.
- &#91;ACTION\] Receives the 14-day expiry email.

Acceptance tests

- &#91;TEST\] Upload R00: status is submitted and the RE queue shows it.
- &#91;TEST\] Edit own upload: allowed. Edit a colleague's upload: denied by RLS.
- &#91;TEST\] After a rejection the comment is visible and R01 returns the drawing to review.
- &#91;TEST\] Archive, approve, matrix edit, tracker edit: denied.
- &#91;TEST\] An Engineer on project A cannot read project B.

## 6. Resident Engineer (RE)

Scope: assigned projects. First-level reviewer. Nav: Dashboard, Documents, Review.

Build

- &#91;UI\] Review Queue for assigned projects: status submitted.
- &#91;ACTION\] Decide through the F9 action. Approve, then either finish (ready_for_authority) or escalate to the AM. Reject needs a comment.
- &#91;UI\]\[ACTION\] Upload and edit or replace own uploads (same own-only rule as Engineer).
- &#91;DB\] can_see_project on every select; no access to the consultant amount table; the amount is also hidden in the UI.

Acceptance tests

- &#91;TEST\] Approve without escalating: status is ready_for_authority and it does not enter the AM queue.
- &#91;TEST\] Approve with escalation: status is escalated and it appears in the AM queue.
- &#91;TEST\] Reject without a comment: blocked in the UI and by the database check.
- &#91;TEST\] Review a drawing of an unassigned project: denied.
- &#91;TEST\] Archive, matrix edit, tracker edit, consultant amount: denied.

## 7. Area Manager (AM)

Scope: all projects. Second-level reviewer, sees both amounts. No uploads, no NOC fee recording. Nav: Dashboard, NOC Tracker, Documents, Review.

Build

- &#91;UI\] Review Queue: documents with status escalated, plus documents on projects with no resident_engineer assigned (RE absent). Define RE absent simply as no RE in project_members for that project and add an unavailable flag later only if needed.
- &#91;ACTION\] Approve gives ready_for_authority. Reject needs a comment and returns the file to the uploader. Uses the F9 action.
- &#91;UI\] Dashboard for all projects and a view-only NOC Tracker. Show the consultant and contractor amounts.
- &#91;DB\] Can read reviews and insert level am. No insert or update on documents. recordNocFeePayment must reject area_manager.

Acceptance tests

- &#91;TEST\] An escalated drawing is in the AM queue. A drawing the RE approved without escalating is not.
- &#91;TEST\] A project with no RE: a submitted drawing appears in the AM queue.
- &#91;TEST\] Upload, record a NOC fee, open Users: denied.
- &#91;TEST\] Consultant and contractor amounts are visible.
- &#91;TEST\] Reject without a comment: blocked.

## 8. CEO

Scope: all projects, read-only. Nav: Dashboard, NOC Tracker, Documents.

Build

- &#91;UI\] Dashboard across all projects: NOCs by status, delays, expiries in the next 14 days, documents awaiting review, and both amounts.
- &#91;UI\] Read-only NOC Tracker and Documents (view and download). Render no upload, edit, archive or approve controls, using can() per control.
- &#91;DB\] SELECT-only policies for the ceo role. No insert, update or delete policy exists for ceo on any table or storage bucket. The consultant amount table is readable by ceo.
- &#91;ACTION\] No new code: every mutating action already uses requireCan, so ceo fails by construction.

Acceptance tests

- &#91;TEST\] Nav shows only Dashboard, NOC Tracker and Documents.
- &#91;TEST\] Call createDocument as CEO, and also insert with the CEO's Supabase session directly: both rejected, the second by RLS.
- &#91;TEST\] The CEO sees projects they are not assigned to.
- &#91;TEST\] Both amounts are visible.

## 9. Shared feature: client and contractor emails

Confirmed: client and contractor never log in. They are emailed when a NOC is obtained, about to expire (14 days) or rejected, and the email includes the contract amount. Proposed, still to confirm: the client sees both amounts and the contractor only the client–contractor amount; the rejection email gives the status but not the authority's reason; Admin sets the contact emails.

Build

- &#91;DB\] projects.client_emails and projects.contractor_emails (text arrays). The consultant amount goes in its own table (project_confidential) readable only by admin, ceo and area_manager, because RLS works per row. The client–contractor amount can sit on the project.
- &#91;DB\] notification_outbox: id, project_id, noc_id, event, party, recipient, payload, status, retries, created_at, sent_at, with a unique key on (noc_id, event, party, recipient, expiry date) so nothing is sent twice. Triggers on NOC status changes insert the rows.
- &#91;ACTION\] A daily Vercel Cron calls a route handler protected by CRON_SECRET. It queues NOCs expiring in 14 days, then sends pending outbox rows through an email provider such as Resend, marking each row sent or failed. A failed send never blocks the NOC status change.
- &#91;ACTION\] Build each email with externalAmountsFor(party), so the contractor email can never include the consultant amount.

Acceptance tests

- &#91;TEST\] Marking a NOC obtained queues one email per recipient, and running the job twice sends once.
- &#91;TEST\] A NOC 14 days from expiry sends the expiring email once.
- &#91;TEST\] The contractor email never contains the consultant amount.
- &#91;TEST\] A failed provider call leaves the row failed and the NOC status unchanged.

## 10. Definition of done

- The role's baseline flow passes end to end with its seeded account.
- Every action the baseline marks as not allowed fails in the server action and at the database.
- Nav, buttons and links show only what the role can do, driven by can() and navFor().
- Nothing outside lib/permissions.ts and the RLS policies decides access. When the matrix changes, both change in the same commit.
