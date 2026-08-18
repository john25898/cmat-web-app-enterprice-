// ─── Staff Roster Mirror ─────────────────────────────────────────────────────
// Publishes the CMaT staff login roster (data/users.json, role = staff) to the
// shared Supabase `employees` table so the HR Management dashboard can manage
// the same 181 employees and its filters work across the full roster.
//
// IMPORTANT: this ONLY mirrors identity fields (name/role/facility/county).
// It does NOT touch auth or login in any way — logins keep working exactly as
// before, reading data/users.json locally.
//
// Table schema: see supabase-migration.sql (section "Employees mirror table").
// ─────────────────────────────────────────────────────────────────────────────

import usersData from "@/data/users.json";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const TABLE = "employees";

// Upsert the whole staff roster to the shared backend (fire-and-forget).
// `on_conflict=id` + `resolution=merge-duplicates` = INSERT ... ON CONFLICT DO UPDATE
export async function pushStaffToBackend(): Promise<void> {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    const users = usersData as unknown as Record<string, any>;
    const staff = Object.values(users).filter((u: any) => u?.role === "staff");
    if (staff.length === 0) return;

    const rows = staff.map((u: any) => ({
      id: u.email, // email is the staff login id
      email: u.email ?? null,
      name: u.name ?? null,
      role: u.role ?? "staff",
      facility: u.facility ?? null,
      county: u.county ?? null,
      job_title: u.jobTitle ?? null,
      phone: u.phone ?? null,
      id_number: u.idNumber ?? null,
      data: u, // full user record (plaintext password only exists locally)
      updated_at: new Date().toISOString(),
    }));

    await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    });
  } catch (err) {
    // Offline / table missing — mirror is best-effort; login is unaffected.
    console.warn("[staffBackend] roster mirror push failed (offline or table missing):", err);
  }
}
