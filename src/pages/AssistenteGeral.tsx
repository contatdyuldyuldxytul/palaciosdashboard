import { AIChatPage } from "@/components/AIChatPage";

const quickPrompts = [
  "Como funciona o mercado de lançamentos imobiliários no Brasil?",
  "Qual a melhor estratégia de precificação para serviços de renderização 3D?",
  "Me explique como montar uma equipe comercial para venda B2B",
  "Quais são as tendências de visualização 3D no mercado imobiliário?",
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
