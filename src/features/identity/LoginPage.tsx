import { useState } from 'react'
import { ArrowRight, HeartPulse } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { Profile } from '../../data'
import { login, type AuthSessionSummary } from './accountActionApi'

export type AuthenticatedUiSession = { username: string; profile: Profile; name: string }

export function toUiSession(session: AuthSessionSummary): AuthenticatedUiSession {
  const profile: Profile = session.platformAdministrator?.role === 'SuperAdministrator'
    ? 'admin'
    : session.memberships.some((membership) => membership.role === 'Professional') ? 'professional' : 'clinic'
  return { username: session.user.email, profile, name: session.user.displayName }
}

export function LoginPage({ onLogin }: { onLogin: (session: AuthenticatedUiSession) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const session = toUiSession(await login(email, password))
      onLogin(session)
      navigate(session.profile === 'admin' ? '/admin' : session.profile === 'professional' ? '/app/minha-agenda' : '/app/dashboard')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="login-page"><section className="login-brand-panel"><Link to="/" className="public-brand" style={{ color: 'white' }}><span className="brand-mark"><HeartPulse size={18} strokeWidth={2.5} /></span><span>brothers care</span></Link><div className="login-brand-copy"><div className="eyebrow" style={{ color: '#63d9be' }}>Cuidado conectado</div><h1>Gestão mais clara.<br /><em>Cuidado mais presente.</em></h1><p>Uma plataforma feita para aproximar profissionais, pacientes e a operação da sua clínica.</p></div><div className="login-brand-foot">© 2026 Brothers Digital · Brothers Care</div></section><section className="login-panel"><div className="login-box"><Link to="/" className="public-brand"><span className="brand-mark"><HeartPulse size={18} strokeWidth={2.5} /></span><span>brothers care</span></Link><h2>Bem-vindo de volta</h2><p>Acesse seu espaço de trabalho Brothers Care.</p><form className="login-form" onSubmit={submit}><div className="field"><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="field"><label htmlFor="password">Senha</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>{error && <div className="login-error" role="alert">{error}</div>}<button className="button button-dark" type="submit" disabled={loading}>{loading ? 'Entrando…' : <>Entrar na plataforma <ArrowRight /></>}</button></form><Link to="/recuperar-senha" className="account-action-back">Esqueci minha senha</Link><p style={{ marginTop: 18, fontSize: 9 }}>Ao entrar, você concorda com nossos termos e política de privacidade.</p></div></section></main>
}
