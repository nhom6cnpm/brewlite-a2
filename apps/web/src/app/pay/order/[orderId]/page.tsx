import PaymentMethodPicker from "@/components/payments/PaymentMethodPicker";

export default async function PaymentOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  return <PaymentMethodPicker orderId={(await params).orderId} />;
}
