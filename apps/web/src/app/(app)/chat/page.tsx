"use client";

import { ChatArea } from "@/components/chat/chat-area";
import Loader from "@/components/loader";
import { useAppContext } from "@/hooks/use-app-context";

export default function ChatPage() {
  const { conversationId } = useAppContext();

  if (!conversationId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <ChatArea conversationId={conversationId} />
    </div>
  );
}
