import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, HeartPulse, KeyRound, Mail } from 'lucide-react'
import { activateAccount, confirmPasswordRecovery, requestPasswordRecovery } from './accountActionApi'
import './accountAction.css'

type Mode = 'activation' | 'recovery'

export function AccountActionPage({ mode }: { mode: Mode }) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const isConfirmation = mode === 'activation' || token.length > 0
  const title = mode === 'activation' ? 'Ative sua conta' : isConfirmation ? 'Redefina sua senha' : 'Recupere seu acesso'
  const description = mode === 'activation'
    ? 'Defina uma senha para concluir o acesso ao Brothers Care.'
    : isConfirmation ? 'Escolha uma nova senha para sua conta.' : 'Informe seu e-mail e, se sua conta estiver apta, enviaremos as instruções.'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (isConfirmation && password !== confirmation) {
      setError('As senhas informadas não coincidem.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'activation') {
        await activateAccount(token, password, confirmation)
        setSuccess('Conta ativada com sucesso. Agora você pode entrar na plataforma.')
      } else if (isConfirmation) {
        await confirmPasswordRecovery(token, password, confirmation)
        setSuccess('Senha redefinida com sucesso. Agora você pode entrar na plataforma.')
      } else {
        await requestPasswordRecovery(email)
        setSuccess('Se a conta estiver apta, você receberá as instruções para redefinir a senha.')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível concluir sua solicitação.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="account-action-page"><section className="account-action-card" aria-labelledby="account-action-title">
    <Link to="/" className="public-brand"><span className="brand-mark"><HeartPulse size={18} strokeWidth={2.5} /></span><span>brothers care</span></Link>
    <div className="account-action-icon">{isConfirmation ? <KeyRound /> : <Mail />}</div>
    <h1 id="account-action-title">{title}</h1><p>{description}</p>
    {!isConfirmation && success === '' && <form className="login-form" onSubmit={submit}><div className="field"><label htmlFor="recovery-email">E-mail</label><input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><button className="button button-dark" type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Enviar instruções'}</button></form>}
    {isConfirmation && success === '' && <form className="login-form" onSubmit={submit}>
      {!token && <div className="login-error">Este link não contém um token válido. Solicite um novo link.</div>}
      <div className="field"><label htmlFor="new-password">Nova senha</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
      <div className="field"><label htmlFor="password-confirmation">Confirme a nova senha</label><input id="password-confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
      <small className="account-action-hint">Use ao menos 12 caracteres, incluindo letras e números.</small><button className="button button-dark" type="submit" disabled={loading || !token}>{loading ? 'Salvando…' : mode === 'activation' ? 'Ativar conta' : 'Redefinir senha'}</button>
    </form>}
    {error && <div className="login-error" role="alert">{error}</div>}
    {success && <div className="account-action-success" role="status"><CheckCircle2 />{success}</div>}
    <Link to="/login" className="account-action-back">Voltar para entrar</Link>
  </section></main>
}
