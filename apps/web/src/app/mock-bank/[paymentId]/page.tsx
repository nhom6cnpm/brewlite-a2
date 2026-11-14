import MockBankTransfer from "@/components/payments/MockBankTransfer";

export default async function MockBankPage({ params }: { params: Promise<{ paymentId: string }> }) {
  return <MockBankTransfer paymentId={(await params).paymentId} />;
}
