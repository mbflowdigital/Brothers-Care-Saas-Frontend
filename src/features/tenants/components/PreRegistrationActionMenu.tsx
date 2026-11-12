import {
  Ban,
  CircleCheck,
  Copy,
  Link2,
  LoaderCircle,
  MoreHorizontal,
  PencilLine,
  Trash2,
} from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TenantListItem } from '../../identity/accountActionApi'

export type PreRegistrationAction = 'open' | 'copy' | 'resend' | 'cancel' | 'delete'

type Props = {
  item: TenantListItem
  open: boolean
  busyAction: PreRegistrationAction | null
  copied: boolean
  onToggle: () => void
  onEdit: () => void
  onAction: (action: PreRegistrationAction) => void
}

export function PreRegistrationActionMenu({
  item,
  open,
  busyAction,
  copied,
  onToggle,
  onEdit,
  onAction,
}: Props) {
  const busy = busyAction !== null
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const placeMenu = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      const width = 248
      const estimatedHeight = 244
      const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.right - width))
      const top = window.innerHeight - rect.bottom >= estimatedHeight
        ? rect.bottom + 8
        : Math.max(12, rect.top - estimatedHeight - 8)
      setPosition({ top, left })
    }
    placeMenu()
    window.addEventListener('resize', placeMenu)
    return () => window.removeEventListener('resize', placeMenu)
  }, [open])

  return <div className="pre-registration-secondary-actions">
    <button
      ref={triggerRef}
      className="icon-button pre-registration-menu-trigger"
      aria-label={`Ações de ${item.name}`}
      aria-haspopup="menu"
      aria-expanded={open}
      type="button"
      disabled={busy}
      onClick={onToggle}
    >
      {busy ? <LoaderCircle className="spin" /> : <MoreHorizontal />}
    </button>

    {open && createPortal(<div className="table-action-menu table-action-menu-portal" style={position} role="menu" aria-label={`Ações de ${item.name}`}>
      <div className="table-action-menu-head"><span>Ações do pré-cadastro</span><strong>{item.name}</strong></div>
      <ActionButton action="copy" activeAction={busyAction} icon={copied ? <CircleCheck /> : <Copy />} onAction={onAction}>
        {copied ? 'Link copiado' : 'Copiar link de onboarding'}
      </ActionButton>
      <button type="button" role="menuitem" onClick={onEdit} disabled={busy}>
        <PencilLine />Editar
      </button>
      <ActionButton action="resend" activeAction={busyAction} icon={<Link2 />} onAction={onAction}>
        Reenviar convite
      </ActionButton>
      <ActionButton action="cancel" activeAction={busyAction} icon={<Ban />} onAction={onAction}>
        Cancelar convite
      </ActionButton>
      <div className="table-action-menu-divider" />
      <ActionButton action="delete" activeAction={busyAction} icon={<Trash2 />} onAction={onAction} danger>
        Excluir permanentemente
      </ActionButton>
    </div>, document.body)}
  </div>
}

function ActionButton({
  action,
  activeAction,
  icon,
  children,
  onAction,
  danger = false,
}: {
  action: PreRegistrationAction
  activeAction: PreRegistrationAction | null
  icon: React.ReactNode
  children: React.ReactNode
  onAction: (action: PreRegistrationAction) => void
  danger?: boolean
}) {
  const active = activeAction === action
  return <button className={danger ? 'danger' : undefined} type="button" role="menuitem" onClick={() => onAction(action)} disabled={activeAction !== null}>
    {active ? <LoaderCircle className="spin" /> : icon}
    {active ? actionLabel[action] : children}
  </button>
}

const actionLabel: Record<PreRegistrationAction, string> = {
  open: 'Preparando onboarding...',
  copy: 'Buscando link...',
  resend: 'Enviando convite...',
  cancel: 'Cancelando...',
  delete: 'Excluindo...',
}
