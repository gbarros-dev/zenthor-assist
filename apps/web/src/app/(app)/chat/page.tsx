"use client";

import { ChatArea } from "@/components/chat/chat-area";
import Loader from "@/components/loader";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="bg-background/90 border-border shrink-0 border-b px-4 py-4 backdrop-blur-sm lg:px-6">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger />
          <h1 className="text-foreground truncate text-lg font-semibold tracking-tight">Chats</h1>
        </div>
      </header>
      <ChatArea conversationId={conversationId} />
    </div>
  );
}
