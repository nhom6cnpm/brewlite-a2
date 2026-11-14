import OrderHistoryDetail from "@/components/admin/OrderHistoryDetail";

export default async function AdminOrderHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderHistoryDetail id={id} />;
}
