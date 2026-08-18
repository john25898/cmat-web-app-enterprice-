-- ─── Timesheets table (run ONLY this in the Supabase SQL Editor) ─────────────
-- https://supabase.com/dashboard/project/aarqmoujwdhpfdlylyzp/sql
-- Creates the shared `timesheets` table used by the CMaT app AND the HR
-- dashboard two-way timesheet sync. Safe to re-run (IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.timesheets (
  id TEXT PRIMARY KEY,
  staff_email TEXT,
  staff_name TEXT,
  facility TEXT,
  year INT,
  month INT,
  status TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for anon" ON public.timesheets
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_timesheets_status ON public.timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_staff_email ON public.timesheets(staff_email);
CREATE INDEX IF NOT EXISTS idx_timesheets_month ON public.timesheets(year, month);
