import { AssistantWithHistory } from "@/components/ai/AssistantWithHistory";

const quickPrompts = [
  "Visão geral do funil de vendas agora",
  "Quais deals quentes acima de R$30k devem ser priorizados?",
  "Quantos deals estão parados há mais de 30 dias por owner?",
  "Reatribua todos os deals do estágio X do Felipe para a Aline",
  "Exporte em CSV o pipeline completo deste mês",
];

export default function AssistenteFundador() {
  return (
    <AssistantWithHistory
      assistant="fundador"
      basePath="/assistente-fundador"
      title="Assistente do Fundador"
      subtitle="Consultor estratégico com análise financeira e de métricas de vendas"
      quickPrompts={quickPrompts}
    />
  );
}
