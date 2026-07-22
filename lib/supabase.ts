import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to upload a submission
export async function uploadSubmission(
  submission: Record<string, unknown>,
  submissionType: "workplan" | "report",
  employeeEmail: string,
  employeeName: string,
  status: "pending" | "draft" = "pending",
) {
  try {
    const table = submissionType === "workplan" ? "workplans" : "reports";
    const { data, error } = await supabase
      .from(table)
      .insert([
        {
          employee_email: employeeEmail,
          employee_name: employeeName,
          region: submission.region || null,
          submission_data: submission,
          status,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      if (
        error.code === "PGRST205" ||
        error.message?.includes("Could not find the table")
      ) {
        console.warn(
          "[v0] Table not found - run migration in Supabase dashboard",
        );
        return { success: false, error, tableMissing: true };
      }
      throw error;
    }
    return { success: true, data };
  } catch (error) {
    console.error("[v0] Error uploading submission:", error);
    return { success: false, error };
  }
}

// Helper function to fetch submissions for a specific employee
export async function fetchEmployeeSubmissions(
  employeeEmail: string,
  submissionType?: "workplan" | "report",
) {
  try {
    const query = supabase
      .from(submissionType === "workplan" ? "workplans" : "reports")
      .select("*")
      .eq("employee_email", employeeEmail)
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      if (
        error.code === "PGRST205" ||
        error.message?.includes("Could not find the table")
      ) {
        return { success: false, error, data: [], tableMissing: true };
      }
      throw error;
    }
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("[v0] Error fetching employee submissions:", error);
    return { success: false, error, data: [] };
  }
}

// Fetch ALL employee submissions (both workplans and reports) for an employee
export async function fetchAllEmployeeSubmissions(employeeEmail: string) {
  try {
    const [wpResult, rpResult] = await Promise.allSettled([
      supabase
        .from("workplans")
        .select("*")
        .eq("employee_email", employeeEmail)
        .order("created_at", { ascending: false }),
      supabase
        .from("reports")
        .select("*")
        .eq("employee_email", employeeEmail)
        .order("created_at", { ascending: false }),
    ]);

    const workplans =
      wpResult.status === "fulfilled" && !wpResult.value.error
        ? wpResult.value.data || []
        : [];
    const reports =
      rpResult.status === "fulfilled" && !rpResult.value.error
        ? rpResult.value.data || []
        : [];

    return {
      success: true,
      data: [
        ...workplans.map((w) => ({
          ...w,
          submissionType: "workplan" as const,
        })),
        ...reports.map((r) => ({ ...r, submissionType: "report" as const })),
      ],
    };
  } catch (error) {
    console.error("[v0] Error fetching all employee submissions:", error);
    return { success: false, error, data: [] };
  }
}

// Helper function to fetch submissions
export async function fetchSubmissions(submissionType: "workplan" | "report") {
  try {
    const { data, error } = await supabase
      .from(submissionType === "workplan" ? "workplans" : "reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // Table might not exist yet - return empty gracefully
      if (
        error.code === "PGRST205" ||
        error.message?.includes("Could not find the table")
      ) {
        console.log("[v0] Table not found (needs migration):", error.message);
        return { success: false, error, data: [], tableMissing: true };
      }
      throw error;
    }
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("[v0] Error fetching submissions:", error);
    return { success: false, error, data: [] };
  }
}

// Fetch all submissions from both tables (for supervisor)
export async function fetchAllSubmissions() {
  try {
    const [wpResult, rpResult] = await Promise.allSettled([
      supabase
        .from("workplans")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const workplans =
      wpResult.status === "fulfilled" && !wpResult.value.error
        ? (wpResult.value.data || []).map((w: Record<string, unknown>) => ({
            ...w,
            submissionType: "Workplan" as const,
          }))
        : [];
    const reports =
      rpResult.status === "fulfilled" && !rpResult.value.error
        ? (rpResult.value.data || []).map((r: Record<string, unknown>) => ({
            ...r,
            submissionType: "Report" as const,
          }))
        : [];

    // Check if tables are missing
    const wpMissing =
      wpResult.status === "fulfilled" &&
      wpResult.value.error?.code === "PGRST205";
    const rpMissing =
      rpResult.status === "fulfilled" &&
      rpResult.value.error?.code === "PGRST205";

    if (wpMissing && rpMissing) {
      return {
        success: false,
        error: wpResult.value.error,
        data: [],
        tableMissing: true,
      };
    }

    return { success: true, data: [...workplans, ...reports] };
  } catch (error) {
    console.error("[v0] Error fetching all submissions:", error);
    return { success: false, error, data: [] };
  }
}

// Helper function to update submission status
export async function updateSubmissionStatus(
  id: string,
  status: string,
  feedback?: string,
  submissionType: "workplan" | "report" = "workplan",
) {
  try {
    const { data, error } = await supabase
      .from(submissionType === "workplan" ? "workplans" : "reports")
      .update({
        status,
        feedback,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("[v0] Error updating submission status:", error);
    return { success: false, error };
  }
}

// Test connection - gracefully handles missing tables
export async function testConnection() {
  try {
    // Simple health check against Supabase auth endpoint instead of relying on tables
    const { error } = await supabase.auth.getSession();
    if (error) throw error;
    console.log("[v0] Supabase connection successful");
    return { success: true };
  } catch (error) {
    console.error("[v0] Supabase connection failed:", error);
    return { success: false, error };
  }
}
