import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, ChevronDown, KeyRound, LoaderCircle, LogOut, ShieldCheck, X } from 'lucide-react'
import { changeCurrentPassword } from './accountActionApi'

type Props = {
  name: string
  email: string
  role: string
  onLogout: () => void
  onPasswordChanged: () => void
}

export function AccountMenu({ name, email, role, onLogout, onPasswordChanged }: Props) {
  const [open, setOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const initials = name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const passwordValid = newPassword.length >= 12 && /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!passwordValid || newPassword !== confirmation) {
      setError('Confira os requisitos e confirme a mesma senha.')
      return
    }
    setSaving(true)
    try {
      await changeCurrentPassword(currentPassword, newPassword, confirmation)
      setPasswordOpen(false)
      onPasswordChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível alterar a senha.')
    } finally {
      setSaving(false)
    }
  }

  return <>
    <div className="account-menu-root" ref={root}>
      <button className="account-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="avatar small">{initials}</span>
        <span className="user-meta"><strong>{name}</strong><small>{role}</small></span>
        <ChevronDown className={open ? 'is-open' : ''} />
      </button>
      {open && <div className="account-popover">
        <div className="account-popover-head"><span className="avatar">{initials}</span><div><strong>{name}</strong><small>{email}</small></div></div>
        <div className="account-security-note"><ShieldCheck /><span>Sessão protegida</span></div>
        <button type="button" onClick={() => { setOpen(false); setPasswordOpen(true) }}><KeyRound /><span><strong>Alterar senha</strong><small>Atualize sua credencial de acesso</small></span></button>
        <button className="danger" type="button" onClick={() => { setOpen(false); setLogoutOpen(true) }}><LogOut /><span><strong>Sair da conta</strong><small>Encerrar esta sessão com segurança</small></span></button>
      </div>}
    </div>

    {passwordOpen && <div className="modal-backdrop" role="presentation"><form className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="change-password-title" onSubmit={submit}>
      <div className="account-dialog-head"><span><KeyRound /></span><div><small>SEGURANÇA DA CONTA</small><h2 id="change-password-title">Alterar sua senha</h2><p>Ao salvar, todas as sessões serão encerradas.</p></div><button type="button" onClick={() => setPasswordOpen(false)} aria-label="Fechar"><X /></button></div>
      <div className="account-dialog-fields">
        <label>Senha atual<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoFocus /></label>
        <label>Nova senha<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
        <label>Confirmar nova senha<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
      </div>
      <div className="password-requirements"><span className={newPassword.length >= 12 ? 'ok' : ''}>{newPassword.length >= 12 ? <Check /> : <i />}12 caracteres</span><span className={/[A-Za-z]/.test(newPassword) ? 'ok' : ''}>{/[A-Za-z]/.test(newPassword) ? <Check /> : <i />}Uma letra</span><span className={/\d/.test(newPassword) ? 'ok' : ''}>{/\d/.test(newPassword) ? <Check /> : <i />}Um número</span></div>
      {error && <div className="account-dialog-error" role="alert">{error}</div>}
      <div className="account-dialog-actions"><button className="button button-outline" type="button" onClick={() => setPasswordOpen(false)}>Cancelar</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? <><LoaderCircle className="spin" />Salvando…</> : 'Salvar nova senha'}</button></div>
    </form></div>}

    {logoutOpen && <div className="modal-backdrop" role="presentation"><section className="account-dialog logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title"><span className="logout-dialog-icon"><LogOut /></span><h2 id="logout-title">Deseja sair da conta?</h2><p>Sua sessão será encerrada com segurança neste dispositivo.</p><div className="account-dialog-actions"><button className="button button-outline" type="button" onClick={() => setLogoutOpen(false)}>Continuar conectado</button><button className="button button-danger" type="button" onClick={onLogout}>Sair da conta</button></div></section></div>}
  </>
}
