# Madani ID Platform - Comprehensive System Architecture & Current Code Status

**Generated Date**: October 27, 2026  
**Platform Version**: 2.5.0 (Complete Enterprise Light Theme UI/UX Redesign Edition)  
**System Type**: AI-Powered Multi-Tenant SaaS Platform for ID Card Design Studio, Management, Batch PDF Generation & Centralized Physical Print Production

---

## 1. Executive Summary & Master Workflow Implementation

The **Madani ID Platform** has been upgraded with a comprehensive **Modern Light Theme** design system and **Live 3D PVC ID Card Showcase & End-to-End Approval Workflow**:

```
Vendor approaches school → Guided 4-Step Onboarding Wizard (Profile, Specs, Branding Assets, Design Brief)
  ↳ Vendor creates multiple design concepts (A: Minimal, B: Academic, C: Geometric)
      ↳ School previews side-by-side in 3D & approves one design (Freezes official template)
          ↳ School staff enter student data with Live Reactive 3D Card Rendering
              ↳ Organization browses Class-Wise 3D Student ID Showcase Gallery
                  ↳ School verifies and freezes final batch snapshot
                      ↳ Vendor validates PVC specifications & submits order to Super Admin
                          ↳ Super Admin centralized production hub (Quotation → Printing → QC → Packing → Dispatch Tracking → Delivery)
```

### Complete Light Theme Design System Specification (Enforced):
- **Page Canvas Background**: Soft cool white `#F7F9FC`
- **Main Content & Sidebar Surfaces**: Pure crisp white `#FFFFFF`
- **Primary Brand Color**: Professional indigo `#4F46E5` (Hover: Deep indigo `#4338CA`)
- **Main Text / Headings**: Deep slate `#172033`
- **Secondary Text / Metadata**: Slate gray `#64748B`
- **Borders & Dividers**: Light slate `#E2E8F0`
- **Subtle Section Background**: Pale blue-gray `#F1F5F9`
- **Status Semantic Tokens**:
  - Success: Emerald `#059669`
  - Warning: Amber `#D97706`
  - Error: Red `#DC2626`
  - Info: Blue `#2563EB`
  - Focus Ring: Indigo `#818CF8`
- **Card Brand Isolation**: Organization-specific card colors are strictly confined within the PVC preview surfaces and never leak into the application shell.
- **Zero Emojis**: Replaced with clean, professional Lucide React icons across all screens.

### Key Architectural Protections Enforced:
1. **Organizations Do Not Design Cards**:
   - Organization users have zero access to the Canvas Editor or AI Design Studio mutation endpoints (`/api/ai/design/generate` and `/api/ai/design/chat-refine` return `403 Forbidden`).
   - If an Organization navigates to `/organization/designer`, frontend layout interceptors immediately reroute them to `/organization/design-review`.
2. **Organizations Do Not Order Physical Printing Directly**:
   - Organization Admins cannot submit jobs directly to the print factory (`/api/production/jobs` and `/api/orders` return `403 Forbidden`).
   - Organizations sign off on demographic data and freeze their card batch (`/api/production/batch-snapshots`), creating an immutable snapshot.
3. **Staff Class Scoping**:
   - Staff accounts (`User.assigned_class`) are strictly scoped. In `api/members.py`, non-admin staff can only list, create, and edit students within their designated class/cohort.
   - Staff have a dedicated, distraction-free portal at `/staff` for data entry, photo upload, draft saving, and bulk submission to Organization Admin.
4. **Vendor Batch Validation Gate**:
   - The vendor conducts physical pre-flight checks (`/vendor/batch-validation`), verifies CR80 PVC dimensions, selects material finish (Glossy UV, Matte Velvet, Composite), configures shipping packaging, and submits the job to Super Admin.
5. **Super Admin Centralized Fulfillment**:
   - Dedicated production command center (`/admin/production`) with a backend-validated state machine: `Awaiting Review` $\rightarrow$ `Quotation Pending` $\rightarrow$ `Approved for Production` $\rightarrow$ `Printing` $\rightarrow$ `Quality Check` $\rightarrow$ `Packed` $\rightarrow$ `Dispatched` $\rightarrow$ `Delivered`.
   - Quality control audit logging (`addQCCheck`) and courier dispatch tracking (`recordDispatch`).

---

## 2. Verified Test Suites & Production Build

