import { AssistantWithHistory } from "@/components/ai/AssistantWithHistory";

const quickPrompts = [
  "Quais meus deals têm maior probabilidade de fechar reunião?",
  "Liste meus deals parados há mais de 15 dias",
  "Exporte em CSV todos os leads prospectados parados",
  "Resuma meu pipeline hoje",
  "Como abordar construtora sem lançamento agora?",
];

export default function AssistenteVendas() {
  return (
    <AssistantWithHistory
      assistant="vendas"
      basePath="/assistente-vendas"
      title="Assistente de Vendas"
      subtitle="IA especializada em vendas B2B com SPIN Selling para renderização 3D"
      quickPrompts={quickPrompts}
    />
  );
}
