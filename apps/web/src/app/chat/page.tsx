"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { ChatLayout } from "@/components/chat/chat-layout";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex h-full items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Sign in to start chatting</p>
          <SignInButton>
            <Button>Sign In</Button>
          </SignInButton>
        </div>
      </Unauthenticated>
      <Authenticated>
        <ChatLayout />
      </Authenticated>
    </>
  );
}
