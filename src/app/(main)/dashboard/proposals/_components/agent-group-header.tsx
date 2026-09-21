"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { bulkRejectAgent } from "@/lib/proposals";

interface AgentGroupHeaderProps {
  agent: string;
  count: number;
}

export function AgentGroupHeader({ agent, count }: AgentGroupHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        const result = await bulkRejectAgent(agent);
        toast.success(`${result.rejected} voorstel(len) van ${agent} verworpen.`);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(`Bulk-reject mislukt: ${(err as Error).message}`);
      }
    });
  };

  return (
    <div className="flex items-center justify-between gap-2 border-b pb-2">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-medium">
          <code className="font-mono">{agent}</code>
        </h3>
        <span className="text-muted-foreground text-xs">
          {count} {count === 1 ? "voorstel" : "voorstellen"}
        </span>
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={isPending}>
            {isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <XCircle className="mr-1 h-3 w-3" />}
            Alles afwijzen
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alle voorstellen van {agent} afwijzen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit verwerpt {count} openstaande {count === 1 ? "voorstel" : "voorstellen"} in één keer. Individuele items
              kun je daarna nog terughalen via de history-lijst.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                `Ja, ${count} afwijzen`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
