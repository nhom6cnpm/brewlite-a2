import PaymentSession from "@/components/payments/PaymentSession";

export default async function PaymentPage({ params }: { params: Promise<{ paymentId: string }> }) {
  return <PaymentSession paymentId={(await params).paymentId} />;
}
