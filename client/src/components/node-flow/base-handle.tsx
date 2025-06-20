import { forwardRef } from "react";
import { Handle } from "@xyflow/react";
import type { HandleProps } from "@xyflow/react";

import { cn } from "@/lib/utils";

export type BaseHandleProps = HandleProps;

export const BaseHandle = forwardRef<HTMLDivElement, BaseHandleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Handle
        ref={ref}
          {...props}

        className={cn(
          "!h-3 !w-3 rounded-full border-2 !border-slate-300 !bg-slate-100 transition dark:border-secondary dark:bg-secondary hover:!border-slate-500 !p-1",
          // for bigger hitbox
          "relative before:content-[''] before:absolute before:inset-[-8px] before:rounded-full before:z-10",
          className,
        )}
      >
        {children}
      </Handle>
    );
  },
);

BaseHandle.displayName = "BaseHandle";
