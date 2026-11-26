import { Form, Head } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Connexion" />

            {status && (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {status}
                </div>
            )}

            <PasskeyVerify
                label="Se connecter avec une clé d'accès"
                loadingLabel="Authentification..."
                separator="Ou continuer par e-mail"
            />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Adresse e-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="vous@exemple.com"
                                    className="h-10 rounded-xl bg-card/60 transition-colors focus-visible:border-emerald-500/60"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">
                                        Mot de passe
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                                            tabIndex={5}
                                        >
                                            Mot de passe oublié ?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Votre mot de passe"
                                    className="h-10 rounded-xl bg-card/60 transition-colors focus-visible:border-emerald-500/60"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-2.5 pt-1">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label
                                    htmlFor="remember"
                                    className="text-sm font-normal text-muted-foreground"
                                >
                                    Rester connecté sur cet appareil
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-10 w-full rounded-xl font-medium"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing ? (
                                    <Spinner />
                                ) : (
                                    <ArrowRight className="size-4" />
                                )}
                                Se connecter
                            </Button>
                        </div>

                        <div className="border-t border-border/70 pt-5 text-center text-sm text-muted-foreground">
                            Pas encore de compte ?{' '}
                            <TextLink
                                href={register()}
                                tabIndex={5}
                                className="font-medium text-emerald-700 decoration-emerald-500/40 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                            >
                                Créer un compte
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Bon retour sur Zenbase',
    description:
        'Connectez-vous pour accéder à vos applications et vos projets.',
    variant: 'showcase',
    mode: 'login',
};
