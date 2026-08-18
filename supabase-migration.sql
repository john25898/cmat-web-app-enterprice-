-- CMaT Enterprise Web App - Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/aarqmoujwdhpfdlylyzp/sql)

-- 1. Workplans table
CREATE TABLE IF NOT EXISTS public.workplans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  region TEXT,
  submission_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'returned')),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  region TEXT,
  submission_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'returned')),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE public.workplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for anon access (for development)
CREATE POLICY "Enable all access for anon" ON public.workplans
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for anon" ON public.reports
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_workplans_status ON public.workplans(status);
CREATE INDEX IF NOT EXISTS idx_workplans_employee_email ON public.workplans(employee_email);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_employee_email ON public.reports(employee_email);

-- 6. Leave requests table (shared backend for leave sync with the HR dashboard)
--    Both apps read/write THIS table so leave entered in CMaT appears in the
--    HR dashboard automatically (and vice-versa). The full request object is
--    stored in `data` (JSONB) so both apps keep their own shape.
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id TEXT PRIMARY KEY,
  staff_email TEXT,
  staff_name TEXT,
  facility TEXT,
  leave_type TEXT,
  leave_days INT,
  start_date TEXT,
  reporting_date TEXT,
  status TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for anon" ON public.leave_requests
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_staff_email ON public.leave_requests(staff_email);

-- 7. Employees mirror table (staff roster sync: CMaT logins -> HR dashboard)
--    The CMaT app mirrors its staff login roster here (fire-and-forget on
--    login, see lib/staffBackend.ts) so the HR dashboard can manage the same
--    181 employees. Auth/login itself is NOT affected — this is a read-only
--    mirror of name/role/facility/county.
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY,          -- staff email (login id)
  email TEXT,
  name TEXT,
  role TEXT,
  facility TEXT,
  county TEXT,
  job_title TEXT,
  phone TEXT,
  id_number TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for anon" ON public.employees
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_county ON public.employees(county);
CREATE INDEX IF NOT EXISTS idx_employees_facility ON public.employees(facility);

-- 8. Timesheets table (shared backend for timesheet sync with the HR dashboard)
--    Timesheets submitted in CMaT appear automatically in the HR dashboard
--    "Timesheets" page. The full submission object is stored in `data` (JSONB)
--    so both apps keep their own shape.
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
