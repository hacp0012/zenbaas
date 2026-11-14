import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <AppLogoIcon className="size-5 text-white" />
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
