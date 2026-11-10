/**
 * What a Super Admin can grant to the Support role, section by section.
 *
 * view   — the section appears for support staff and its data can be read.
 * manage — support staff can take that section's actions (null = the section
 *          has no actions to delegate).
 *
 * DEFAULTS reproduce the access support had before this was configurable:
 * every section visible, only the Reports queue actionable. Super Admins
 * always have full access, and a few things are never delegable (role
 * changes, editing this access policy).
 */
export const ACCESS_FEATURES = [
  { key: "dashboard", label: "Dashboard", description: "Totals, revenue and the needs-attention summary", manage: null },
  { key: "users", label: "Users", description: "Student accounts and their details", manage: "Suspend and reactivate accounts (one or in bulk)" },
  { key: "listings", label: "Listings", description: "Everything students have posted", manage: "Unlist, block, relist and delete listings" },
  { key: "orders", label: "Orders", description: "Deals between students", manage: "Override a deal's stage or cancel it" },
  { key: "campuses", label: "Campuses", description: "Campus directory", manage: "Create, edit, pause and delete campuses" },
  { key: "reports", label: "Reports", description: "Report queue and chat evidence", manage: "Resolve and dismiss reports" },
  { key: "genderRequests", label: "Gender requests", description: "Pending gender-change approvals", manage: "Approve or reject requests" },
  { key: "notifications", label: "Push notifications", description: "Sent and scheduled notifications", manage: "Send, schedule and cancel notifications" },
  { key: "auditLog", label: "Audit log", description: "Every staff action", manage: null },
  { key: "systemStatus", label: "Service status", description: "API and dependency health", manage: null },
  { key: "jobs", label: "Background jobs", description: "Scheduled job health and history", manage: "Run a job immediately" },
];

export const ACCESS_FEATURE_KEYS = ACCESS_FEATURES.map((f) => f.key);

export const DEFAULT_SUPPORT_PERMISSIONS = Object.fromEntries(
  ACCESS_FEATURES.map((f) => [f.key, { view: true, manage: f.key === "reports" }]),
);

// Shown on the access page so nobody looks for a toggle that can't exist.
export const ADMIN_ONLY_ACTIONS = [
  "Change a user's role (make or remove support staff)",
  "Permanently delete a user account and everything linked to it",
  "Edit support access (this page)",
];

/**
 * Sections whose data follows a campus limit. The rest (audit log, service
 * status, background jobs) are platform-wide and ignore it. With a limit,
 * creating or deleting campuses also needs all-campus access.
 */
export const CAMPUS_SCOPED_SECTIONS = [
  "dashboard",
  "users",
  "listings",
  "orders",
  "campuses",
  "reports",
  "genderRequests",
  "notifications",
];
