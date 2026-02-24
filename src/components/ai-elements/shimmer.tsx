import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type ShimmerProps = ComponentProps<"span"> & {
  duration?: number;
};

export const Shimmer = ({
  className,
  style,
  duration = 1.5,
  ...props
}: ShimmerProps) => (
  <span
    className={cn(
      "inline-block animate-skeleton bg-linear-to-r bg-size-[200%_100%] from-muted-foreground/50 via-foreground to-muted-foreground/50 bg-clip-text text-transparent",
      className
    )}
    style={
      {
        ...style,
        animationDuration: `${duration}s`,
      } as ComponentProps<"span">["style"]
    }
    {...props}
  />
);
