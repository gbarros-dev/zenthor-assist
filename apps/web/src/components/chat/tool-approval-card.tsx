"use client";

import { api } from "@zenthor-assist/backend/convex/_generated/api";
import type { Id } from "@zenthor-assist/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Check, ChevronDown, ShieldAlert, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ToolApprovalCardProps {
  approvalId: string;
  toolName: string;
  toolInput: unknown;
  status: "pending" | "approved" | "rejected";
}

export function ToolApprovalCard({
  approvalId,
  toolName,
  toolInput,
  status,
}: ToolApprovalCardProps) {
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState<"approved" | "rejected" | null>(null);
  const resolve = useMutation(api.toolApprovals.resolve);

  const isPending = status === "pending" && !resolving;

  async function handleResolve(decision: "approved" | "rejected") {
    setResolving(decision);
    try {
      await resolve({
        approvalId: approvalId as Id<"toolApprovals">,
        status: decision,
      });
    } catch {
      setResolving(null);
    }
  }

  const displayStatus = resolving ?? (status !== "pending" ? status : null);

  const inputPreview = (() => {
    const raw = JSON.stringify(toolInput, null, 2);
    return raw.length > 200 ? `${raw.slice(0, 200)}...` : raw;
  })();

  return (
    <div
      className={cn(
        "border-border/50 rounded-sm border px-3 py-2 text-sm",
        isPending ? "border-amber-500/30 bg-amber-500/5" : "bg-muted/50",
      )}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert
          className={cn("size-4 shrink-0", isPending ? "text-amber-500" : "text-muted-foreground")}
        />
        <span className="flex-1 truncate font-mono font-semibold">{toolName}</span>
        {displayStatus === "approved" && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="size-3" />
            Approved
          </span>
        )}
        {displayStatus === "rejected" && (
          <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            <X className="size-3" />
            Rejected
          </span>
        )}
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="text-muted-foreground mt-1 flex items-center gap-1 text-xs hover:underline">
          <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
          {open ? "Hide" : "Show"} input
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-1 overflow-x-auto rounded bg-black/10 p-2 text-xs dark:bg-white/10">
            {inputPreview}
          </pre>
        </CollapsibleContent>
      </Collapsible>

      {isPending && (
        <div className="mt-2 flex gap-2">
          <Button
            size="xs"
            variant="outline"
            disabled={!!resolving}
            className="text-green-700 hover:bg-green-500/10 hover:text-green-700 dark:text-green-400 dark:hover:text-green-400"
            onClick={() => handleResolve("approved")}
          >
            <Check />
            Approve
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={!!resolving}
            className="text-red-700 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-400"
            onClick={() => handleResolve("rejected")}
          >
            <X />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
