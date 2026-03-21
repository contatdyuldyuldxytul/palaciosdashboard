import { useState } from "react";
import { Copy, Star, Search, Check } from "lucide-react";

const scripts = [
  {
    category: "Cold Call — Primeiro Contato",
    items: [
      {
        id: "cc1",
        text: "Bom dia [Nome], aqui é [Seu nome] da Palacios 3D. A gente cria materiais visuais estratégicos para lançamentos imobiliários — não só renders bonitos, mas imagens que aumentam a taxa de conversão na planta. Vi que vocês têm um lançamento vindo aí — faz sentido a gente conversar 20 minutos?",
      },
    ],
  },
  {
    category: "Objeção — Sem Lançamento Agora",
    items: [
      {
        id: "ob1",
        text: "Entendo perfeitamente. Exatamente por isso faz sentido conversar agora — material visual de qualidade leva tempo para produzir. Se o lançamento for daqui 3 meses, o material precisa estar pronto antes. Você quer chegar no lançamento com o material certo ou correndo?",
      },
    ],
  },
  {
    category: "Objeção — Preciso Falar com Diretor",
    items: [
      {
        id: "ob2",
        text: "Claro, faz todo sentido. Me ajuda a preparar melhor: o que ele normalmente prioriza mais — velocidade de venda, custo do material ou diferenciação visual do concorrente?",
      },
    ],
  },
  {
    category: "Objeção — Já Temos Fornecedor",
    items: [
      {
        id: "ob3",
        text: "Ótimo, significa que vocês já reconhecem o valor disso. Minha pergunta é: o material que vocês têm hoje foi pensado como estratégia de vendas ou como entrega visual? O que a gente faz é diferente — posso mostrar em 15 minutos?",
      },
    ],
  },
  {
    category: "SPIN Selling — Perguntas",
    items: [
      { id: "sp1", text: "Situação: Como tem sido o processo de venda na planta? Quantos leads precisam para fechar uma unidade?" },
      { id: "sp2", text: "Problema: O material visual atual está ajudando a converter ou os clientes precisam muito da própria imaginação?" },
      { id: "sp3", text: "Implicação: Quando o material não convence na visita, como isso afeta o ritmo do seu lançamento?" },
      { id: "sp4", text: "Necessidade: Se o material já chegasse pronto para converter — ângulos estratégicos, lifestyle, ambiente — quanto facilitaria o trabalho da sua equipe?" },
    ],
  },
  {
    category: "WhatsApp — Follow-up pós reunião",
    items: [
      {
        id: "wa1",
        text: "Olá [Nome]! Obrigado pela conversa. Segue a proposta em anexo conforme combinamos. Estou disponível para qualquer dúvida. Quando seria um bom momento para darmos o próximo passo?",
      },
    ],
  },
];

export default function Scripts() {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = scripts
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((i) =>
        i.text.toLowerCase().includes(search.toLowerCase()) ||
        cat.category.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Scripts de Vendas</h1>
        <p className="text-sm text-muted-foreground mt-1">Banco de scripts para prospecção e tratamento de objeções</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar scripts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="space-y-6">
        {filtered.map((cat, ci) => (
          <div key={cat.category} className="animate-slide-up" style={{ animationDelay: `${ci * 80}ms`, animationFillMode: "backwards" }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{cat.category}</h2>
            <div className="space-y-3">
              {cat.items.map((item) => (
                <div key={item.id} className="glass-card-hover p-4 group">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{item.text}</p>
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(item.id, item.text)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied === item.id ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                      {copied === item.id ? "Copiado!" : "Copiar"}
                    </button>
                    <button
                      onClick={() => toggleFav(item.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Star className={`w-3 h-3 ${favorites.has(item.id) ? "fill-yellow-400 text-yellow-400" : ""}`} />
                      Favoritar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
