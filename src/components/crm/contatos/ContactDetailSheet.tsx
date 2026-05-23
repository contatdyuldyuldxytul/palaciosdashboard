import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ContactStatusBadge } from "./ContactStatusBadge";
import { useContatoDetalhes, type Contato } from "@/hooks/useContatos";
import { Mail, Phone, Building2, Briefcase, ExternalLink, Calendar, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export function ContactDetailSheet({
  contato,
  open,
  onOpenChange,
}: {
  contato: Contato | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useContatoDetalhes(contato?.id ?? null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] bg-background border-l border-white/10 overflow-y-auto">
        {contato && (
          <>
            <SheetHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center text-lg font-semibold">
                  {contato.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-base truncate">{contato.nome}</SheetTitle>
                  <div className="mt-1">
                    <ContactStatusBadge status={contato.status} />
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <section className="space-y-2">
                <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">Contato</h3>
                <div className="space-y-2 text-sm">
                  <Row icon={<Building2 className="w-3.5 h-3.5" />} value={contato.empresa} />
                  <Row icon={<Briefcase className="w-3.5 h-3.5" />} value={contato.cargo} />
                  <Row
                    icon={<Mail className="w-3.5 h-3.5" />}
                    value={contato.email}
                    href={contato.email ? `mailto:${contato.email}` : undefined}
                  />
                  <Row
                    icon={<Phone className="w-3.5 h-3.5" />}
                    value={contato.telefone}
                    href={contato.telefone ? `tel:${contato.telefone}` : undefined}
                  />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">Negociações</h3>
                {isLoading ? (
                  <div className="h-16 glass-card rounded-lg animate-pulse" />
                ) : !data?.deals.length ? (
                  <p className="text-xs text-muted-foreground">Nenhuma negociação vinculada.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.deals.map((d) => (
                      <Link
                        key={d.id}
                        to={`/crm/deal/${d.id}`}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg glass-card hover:bg-white/[0.06] transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-foreground truncate">{d.titulo}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {d.stage_nome || "—"} ·{" "}
                            <span
                              className={
                                d.status === "won"
                                  ? "text-primary"
                                  : d.status === "lost"
                                    ? "text-destructive"
                                    : "text-sky-400"
                              }
                            >
                              {d.status === "won" ? "ganho" : d.status === "lost" ? "perdido" : "aberto"}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-foreground tabular-nums">{fmt(d.valor)}</div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">Últimas atividades</h3>
                {isLoading ? (
                  <div className="h-16 glass-card rounded-lg animate-pulse" />
                ) : !data?.atividades.length ? (
                  <p className="text-xs text-muted-foreground">Sem atividades registradas.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.atividades.map((a) => (
                      <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-lg glass-card">
                        <div className="mt-0.5">
                          {a.concluida ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-foreground">{a.titulo}</div>
                          <div className="text-[11px] text-muted-foreground capitalize">
                            {a.tipo} ·{" "}
                            {new Date(a.scheduled_at || a.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon, value, href }: { icon: React.ReactNode; value: string | null; href?: string }) {
  if (!value) return null;
  const content = (
    <div className="flex items-center gap-2 text-foreground">
      <span className="text-muted-foreground">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
  return href ? (
    <a href={href} className="block hover:text-primary transition-colors">
      {content}
    </a>
  ) : (
    content
  );
}
