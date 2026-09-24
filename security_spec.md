# Security Specification & Threat Model for Primary School ERP

## 1. Data Invariants
1. **Default Deny by Design**: Any path or operation not explicitly permitted must be denied outright (`match /{document=**} { allow read, write: if false; }`).
2. **Bootstrapped Super Admin**: User `daudimuchiri4@gmail.com` is granted administrative access.
3. **Public vs. Protected Scope**:
   - Public visitors can read basic school branding, website CMS content, announcements, and events.
   - Public visitors can create new admission applications (`admissionApplications`) with valid identity fields.
   - All ERP internal records (students, staff, parents, fee structures, invoices, payments, grades, attendance, POS, health, library) require authentication (`request.auth != null`).
4. **Credential Isolation**:
   - `darajaConfig` (M-PESA consumer secrets) and `subscription` (lockscreen and security passkeys) are strictly locked to administrators and cannot be altered by ordinary users.
5. **ID Poisoning Protection**:
   - Document ID path variables must satisfy `isValidId(id)` (under 128 characters, strictly alphanumeric/hyphens/underscores).
6. **Audit Trail Integrity**:
   - Authenticated users can record audit entries, but cannot delete or overwrite existing audit logs.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Unauthenticated Student Dump**: Public attacker attempting `get` or `list` on `/schools/glc- kasasani/students` without `request.auth`.
2. **Anonymous Daraja Secret Exfiltration**: Unauthenticated query trying to read `/schools/glc/darajaConfig/main` to steal consumer secret.
3. **Ghost Student Injection**: Attacker trying to write an empty student document without required fields (`admissionNumber`, `fullName`).
4. **Subscription Bypass Payload**: School staff member trying to modify `/schools/glc/subscription/security` to deactivate license enforcement.
5. **Mass Audit Log Deletion**: Attacker calling `deleteDoc` on `/schools/glc/auditLogs/log-001` to destroy forensic evidence.
6. **ID Poisoning with Buffer**: Creating `/schools/glc/students/{id}` with a 2,000-character junk string as `id`.
7. **Negative Payment Scam**: Inserting a fee payment of `-50000` KSh or with non-string payment references.
8. **Shadow Field Injection**: Injecting an extra unauthorized backdoor field `isSystemSuperAdmin: true` into a student record.
9. **Tampering with Past Results**: Overwriting an existing CBC assessment result record without authorization.
10. **Public Fee Invoices Exfiltration**: Crawling `/schools/glc/invoices` without being an authenticated school user.
11. **Malicious CMS Defacement**: Unauthenticated POST/PUT to deface `/schools/glc/websiteCMS/main`.
12. **Admission Application Deletion by Candidate**: Public applicant trying to delete other student admission applications.
