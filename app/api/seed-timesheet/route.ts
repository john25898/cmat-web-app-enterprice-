// Seed script — run this once to populate demo timesheet data
export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const staffEmail = "staff@chak.org";
  const staffName = "Staff";
  const facility = "Meru Health Center";

  const submission = {
    id: "demo_sub_1",
    staffEmail,
    staffName,
    facility,
    year,
    month,
    activities: [
      {
        id: "act_1",
        project: "Community Outreach",
        activity: "Mobile clinic setup and patient registration",
        comments: "Set up at Meru village market, registered 85 patients",
        timeEntries: {
          [`${year}-${String(month + 1).padStart(2, "0")}-03`]: 8,
          [`${year}-${String(month + 1).padStart(2, "0")}-04`]: 7.5,
          [`${year}-${String(month + 1).padStart(2, "0")}-05`]: 8,
          [`${year}-${String(month + 1).padStart(2, "0")}-06`]: 6,
          [`${year}-${String(month + 1).padStart(2, "0")}-07`]: 4,
        },
        weekIndex: 0,
      },
      {
        id: "act_2",
        project: "MHU Operations",
        activity: "Medical supplies inventory and restocking",
        comments: "Conducted end-of-month inventory count",
        timeEntries: {
          [`${year}-${String(month + 1).padStart(2, "0")}-10`]: 8,
          [`${year}-${String(month + 1).padStart(2, "0")}-11`]: 8,
          [`${year}-${String(month + 1).padStart(2, "0")}-12`]: 6,
        },
        weekIndex: 1,
      },
      {
        id: "act_3",
        project: "Training & Capacity Building",
        activity: "Community health worker training session",
        comments: "Trained 15 CHWs on maternal health screening",
        timeEntries: {
          [`${year}-${String(month + 1).padStart(2, "0")}-17`]: 8,
          [`${year}-${String(month + 1).padStart(2, "0")}-18`]: 8,
          [`${year}-${String(month + 1).padStart(2, "0")}-19`]: 8,
          [`${year}-${String(month + 1).padStart(2, "0")}-20`]: 8,
          [`${year}-${String(month + 1).padStart(2, "0")}-21`]: 4,
        },
        weekIndex: 2,
      },
    ],
    totalHours: 83.5,
    status: "draft",
    createdAt: now.toISOString(),
  };

  return Response.json({
    message: "Use this data in browser console.",
    instructions:
      'Open browser console and run: localStorage.setItem("chak-timesheet-submissions", \'' +
      JSON.stringify([submission]) +
      "'); Then refresh the page and log in as staff@chak.org",
    data: [submission],
  });
}
