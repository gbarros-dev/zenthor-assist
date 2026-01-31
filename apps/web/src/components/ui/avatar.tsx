import * as React from "react";

import { cn } from "@/lib/utils";

function Avatar({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar"
      className={cn(
        "bg-muted relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn("flex size-full items-center justify-center text-xs font-medium", className)}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback };
