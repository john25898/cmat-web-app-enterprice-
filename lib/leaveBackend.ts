// ─── Shared Leave Backend Sync ───────────────────────────────────────────────
// Leave requests are stored in the `leave_requests` table in Supabase so both
// the CMaT Enterprise app AND the HR Management dashboard read/write the SAME
// backend. localStorage remains as an offline fallback.
//
// Table schema: see supabase-migration.sql (section "Leave requests table").
// Run that migration in the Supabase SQL Editor once.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const TABLE = "leave_requests";

// Upsert the whole leave list to the shared backend (fire-and-forget).
// `on_conflict=id` + `resolution=merge-duplicates` = INSERT ... ON CONFLICT DO UPDATE
export async function pushLeavesToBackend(
  leaves: any[],
): Promise<void> {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !Array.isArray(leaves) || leaves.length === 0) {
      return;
    }
    await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(
        leaves.map((l) => {
          const r = l as Record<string, any>;
          return {
            id: String(r.id ?? ""),
            staff_email: r.staffEmail ?? null,
            staff_name: r.staffName ?? null,
            facility: r.facility ?? null,
            leave_type: r.leaveType ?? null,
            leave_days: r.leaveDays ?? null,
            start_date: r.startDate ?? null,
            reporting_date: r.reportingDate ?? null,
            status: r.status ?? "pending",
            data: r, // full request object (the app's LeaveRequest shape)
            updated_at: new Date().toISOString(),
          };
        }),
      ),
    });
  } catch (err) {
    // Offline / table missing — leave sync silently; localStorage still works.
    console.warn("[leaveBackend] push failed (offline or table missing):", err);
  }
}

// Fetch all leave requests from the shared backend.
export async function pullLeavesFromBackend(): Promise<any[]> {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?select=data&order=updated_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    if (!res.ok) {
      if (res.status === 404) {
        console.warn("[leaveBackend] leave_requests table missing — run supabase-migration.sql");
      }
      return [];
    }
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : [])
      .map((r: any) => r?.data)
      .filter(Boolean);
  } catch (err) {
    console.warn("[leaveBackend] pull failed (offline?):", err);
    return [];
  }
}

// Merge backend entries into the local array. Backend wins by id; local-only
// entries are preserved (so nothing is ever lost).
export function mergeLeaves(
  local: any[],
  remote: any[],
): any[] {
  const byId = new Map<string, any>();
  for (const r of remote) {
    if (r && r.id != null) byId.set(String(r.id), r);
  }
  for (const l of local) {
    if (l && l.id != null && !byId.has(String(l.id))) byId.set(String(l.id), l);
  }
  return Array.from(byId.values());
}

// True when the merged set differs from `local` (used to avoid pointless writes)
export function leavesChanged(local: any[], merged: any[]): boolean {
  if (local.length !== merged.length) return true;
  const key = (x: any) => JSON.stringify(x);
  const localSet = new Set(local.map(key));
  return merged.some((m) => !localSet.has(key(m)));
}
