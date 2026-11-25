import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

type SharedFlashPayload = {
    id?: string | null;
    success?: string | null;
    error?: string | null;
    warning?: string | null;
    info?: string | null;
    toast?: FlashToast | null;
};

function dispatchSharedFlash(
    flash: SharedFlashPayload | undefined,
    seenIds: Set<string>,
): void {
    if (!flash) {
        return;
    }

    if (flash.toast?.message) {
        const key = `toast:${flash.id ?? ''}:${flash.toast.type}:${flash.toast.message}`;
        if (!seenIds.has(key)) {
            seenIds.add(key);
            toast[flash.toast.type](flash.toast.message);
        }
    }

    const dedupePrefix = flash.id ? `${flash.id}:` : '';

    if (flash.success) {
        const key = `${dedupePrefix}success:${flash.success}`;
        if (!seenIds.has(key)) {
            seenIds.add(key);
            toast.success(flash.success);
        }
    }

    if (flash.error) {
        const key = `${dedupePrefix}error:${flash.error}`;
        if (!seenIds.has(key)) {
            seenIds.add(key);
            toast.error(flash.error);
        }
    }

    if (flash.warning) {
        const key = `${dedupePrefix}warning:${flash.warning}`;
        if (!seenIds.has(key)) {
            seenIds.add(key);
            toast.warning(flash.warning);
        }
    }

    if (flash.info) {
        const key = `${dedupePrefix}info:${flash.info}`;
        if (!seenIds.has(key)) {
            seenIds.add(key);
            toast.info(flash.info);
        }
    }

    if (seenIds.size > 100) {
        const oldest = seenIds.values().next().value;
        if (oldest) {
            seenIds.delete(oldest);
        }
    }
}

export function useFlashToast(): void {
    const seenIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const seenIds = seenIdsRef.current;

        // Handle any flash payload present on initial server-rendered page load
        try {
            const initialPageEl = document.getElementById('app');
            const rawPage = initialPageEl?.dataset.page;
            if (rawPage) {
                const parsed = JSON.parse(rawPage) as {
                    props?: { flash?: SharedFlashPayload };
                };
                dispatchSharedFlash(parsed.props?.flash, seenIds);
            }
        } catch {
            // Ignore malformed dataset payloads
        }

        const removeFlashListener = router.on('flash', (event) => {
            const flash = (event as CustomEvent<{ flash?: SharedFlashPayload }>)
                .detail?.flash;
            dispatchSharedFlash(flash, seenIds);
        });

        const removeSuccessListener = router.on('success', (event) => {
            const flash = (
                event as CustomEvent<{
                    page?: { props?: { flash?: SharedFlashPayload } };
                }>
            ).detail?.page?.props?.flash;
            dispatchSharedFlash(flash, seenIds);
        });

        const removeNavigateListener = router.on('navigate', (event) => {
            const flash = (
                event as CustomEvent<{
                    page?: { props?: { flash?: SharedFlashPayload } };
                }>
            ).detail?.page?.props?.flash;
            dispatchSharedFlash(flash, seenIds);
        });

        return () => {
            removeFlashListener();
            removeSuccessListener();
            removeNavigateListener();
        };
    }, []);
}
