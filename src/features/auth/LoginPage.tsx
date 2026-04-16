import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Languages } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { supabase } from '@/data/supabase'
import { useT } from '@/shared/i18n'
import { useLanguageStore } from '@/shared/store/languageStore'
import { APP_VERSION } from '@/version'
import { hasAppUpdate } from '@/shared/utils/checkForAppUpdate'
import { hardRefreshApp } from '@/shared/utils/hardRefreshApp'

interface FormValues {
  email:           string
  password:        string
  name:            string
  confirmPassword: string
}

export default function LoginPage() {
  const t = useT()
  const { lang, setLang } = useLanguageStore()
  const [mode, setMode]           = useState<'login' | 'signup'>('login')
  const [error, setError]         = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const navigate = useNavigate()
  const handleLogoClick = async () => {
    if (await hasAppUpdate()) {
      await hardRefreshApp()
    }
  }

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    shouldUnregister: true,
  })

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next)
    setError(null)
    setSuccessMsg(null)
    reset()
  }

  const onSubmit = handleSubmit(async ({ email, password, name }) => {
    setError(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/')
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() } },
        })
        if (error) throw error
        setSuccessMsg(t('auth.accountCreated'))
        switchMode('login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.authFailed'))
    }
  })

  return (
    <div className="min-h-screen flex items-start justify-center bg-background p-4 pt-8 sm:pt-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="mt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}
            className="flex h-7 items-center gap-1 px-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            aria-label="Toggle language"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang.toUpperCase()}
          </button>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => { void handleLogoClick() }}
            className="cursor-pointer"
            aria-label="Check app updates"
            title="Check app updates"
          >
            <img src="/financelli-logo-light.svg" alt="Financelli" className="h-20 dark:hidden" />
            <img src="/financelli-logo-dark.svg" alt="Financelli" className="h-20 hidden dark:block" />
          </button>
          <h1 className="sr-only">Financelli</h1>
          <p className="text-sm text-muted-foreground">{t('auth.appDescription')}</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {mode === 'login' ? t('auth.signInTitle') : t('auth.signUpTitle')}
            </CardTitle>
            <CardDescription>
              {mode === 'login' ? t('auth.signInDescription') : t('auth.signUpDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              {successMsg && (
                <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                  {successMsg}
                </div>
              )}
              {error && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Name — signup only */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t('auth.name')}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('auth.namePlaceholder')}
                    autoComplete="name"
                    {...register('name', { required: t('auth.nameRequired') })}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="email"
                  {...register('email', { required: t('auth.emailRequired') })}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  {...register('password', {
                    required: t('auth.passwordRequired'),
                    minLength: { value: 6, message: t('auth.passwordMinLength') },
                  })}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm password — signup only */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register('confirmPassword', {
                      required: t('auth.confirmRequired'),
                      validate: val => val === watch('password') || t('auth.passwordMismatch'),
                    })}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" loading={isSubmitting}>
                {mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === 'login' ? t('auth.switchToSignUp') + ' ' : t('auth.switchToSignIn') + ' '}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground cursor-pointer"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              >
                {mode === 'login' ? t('auth.signUpLink') : t('auth.signInLink')}
              </button>
            </p>
            <p className="mt-2 text-center text-[10px] text-muted-foreground/60">{APP_VERSION}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
