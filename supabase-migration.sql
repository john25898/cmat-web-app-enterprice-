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
