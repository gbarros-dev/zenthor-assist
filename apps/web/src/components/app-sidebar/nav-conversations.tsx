"use client";

import { api } from "@zenthor-assist/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { MessageSquare } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAppContext } from "@/hooks/use-app-context";

export function NavConversations() {
  const { userId, conversationId, setConversationId } = useAppContext();
  const conversations = useQuery(api.conversations.listByUser, { userId });
  const pathname = usePathname();
  const router = useRouter();

  const handleSelect = (id: typeof conversationId) => {
    if (!id) return;
    setConversationId(id);
    if (!pathname.startsWith("/chat")) {
      router.push("/chat" as "/");
    }
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Conversations</SidebarGroupLabel>
      <SidebarMenu>
        {conversations?.map((conv) => (
          <SidebarMenuItem key={conv._id}>
            <SidebarMenuButton
              isActive={conversationId === conv._id}
              onClick={() => handleSelect(conv._id)}
            >
              <MessageSquare />
              <span>{conv.title || "Chat"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        {(!conversations || conversations.length === 0) && (
          <p className="text-muted-foreground px-2 py-1 text-xs">No conversations yet</p>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
