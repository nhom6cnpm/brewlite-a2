import { redirect } from "next/navigation";

/** /admin opens the payments tab, the one staff watch during service. */
export default function AdminPage() {
  redirect("/admin/payments");
}
