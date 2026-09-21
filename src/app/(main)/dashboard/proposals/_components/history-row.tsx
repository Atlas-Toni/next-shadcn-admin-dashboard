"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type Proposal, unrejectProposal } from "@/lib/proposals";

const STATUS_COLOR: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  done: "default",
  approved: "default",
  rejected: "outline",
  pending: "secondary",
  expired: "outline",
};

interface HistoryRowProps {
  item: Proposal;
}

export function HistoryRow({ item }: HistoryRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const canUnreject = item.status === "rejected";

  const handleUnreject = () => {
    startTransition(async () => {
      try {
        await unrejectProposal(item.id);
        toast.success(`Voorstel teruggezet naar pending.`);
        router.refresh();
      } catch (err) {
        toast.error(`Terugzetten mislukt: ${(err as Error).message}`);
      }
    });
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="text-muted-foreground text-xs">
            <code className="font-mono">{item.agent}</code> ·{" "}
            {item.resolved_at ? new Date(item.resolved_at).toLocaleString("nl-NL") : "?"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_COLOR[item.status] ?? "secondary"}>{item.status}</Badge>
          {canUnreject && (
            <Button
              onClick={handleUnreject}
              disabled={isPending}
              variant="ghost"
              size="sm"
              title="Terugzetten naar pending"
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
              <span className="ml-1">Terugzetten</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
