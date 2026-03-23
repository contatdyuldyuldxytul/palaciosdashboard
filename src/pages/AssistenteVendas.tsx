import { AIChatPage } from "@/components/AIChatPage";

const quickPrompts = [
  "Como abordar construtora sem lançamento agora?",
  "Gere 5 perguntas SPIN para incorporadora",
  "Me ajude com WhatsApp de follow-up",
  "Como responder já temos empresa de renders?",
  "Script de cold call para gerente de marketing",
];

export default function AssistenteVendas() {
  return (
    <AIChatPage
      assistant="vendas"
      title="Assistente de Vendas"
      subtitle="IA especializada em vendas B2B com SPIN Selling para renderização 3D"
      quickPrompts={quickPrompts}
    />
  );
}
