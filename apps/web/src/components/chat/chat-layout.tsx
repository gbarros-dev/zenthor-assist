"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@gbarros-assistant/backend/convex/_generated/api";
import type { Id } from "@gbarros-assistant/backend/convex/_generated/dataModel";
import { ConversationList } from "./conversation-list";
import { ChatArea } from "./chat-area";
import Loader from "@/components/loader";

export function ChatLayout() {
  const { user } = useUser();
  const getOrCreateContact = useMutation(api.contacts.getOrCreateFromClerk);
  const getOrCreateConversation = useMutation(api.conversations.getOrCreate);

  const [contactId, setContactId] = useState<Id<"contacts"> | null>(null);
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function init() {
      const cId = await getOrCreateContact({
        clerkUserId: user!.id,
        name: user!.fullName || user!.firstName || "User",
      });
      setContactId(cId);

      const convId = await getOrCreateConversation({
        contactId: cId,
        channel: "web",
      });
      setConversationId(convId);
      setLoading(false);
    }

    init();
  }, [user]);

  if (loading || !contactId || !conversationId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 border-r md:block">
        <div className="border-b p-3 text-sm font-medium">Conversations</div>
        <ConversationList
          contactId={contactId}
          activeConversationId={conversationId}
          onSelect={setConversationId}
        />
      </aside>
      <main className="flex-1">
        <ChatArea conversationId={conversationId} />
      </main>
    </div>
  );
}
