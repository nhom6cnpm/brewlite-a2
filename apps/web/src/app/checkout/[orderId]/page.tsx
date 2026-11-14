import PaymentMethodPicker from "@/components/payments/PaymentMethodPicker";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <PaymentMethodPicker key={orderId} orderId={orderId} />;
}