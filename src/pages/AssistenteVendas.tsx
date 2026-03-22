import { AIChatPage } from "@/components/AIChatPage";

const quickPrompts = [
  "Como abordo construtora sem lançamento agora?",
  "Gere 5 perguntas SPIN para incorporadora de médio porte",
  "Me ajude com WhatsApp de follow-up",
  "Como respondo 'já temos empresa de renders'?",
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
