import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, HeartPulse, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { Profile } from '../../data'
import { login, type AuthSessionSummary } from './accountActionApi'
import { maskCpf } from '../onboarding/validation'

export type AuthenticatedUiSession = { username: string; profile: Profile; name: string; tenantId?: string; tenantName?: string }

export function toUiSession(session: AuthSessionSummary): AuthenticatedUiSession {
  const profile: Profile = session.platformAdministrator?.role === 'SuperAdministrator'
    ? 'admin'
    : session.memberships.some((membership) => membership.role === 'Professional') ? 'professional' : 'clinic'
  const membership = session.memberships[0]
  return { username: session.user.email, profile, name: session.user.displayName, tenantId: session.activeTenant?.id ?? membership?.tenantId, tenantName: session.activeTenant?.name ?? membership?.tenantName }
}

export function LoginPage({ onLogin }: { onLogin: (session: AuthenticatedUiSession) => void }) {
  const [cpf, setCpf] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const session = toUiSession(await login(cpf, password)); onLogin(session)
      navigate(session.profile === 'admin' ? '/admin' : session.profile === 'professional' ? '/app/minha-agenda' : '/app/dashboard')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível entrar. Tente novamente.') }
    finally { setLoading(false) }
  }

  return <main className="login-page">
    <section className="login-brand-panel"><Link to="/" className="public-brand" style={{ color: 'white' }}><span className="brand-mark"><HeartPulse size={18} strokeWidth={2.5} /></span><span>brothers care</span></Link><div className="login-brand-copy"><div className="eyebrow" style={{ color: '#63d9be' }}>Cuidado conectado</div><h1>Gestão mais clara.<br /><em>Cuidado mais presente.</em></h1><p>Uma plataforma feita para aproximar profissionais, pacientes e a operação da sua clínica.</p><div className="login-trust"><ShieldCheck /><span>Acesso protegido e dados separados por clínica</span></div></div><div className="login-brand-foot">© 2026 Brothers Digital · Brothers Care</div></section>
    <section className="login-panel"><div className="login-box"><Link to="/" className="public-brand"><span className="brand-mark"><HeartPulse size={18} strokeWidth={2.5} /></span><span>brothers care</span></Link><h2>Bem-vindo de volta</h2><p>Entre com o CPF e a senha definidos no cadastro.</p><form className="login-form" onSubmit={submit}><div className="field"><label htmlFor="cpf">CPF</label><input id="cpf" inputMode="numeric" autoComplete="username" placeholder="000.000.000-00" value={cpf} onChange={(event) => setCpf(maskCpf(event.target.value))} maxLength={14} required autoFocus /></div><div className="field"><label htmlFor="password">Senha</label><div className="password-input"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff /> : <Eye />}</button></div></div>{error && <div className="login-error" role="alert">{error}</div>}<button className="button button-dark" type="submit" disabled={loading}>{loading ? 'Entrando…' : <>Entrar na plataforma <ArrowRight /></>}</button></form><div className="login-help"><Link to="/recuperar-senha">Esqueci minha senha</Link><a href="mailto:suporte@brothers.digital">Preciso de ajuda</a></div><p className="login-legal">Ao entrar, você concorda com nossos termos e política de privacidade.</p></div></section>
  </main>
}
