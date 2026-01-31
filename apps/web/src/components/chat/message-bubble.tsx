"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <Avatar className={cn("mt-0.5", isUser ? "bg-primary" : "bg-muted")}>
        <AvatarFallback>
          {isUser ? (
            <User className="size-4 text-primary-foreground" />
          ) : (
            <Bot className="size-4 text-foreground" />
          )}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "max-w-[75%] rounded-sm px-3 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
