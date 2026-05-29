import { AIChatPage } from "@/components/AIChatPage";

const quickPrompts = [
  "Quantos deals abertos temos por pipeline?",
  "Top 10 leads com maior probabilidade de fechar reunião",
  "Liste deals parados há mais de 30 dias e exporte em CSV",
  "Quais atividades estão pendentes esta semana?",
  "Resuma o funil de vendas hoje",
];

export default function AssistenteGeral() {
  return (
    <AIChatPage
      assistant="geral"
      title="Assistente IA"
      subtitle="Especialista em mercado imobiliário, vendas B2B e renderização 3D"
      quickPrompts={quickPrompts}
    />
  );
}
