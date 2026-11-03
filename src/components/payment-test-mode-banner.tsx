const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken || (!clientToken.startsWith("pk_test_") && !clientToken.startsWith("pk_live_"))) {
    return <div role="status" className="w-full border-b border-border bg-card px-4 py-2 text-center text-sm text-muted-foreground">Compras ainda indisponíveis. As conversas por voz continuam disponíveis.</div>;
  }
  if (clientToken.startsWith("pk_test_")) {
    return <div role="status" className="w-full border-b border-border bg-secondary px-4 py-2 text-center text-sm text-secondary-foreground">Ambiente de teste: não faça pagamentos reais. As compras de moedas ainda não estão disponíveis.</div>;
  }
  return null;
}