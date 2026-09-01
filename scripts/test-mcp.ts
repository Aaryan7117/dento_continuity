import "dotenv/config";
import { handleToolCall } from "../mcp/tools";
import { handleResourceRead } from "../mcp/resources";
import { handlePromptGet } from "../mcp/prompts";

async function runTests() {
  console.log("=== Testing DENTO Continuity MCP Server ===\n");

  // 1. Practice Summary
  console.log("1. Testing tool: get_practice_summary");
  const summary: any = await handleToolCall("get_practice_summary", {});
  console.log("✓ Practice Summary:", JSON.stringify(summary, null, 2));

  // 2. Search Patients
  console.log("\n2. Testing tool: search_patients (query: 'a')");
  const search: any = await handleToolCall("search_patients", { query: "a", limit: 3 });
  console.log(`✓ Found ${search.count} patients:`, search.patients.map((p: any) => p.name));

  const firstPatientId = search.patients[0]?.id;

  // 3. Patient Chart
  if (firstPatientId) {
    console.log(`\n3. Testing tool: get_patient_chart (patientId: ${firstPatientId})`);
    const chart: any = await handleToolCall("get_patient_chart", { patientId: firstPatientId });
    console.log(`✓ Retrieved chart for: ${chart.demographics.name}`);
    console.log(`  Active Tooth Findings: ${chart.activeOdontogramFindings.length}`);
    console.log(`  Treatment Plans: ${chart.treatmentPlans.length}`);
    console.log(`  Encounters: ${chart.recentEncounters.length}`);
  }

  // 4. Today's Schedule
  console.log("\n4. Testing tool: get_today_schedule");
  const schedule: any = await handleToolCall("get_today_schedule", {});
  console.log(`✓ Today's Appointments: ${schedule.totalCount}`);

  // 5. Pending Recommendations
  console.log("\n5. Testing tool: get_pending_recommendations");
  const recs: any = await handleToolCall("get_pending_recommendations", {});
  console.log(`✓ Pending Retention Messages: ${recs.pendingCount}`);

  // 6. Smart Waitlist
  console.log("\n6. Testing tool: get_smart_waitlist");
  const waitlist: any = await handleToolCall("get_smart_waitlist", {});
  console.log(`✓ Smart Waitlist Entries: ${waitlist.count}`);

  // 7. Chair Utilization
  console.log("\n7. Testing tool: get_chair_utilization");
  const chair = await handleToolCall("get_chair_utilization", {});
  console.log(`✓ Chair Utilization:`, JSON.stringify(chair, null, 2));

  // 8. Resource Read
  console.log("\n8. Testing resource: dento://clinic/summary");
  const resSummary = await handleResourceRead("dento://clinic/summary");
  console.log("✓ Resource Output:", resSummary.text);

  // 9. Prompt Get
  console.log("\n9. Testing prompt: morning_briefing");
  const prompt = await handlePromptGet("morning_briefing");
  console.log("✓ Prompt Output Description:", prompt.description);

  console.log("\n=== ALL MCP TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
