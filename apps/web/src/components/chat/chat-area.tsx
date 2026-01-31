"use client";

import { api } from "@gbarros-assistant/backend/convex/_generated/api";
import type { Id } from "@gbarros-assistant/backend/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { useEffect, useRef } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";

import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";

interface ChatAreaProps {
  conversationId: Id<"conversations">;
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const messages = useQuery(api.messages.listByConversation, { conversationId });
  const sendMessage = useMutation(api.messages.send);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string) => {
    await sendMessage({
      conversationId,
      content,
      channel: "web",
    });
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {messages?.map((msg) => (
            <MessageBubble key={msg._id} role={msg.role} content={msg.content} />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <MessageInput onSend={handleSend} />
    </div>
  );
}
