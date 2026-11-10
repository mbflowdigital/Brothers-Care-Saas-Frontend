import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, Check, CheckCircle2, HeartPulse, KeyRound, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { activateAccount, confirmPasswordRecovery, getInvitationContext, login, requestPasswordRecovery, selectActiveTenant, type InvitationContext } from './accountActionApi'
import { toUiSession, type AuthenticatedUiSession } from './LoginPage'
import './accountAction.css'
import { maskCpf } from '../onboarding/validation'

type Mode = 'activation' | 'recovery'
const roleLabel: Record<string, string> = { SuperAdministrator: 'Super Administrador', ClinicAdministrator: 'Administrador', Professional: 'Profissional', Receptionist: 'Recepção' }

export function AccountActionPage({ mode, onAuthenticated }: { mode: Mode; onAuthenticated?: (session: AuthenticatedUiSession) => void }) {
  const [searchParams] = useSearchParams(); const navigate = useNavigate(); const token = searchParams.get('token') ?? ''
  const [context, setContext] = useState<InvitationContext | null>(null); const [contextLoading, setContextLoading] = useState(mode === 'activation'); const [accepted, setAccepted] = useState(false)
  const [email, setEmail] = useState(''); const [cpf, setCpf] = useState(''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [loading, setLoading] = useState(false)
  const isConfirmation = mode === 'activation' || token.length > 0

  useEffect(() => {
    if (mode !== 'activation' || !token) { setContextLoading(false); return }
    getInvitationContext(token).then(setContext).catch((caught) => setError(caught instanceof Error ? caught.message : 'Este convite não está disponível.')).finally(() => setContextLoading(false))
  }, [mode, token])

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setSuccess('')
    if (isConfirmation && password !== confirmation) { setError('As senhas informadas não coincidem.'); return }
    if (mode === 'activation' && !accepted) { setError('Confirme os dados do convite para continuar.'); return }
    setLoading(true)
    try {
      if (mode === 'activation') {
        await activateAccount(token, cpf, password, confirmation)
        const authenticated = await login(cpf, password)
        const selected = context && authenticated.memberships.some((item) => item.tenantId === context.tenantId)
          ? await selectActiveTenant(context.tenantId) : authenticated
        const session = toUiSession(selected); onAuthenticated?.(session)
        setSuccess('Acesso confirmado. Preparando seu espaço…')
        const activeRole = selected.memberships.find((item) => item.tenantId === selected.activeTenant?.id)?.role
        window.setTimeout(() => navigate(session.profile === 'admin' ? '/admin' : activeRole === 'Professional' ? '/app/minha-agenda' : activeRole === 'Receptionist' ? '/app/agenda' : '/app/dashboard', { replace: true }), 550)
      } else if (isConfirmation) { await confirmPasswordRecovery(token, password, confirmation); setSuccess('Senha redefinida com sucesso. Agora você pode entrar na plataforma.') }
      else { await requestPasswordRecovery(email); setSuccess('Se a conta estiver apta, você receberá as instruções para redefinir a senha.') }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível concluir sua solicitação.') }
    finally { setLoading(false) }
  }

  if (mode === 'activation') return <main className="invitation-page"><section className="invitation-brand"><Link to="/" className="public-brand"><span className="brand-mark"><HeartPulse size={18} /></span><span>brothers care</span></Link><div><span className="invitation-kicker"><Sparkles /> Seu novo espaço de trabalho</span><h1>Boas-vindas.<br/><em>Vamos deixar tudo pronto?</em></h1><p>Um acesso individual, seguro e com somente o que você precisa para trabalhar.</p></div><small>Seus dados e permissões são protegidos por clínica.</small></section>
    <section className="invitation-panel"><div className="invitation-card">{contextLoading ? <div className="invitation-loading"><span/><h2>Validando seu convite…</h2><p>Isso leva só alguns segundos.</p></div> : !context ? <><div className="account-action-icon"><Mail /></div><h2>Este convite não está disponível</h2><p className="invitation-lead">{error || 'Ele pode ter expirado ou já ter sido utilizado.'}</p><Link className="button button-dark" to="/login">Ir para o login</Link></> : <><span className="invitation-kicker"><CheckCircle2 /> Convite confirmado</span><h2>Olá, {context.displayName.split(' ')[0]}!</h2><p className="invitation-lead">Você foi convidado para fazer parte de <strong>{context.tenantName}</strong>.</p><div className="invitation-summary"><article><span>{context.role === 'ClinicAdministrator' ? <ShieldCheck /> : context.role === 'Professional' ? <UserRound /> : <Building2 />}</span><div><small>Seu perfil</small><strong>{roleLabel[context.role] || context.role}</strong></div></article><article><span><Building2 /></span><div><small>{context.units.length === 1 ? 'Sua unidade' : 'Suas unidades'}</small><strong>{context.units.map((unit) => unit.name).join(', ')}</strong></div></article></div><form className="invitation-form" onSubmit={submit}>{!context.hasCpf && <div className="field"><label htmlFor="activation-cpf">Seu CPF</label><input id="activation-cpf" inputMode="numeric" autoComplete="username" placeholder="000.000.000-00" value={cpf} onChange={(event) => setCpf(maskCpf(event.target.value))} maxLength={14} required/><small>Usado somente para identificar seu acesso.</small></div>}{context.hasCpf && <div className="field"><label htmlFor="activation-cpf">Confirme seu CPF</label><input id="activation-cpf" inputMode="numeric" autoComplete="username" placeholder="000.000.000-00" value={cpf} onChange={(event) => setCpf(maskCpf(event.target.value))} maxLength={14} required/></div>}<div className="form-grid"><div className="field"><label htmlFor="new-password">{context.hasCpf ? 'Sua senha atual' : 'Crie uma senha'}</label><input id="new-password" type="password" autoComplete={context.hasCpf ? 'current-password' : 'new-password'} minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required/></div><div className="field"><label htmlFor="password-confirmation">Confirme a senha</label><input id="password-confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required/></div></div><label className="invitation-confirm"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)}/><span><Check /></span><p>Confirmo que meus dados, perfil e unidades estão corretos.</p></label>{error && <div className="login-error" role="alert">{error}</div>}{success && <div className="account-action-success"><CheckCircle2 />{success}</div>}<button className="button button-dark" disabled={loading}>{loading ? 'Preparando seu acesso…' : 'Confirmar e entrar'}{!loading && <Check />}</button><small className="account-action-hint">Ao continuar, sua sessão será iniciada diretamente no espaço adequado ao seu perfil.</small></form></>}</div></section></main>

  const title = isConfirmation ? 'Redefina sua senha' : 'Recupere seu acesso'
  return <main className="account-action-page"><section className="account-action-card"><Link to="/" className="public-brand"><span className="brand-mark"><HeartPulse size={18}/></span><span>brothers care</span></Link><div className="account-action-icon">{isConfirmation ? <KeyRound/> : <Mail/>}</div><h1>{title}</h1><p>{isConfirmation ? 'Escolha uma nova senha para sua conta.' : 'Informe seu e-mail e enviaremos as instruções.'}</p><form className="login-form" onSubmit={submit}>{!isConfirmation ? <div className="field"><label htmlFor="recovery-email">E-mail</label><input id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required/></div> : <><div className="field"><label>Nova senha</label><input type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required/></div><div className="field"><label>Confirme a senha</label><input type="password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required/></div></>}{error && <div className="login-error">{error}</div>}{success && <div className="account-action-success"><CheckCircle2/>{success}</div>}<button className="button button-dark" disabled={loading}>{loading ? 'Aguarde…' : isConfirmation ? 'Redefinir senha' : 'Enviar instruções'}</button></form><Link to="/login" className="account-action-back">Voltar para entrar</Link></section></main>
}
