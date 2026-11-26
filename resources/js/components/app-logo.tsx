import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#081a14] text-emerald-500 ring-1 ring-emerald-500/25 ring-inset">
                <AppLogoIcon className="size-5 text-emerald-500" />
            </div>
            <div className="ml-1.5 grid flex-1 text-left text-sm">
                <span className="truncate leading-tight font-bold tracking-tight">
                    Zenbase
                </span>
                <span className="truncate font-mono text-[10px] text-muted-foreground">
                    BaaS Platform
                </span>
            </div>
        </>
    );
}
