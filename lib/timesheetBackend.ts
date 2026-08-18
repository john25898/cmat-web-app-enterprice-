// ─── Shared Timesheet Backend Sync ──────────────────────────────────────────
// Timesheets are stored in the `timesheets` table in Supabase so both the CMaT
// Enterprise app AND the HR Management dashboard read/write the SAME backend.
// localStorage remains as an offline fallback.
//
// Table schema: see supabase-migration.sql (section "Timesheets table").
// Run that migration in the Supabase SQL Editor once.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const TABLE = "timesheets";

// Upsert the whole timesheet list to the shared backend (fire-and-forget).
// `on_conflict=id` + `resolution=merge-duplicates` = INSERT ... ON CONFLICT DO UPDATE
export async function pushTimesheetsToBackend(subs: any[]): Promise<void> {
  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_ANON_KEY ||
      !Array.isArray(subs) ||
      subs.length === 0
    ) {
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
        subs.map((s) => {
          const r = s as Record<string, any>;
          return {
            id: String(r.id ?? ""),
            staff_email: r.staffEmail ?? null,
            staff_name: r.staffName ?? null,
            facility: r.facility ?? null,
            year: r.year ?? null,
            month: r.month ?? null,
            status: r.status ?? "draft",
            data: r, // full submission object (the app's TimesheetSubmission shape)
            updated_at: new Date().toISOString(),
          };
        }),
      ),
    });
  } catch (err) {
    // Offline / table missing — timesheet sync silently; localStorage still works.
    console.warn(
      "[timesheetBackend] push failed (offline or table missing):",
      err,
    );
  }
}

// Fetch all timesheets from the shared backend.
export async function pullTimesheetsFromBackend(): Promise<any[]> {
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
        console.warn(
          "[timesheetBackend] timesheets table missing — run supabase-migration.sql",
        );
      }
      return [];
    }
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : [])
      .map((r: any) => r?.data)
      .filter(Boolean);
  } catch (err) {
    console.warn("[timesheetBackend] pull failed (offline?):", err);
    return [];
  }
}

// Merge backend entries into the local array. Backend wins by id; local-only
// entries are preserved (so nothing is ever lost).
export function mergeTimesheets(local: any[], remote: any[]): any[] {
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
export function timesheetsChanged(local: any[], merged: any[]): boolean {
  if (local.length !== merged.length) return true;
  const key = (x: any) => JSON.stringify(x);
  const localSet = new Set(local.map(key));
  return merged.some((m) => !localSet.has(key(m)));
}