### A. Backend Pytest Validation:
- Command: `$env:DATABASE_URL="sqlite:///./test_api.db"; python -m pytest -v`
- Result: **14 / 14 test suites PASSED (100% pass rate in 20.78s)**
  - `test_organization_registration`: PASSED
  - `test_login_and_tenant_isolation`: PASSED
  - `test_template_isolation`: PASSED
  - `test_public_qr_verification`: PASSED
  - `test_vendor_onboarding_and_isolation`: PASSED
  - `test_ai_design_multi_variation_generation`: PASSED
  - `test_chat_to_canvas_operations`: PASSED
  - `test_design_approval_immutable_template`: PASSED
  - `test_batch_snapshot_and_print_job_lifecycle`: PASSED
  - `test_vendor_invitation_and_activation_lifecycle`: PASSED
  - `test_organization_admin_invitation_and_activation`: PASSED
  - `test_celery_worker_tasks`: PASSED
  - `test_class_management_and_staff_scoping`: PASSED
  - `test_production_command_center_and_metrics`: PASSED

### B. Frontend Next.js Production Build Validation:
- Command: `npm run build`
- Result: **Compiled successfully in Turbopack in 4.2s, 0 TypeScript errors, 34 static and dynamic routes generated cleanly**:
  - `/`
  - `/login`
  - `/register`
  - `/activate-vendor`
  - `/activate-org-admin`
  - `/admin/production` (Centralized Command Center)
  - `/admin/vendors` (Vendor Management)
  - `/organization` (Institutional Control Center)
  - `/organization/classes` (Class & Section Management)
  - `/organization/staff` (Staff & Permission Directory)
  - `/organization/students` (Student Records & Excel/ZIP Import)
  - `/organization/design-review` (Read-Only Design Preview & Approval)
  - `/organization/batch-review` (Final Batch Verification & Freeze)
  - `/organization/orders` (Read-Only Print Production Tracking)
  - `/organization/settings` (Institutional Branding & Profile)
  - `/staff` (Focused Class Staff Data Entry Portal)
  - `/vendor` (Vendor Studio Overview)
  - `/vendor/organizations` (Client Organization Manager)
  - `/vendor/design-studio` (Canvas Design Studio)
  - `/vendor/ai-studio` (AI Multi-Variation & Chat-to-Canvas Studio)
  - `/vendor/batch-validation` (Approved Batch Validation & Print Request Submission)
  - `/vendor/production` (Vendor Order Fulfillment Tracking)
  - `/vendor/billing`
  - `/vendor/settings`
  - `/verify` & `/verify/[id]` (Anti-Counterfeit QR Public Verification)

---

## 3. Database Models & Schema Extensions

1. **`OrganizationClass` (`organization_classes`)**:
   - `id`: UUID primary key
   - `organization_id`: Foreign key to `organizations.id`
   - `name`: Class identifier (e.g., "Grade 1-A", "LKG-Rose")
   - `section`: Section code (optional)
   - `description`: Notes
   - `is_active`: Status flag
   - Relational link to `Organization.classes`

2. **`User.assigned_class`**:
   - Column `String` on `users` table allowing class-level scoping for teachers and operators.

3. **`Member.rejection_reason`**:
   - Column `Text` on `members` table storing review feedback when Organization Admin returns a student record to staff for corrections.

4. **`BatchSnapshot` (`batch_snapshots`)**:
   - Frozen immutable JSON copies of canvas vector element trees and student demographic data at the moment of approval.

5. **`PrintJob` (`print_jobs`)**:
   - Centralized physical order tracking linked to `BatchSnapshot`, `Vendor`, and `Organization`.
   - Event audit trail (`print_job_events`), QC checks (`quality_control_checks`), and carrier dispatch records (`dispatch_records`).

---

## 4. Default Seed Accounts for Testing

| Role | Username | Password | Access / Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin` | `superadmin123` | Platform-wide root console, vendor creation, central print queue, state machine overrides, QC, dispatch. |
| **Vendor** | `alan_vnd` / `apex_vendor` | `vendorpass123` | Vendor studio, client management, AI canvas studio, design proposals, batch validation, print order submission. |
| **Organization Admin** | `alice_admin` / `org_admin` | `admin123` / `orgpass123` | Class management, staff provisioning, student review, read-only design preview, final batch freeze. |
| **Class Staff** | `priya_staff` / `priya_10a` | `staffpass123` | Assigned to `"Grade 1-A"`. Simple data-entry portal, photo upload, draft saving, submission to Org Admin. |
