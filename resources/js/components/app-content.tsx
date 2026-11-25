import * as React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { AppVariant } from "@/types";

type Props = React.ComponentProps<"main"> & {
    variant?: AppVariant;
};

export function AppContent({
    variant = "sidebar",
    children,
    className,
    ...props
}: Props) {
    if (variant === "sidebar") {
        return (
            <SidebarInset className={className} {...props}>
                {children}
            </SidebarInset>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-2.5 md:p-3">
            <main
                scroll-region=""
                className={cn(
                    "mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-x-clip overflow-y-auto rounded-3xl border_ border-border/80_ bg-background p-6 shadow-none md:rounded-[1.75rem]",
                    className,
                )}
                {...props}
            >
                {children}
            </main>
        </div>
    );
}
