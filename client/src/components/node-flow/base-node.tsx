import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const BaseNode = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { selected?: boolean }
>(({ className, selected, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-md border bg-card p-5 text-card-foreground",
      className,
      "hover:border-muted-foreground",
      selected && "border-blue-400 shadow-lg hover:border-blue-500",
    )}
    tabIndex={0}
    {...props}
  />
));

BaseNode.displayName = "BaseNode";
