import { AlertCircle, Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProposalsSnapshot } from "@/lib/proposals";

import { ProposalCard } from "./_components/proposal-card";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  done: "default",
  approved: "default",
  rejected: "outline",
  pending: "secondary",
};

export default async function ProposalsPage() {
  const { pending, history, agents, connected, error } = await getProposalsSnapshot();

  return (
    <div className="@container/main flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Proposals</h1>
        <p className="text-muted-foreground text-sm">
          {connected
            ? `Verbonden met ATLAS · ${agents.length} agents: ${agents.join(", ")}`
            : "Niet verbonden met ATLAS API"}
        </p>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Verbindingsprobleem</p>
              <p className="text-muted-foreground">{error}</p>
              <p className="text-muted-foreground mt-2 font-mono text-xs">
                Start in terminal: uvicorn src.api.proposals_api:app --host 127.0.0.1 --port 8787 --reload
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Wachten op jouw JA/NEE</h2>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground flex items-center gap-2 pt-6 text-sm">
              <Inbox className="h-4 w-4" />
              Geen openstaande voorstellen.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pending.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent afgehandeld</h2>
        {history.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground pt-6 text-sm">Nog geen historie.</CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <Card key={h.id}>
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{h.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {h.agent} · {h.resolved_at ? new Date(h.resolved_at).toLocaleString("nl-NL") : "?"}
                    </p>
                  </div>
                  <Badge variant={STATUS_COLOR[h.status] ?? "secondary"}>{h.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
