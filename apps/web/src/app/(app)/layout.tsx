"use client";

import { useUser } from "@clerk/nextjs";
import { api } from "@zenthor-assist/backend/convex/_generated/api";
import type { Id } from "@zenthor-assist/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar/app-sidebar";
import Loader from "@/components/loader";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppContext } from "@/hooks/use-app-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const getOrCreateUser = useMutation(api.users.getOrCreateFromClerk);
  const getOrCreateConversation = useMutation(api.conversations.getOrCreate);

  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function init() {
      const uId = await getOrCreateUser({
        externalId: user!.id,
        name: user!.fullName || user!.firstName || "User",
        email: user!.primaryEmailAddress?.emailAddress,
        image: user!.imageUrl,
      });
      setUserId(uId);

      const convId = await getOrCreateConversation({
        userId: uId,
        channel: "web",
      });
      setConversationId(convId);
      setLoading(false);
    }

    init();
  }, [user, getOrCreateUser, getOrCreateConversation]);

  if (loading || !userId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ userId, conversationId, setConversationId }}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AppContext.Provider>
  );
}
