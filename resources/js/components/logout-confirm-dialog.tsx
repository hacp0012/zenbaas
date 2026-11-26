import { router } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';

export type LogoutConfirmDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function LogoutConfirmDialog({
    open,
    onOpenChange,
}: LogoutConfirmDialogProps) {
    const cleanup = useMobileNavigation();
    const [processing, setProcessing] = useState(false);

    function handleConfirmLogout() {
        setProcessing(true);
        cleanup();
        router.flushAll();
        router.post(
            logout().url,
            {},
            {
                onFinish: () => {
                    setProcessing(false);
                    onOpenChange(false);
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent role="alertdialog" className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                            <LogOut className="size-5" />
                        </div>
                        <div className="space-y-1 text-left">
                            <DialogTitle className="text-base font-bold">
                                Confirmer la déconnexion
                            </DialogTitle>
                            <DialogDescription className="text-xs leading-relaxed">
                                Voulez-vous vraiment vous déconnecter de votre
                                session Zenbase ? Vous devrez vous reconnecter
                                pour accéder à vos applications et paramètres.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <DialogFooter className="gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={processing}
                        onClick={() => onOpenChange(false)}
                    >
                        Annuler
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={processing}
                        onClick={handleConfirmLogout}
                        data-test="confirm-logout-button"
                    >
                        <LogOut className="mr-1.5 size-3.5" />
                        {processing ? 'Déconnexion...' : 'Se déconnecter'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
