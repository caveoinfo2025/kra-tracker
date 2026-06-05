import { redirect } from "next/navigation";

// /settings/workflow → /settings/workflow/approval-engine
export default function WorkflowPage() {
  redirect("/settings/workflow/approval-engine");
}
