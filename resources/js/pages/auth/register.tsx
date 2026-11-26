import { Form, Head } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
    return (
        <>
            <Head title="Créer un compte" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nom complet</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    placeholder="Votre nom"
                                    className="h-10 rounded-xl bg-card/60 transition-colors focus-visible:border-emerald-500/60"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Adresse e-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="vous@exemple.com"
                                    className="h-10 rounded-xl bg-card/60 transition-colors focus-visible:border-emerald-500/60"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Mot de passe</Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Choisissez un mot de passe"
                                    passwordrules={passwordRules}
                                    className="h-10 rounded-xl bg-card/60 transition-colors focus-visible:border-emerald-500/60"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirmer le mot de passe
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Répétez le mot de passe"
                                    passwordrules={passwordRules}
                                    className="h-10 rounded-xl bg-card/60 transition-colors focus-visible:border-emerald-500/60"
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-10 w-full rounded-xl font-medium"
                                tabIndex={5}
                                disabled={processing}
                                data-test="register-user-button"
                            >
                                {processing ? (
                                    <Spinner />
                                ) : (
                                    <ArrowRight className="size-4" />
                                )}
                                Créer mon compte
                            </Button>
                        </div>

                        <div className="border-t border-border/70 pt-5 text-center text-sm text-muted-foreground">
                            Vous avez déjà un compte ?{' '}
                            <TextLink
                                href={login()}
                                tabIndex={6}
                                className="font-medium text-emerald-700 decoration-emerald-500/40 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
                            >
                                Se connecter
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Créer votre espace Zenbase',
    description:
        'Créez votre compte pour lancer vos projets en quelques secondes.',
    variant: 'showcase',
    mode: 'register',
};
