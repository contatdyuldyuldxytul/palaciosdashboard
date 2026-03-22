import { AIChatPage } from "@/components/AIChatPage";

const quickPrompts = [
  "Analise meu faturamento vs meta este mês",
  "Devo contratar um 3º SDR agora?",
  "Como chego a R$50.000/mês?",
  "Meu fluxo de caixa está saudável?",
  "Quais métricas focar esta semana?",
];

export default function AssistenteFundador() {
  return (
    <AIChatPage
      assistant="fundador"
      title="Assistente do Fundador"
      subtitle="Consultor estratégico com análise financeira e de métricas de vendas"
      quickPrompts={quickPrompts}
    />
  );
}
