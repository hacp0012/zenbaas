import AuthSimpleLayout from '@/layouts/auth/auth-simple-layout';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';
import type { AuthLayoutProps } from '@/types';

export default function AuthLayout({
    title = '',
    description = '',
    variant = 'simple',
    mode = 'login',
    children,
}: AuthLayoutProps) {
    if (variant === 'showcase') {
        return (
            <AuthSplitLayout
                title={title}
                description={description}
                mode={mode}
            >
                {children}
            </AuthSplitLayout>
        );
    }

    return (
        <AuthSimpleLayout title={title} description={description}>
            {children}
        </AuthSimpleLayout>
    );
}
