"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Check, Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Proposal } from "@/lib/proposals";

interface ProposalCardProps {
  proposal: Proposal;
}

export function ProposalCard({ proposal }: ProposalCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = (kind: "approve" | "reject") => {
    setAction(kind);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/proposals/${proposal.id}/${kind}`, {
          method: "POST",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? body.detail ?? `HTTP ${res.status}`);
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
        setAction(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base leading-snug">{proposal.title}</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            wacht op JA/NEE
          </Badge>
        </div>
        <div className="text-muted-foreground text-xs">
          Agent: <code className="font-mono">{proposal.agent}</code> · ID:{" "}
          <code className="font-mono">{proposal.id}</code>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed">{proposal.description}</p>
        <p className="text-muted-foreground text-sm italic">→ {proposal.action_summary}</p>

        {error && <p className="text-destructive text-sm">Fout: {error}</p>}

        <div className="flex gap-2 pt-2">
          <Button onClick={() => decide("approve")} disabled={isPending} className="flex-1">
            {isPending && action === "approve" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            JA, uitvoeren
          </Button>
          <Button onClick={() => decide("reject")} disabled={isPending} variant="outline" className="flex-1">
            {isPending && action === "reject" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            NEE, sla over
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
