import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type ConfirmActionDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    warningNote?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'destructive' | 'warning';
    processing?: boolean;
    onConfirm: () => void;
};

export function ConfirmActionDialog({
    open,
    onOpenChange,
    title,
    description,
    warningNote,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    variant = 'destructive',
    processing = false,
    onConfirm,
}: ConfirmActionDialogProps) {
    const isDestructive = variant === 'destructive';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-start gap-3">
                        <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                                isDestructive
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                        >
                            {isDestructive ? (
                                <AlertTriangle className="size-5" />
                            ) : (
                                <ShieldAlert className="size-5" />
                            )}
                        </div>
                        <div className="space-y-1 text-left">
                            <DialogTitle className="text-base font-bold">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-xs leading-relaxed">
                                {description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {warningNote && (
                    <div
                        className={`rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed ${
                            isDestructive
                                ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        }`}
                    >
                        <span className="font-semibold">Attention : </span>
                        {warningNote}
                    </div>
                )}

                <DialogFooter className="gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={processing}
                        onClick={() => onOpenChange(false)}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={isDestructive ? 'destructive' : 'default'}
                        className={
                            !isDestructive
                                ? 'bg-amber-600 text-white hover:bg-amber-500'
                                : undefined
                        }
                        disabled={processing}
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                    >
                        {processing ? 'Traitement...' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
