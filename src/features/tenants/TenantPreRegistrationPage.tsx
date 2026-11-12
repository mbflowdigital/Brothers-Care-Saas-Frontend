import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  cancelPreRegistration,
  createPreRegistration,
  deletePreRegistration,
  getPreRegistrationOnboardingLink,
  listTenants,
  resendPreRegistration,
  updatePreRegistration,
  type TenantListItem,
  type TenantPreRegistrationInput,
} from '../identity/accountActionApi'
import { PreRegistrationActionMenu, type PreRegistrationAction } from './components/PreRegistrationActionMenu'
import { CancelPreRegistrationDialog, DeletePreRegistrationDialog, OnboardingPreparationOverlay, PreRegistrationSuccessDialog } from './components/PreRegistrationDialogs'
import { PreRegistrationFormModal } from './components/PreRegistrationFormModal'

const emptyForm: TenantPreRegistrationInput = {
  companyName: '',
  cnpj: '',
  responsibleName: '',
  responsibleEmail: '',
}

const formatCnpj = (value: string) =>
  value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')

const isValidCnpj = (value: string) => {
  const digits = value.replace(/\D/g, '')

  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) {
    return false
  }

  const calculateDigit = (base: string, weights: number[]) => {
    const remainder = base.split('').reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0) % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const firstDigit = calculateDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const secondDigit = calculateDigit(`${digits.slice(0, 12)}${firstDigit}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])

  return digits.endsWith(`${firstDigit}${secondDigit}`)
}

export function TenantPreRegistrationPage() {
  const [items, setItems] = useState<TenantListItem[]>([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<TenantPreRegistrationInput>(emptyForm)
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [pendingCount, setPendingCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyActionId, setBusyActionId] = useState<string | null>(null)
  const [busyActionKind, setBusyActionKind] = useState<PreRegistrationAction | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [onboardingUrl, setOnboardingUrl] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [cancelCandidate, setCancelCandidate] = useState<TenantListItem | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<TenantListItem | null>(null)
  const [creationSuccess, setCreationSuccess] = useState<{ clinicName: string; onboardingUrl: string } | null>(null)

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    setError('')

    try {
      const result = await listTenants(query, page, 10)
      setItems(result.items)
      setPage(result.page)
      setTotalItems(result.totalItems)
      setTotalPages(result.totalPages)
      setPendingCount(result.pendingCount)
      setActiveCount(result.activeCount)
      return true
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os pré-cadastros.')
      return false
    } finally {
      setLoading(false)
    }
  }, [page, query])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 250)

    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (!openMenuId) return
    const closeMenu = (event: PointerEvent) => {
      if (!(event.target as Element).closest('.pre-registration-actions, .table-action-menu-portal')) setOpenMenuId(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenuId(null)
    }
    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openMenuId])

  function beginCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setMessage('')
    setOpen(true)
  }

  function beginEdit(item: TenantListItem) {
    setEditingId(item.id)
    setForm({
      companyName: item.name,
      cnpj: formatCnpj(item.cnpj ?? ''),
      responsibleName: item.responsibleName ?? '',
      responsibleEmail: item.responsibleEmail ?? '',
    })
    setError('')
    setMessage('')
    setOpen(true)
    setOpenMenuId(null)
  }

  function toggleActionMenu(itemId: string) {
    if (openMenuId === itemId) {
      setOpenMenuId(null)
      return
    }

    setOpenMenuId(itemId)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!isValidCnpj(form.cnpj)) {
      setError('Informe um CNPJ válido para continuar.')
      return
    }

    setSaving(true)
    setOnboardingUrl('')

    try {
      if (editingId) {
        await updatePreRegistration(editingId, form)
      } else {
        const created = await createPreRegistration(form)
        const createdUrl = created.onboardingUrl ?? ''
        const createdItem: TenantListItem = {
          id: created.tenantId,
          name: form.companyName.trim(),
          cnpj: form.cnpj.replace(/\D/g, ''),
          status: 'PendingOnboarding',
          firstAdministratorStatus: 'Invited',
          responsibleName: form.responsibleName.trim(),
          responsibleEmail: form.responsibleEmail.trim(),
        }
        setOnboardingUrl(createdUrl)
        setQuery('')
        setPage(1)
        setItems((current) => [createdItem, ...current.filter((item) => item.id !== createdItem.id)].slice(0, 10))
        setTotalItems((current) => current + 1)
        setTotalPages((current) => Math.max(current, Math.ceil((totalItems + 1) / 10)))
        setPendingCount((current) => current + 1)
        setOpen(false)
        setCreationSuccess({ clinicName: createdItem.name, onboardingUrl: createdUrl })
        return
      }

      setOpen(false)
      const savedMessage = 'Pré-cadastro atualizado.'
      const refreshed = await load()
      setMessage(refreshed ? savedMessage : `${savedMessage} A lista não atualizou; use Atualizar para conferir.`)
      if (!refreshed) setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o pré-cadastro.')
    } finally {
      setSaving(false)
    }
  }

  async function cancel(item: TenantListItem) {
    setError('')
    setMessage('')
    setBusyActionId(item.id)
    setBusyActionKind('cancel')

    try {
      await cancelPreRegistration(item.id)
      setOpenMenuId(null)
      setCancelCandidate(null)
      const refreshed = await load()
      setMessage(refreshed ? 'Pré-cadastro cancelado.' : 'Pré-cadastro cancelado. A lista não atualizou; use Atualizar para conferir.')
      if (!refreshed) setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível cancelar.')
    } finally {
      setBusyActionId(null)
      setBusyActionKind(null)
    }
  }

  async function permanentlyDelete(item: TenantListItem) {
    setError('')
    setMessage('')
    setBusyActionId(item.id)
    setBusyActionKind('delete')
    try {
      await deletePreRegistration(item.id)
      setOpenMenuId(null)
      setDeleteCandidate(null)
      const refreshed = await load()
      setMessage(refreshed ? `Pré-cadastro de ${item.name} excluído permanentemente.` : 'Pré-cadastro excluído. Use Atualizar para conferir a lista.')
      if (!refreshed) setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível excluir o pré-cadastro.')
    } finally {
      setBusyActionId(null)
      setBusyActionKind(null)
    }
  }

  async function resend(item: TenantListItem) {
    setError('')
    setMessage('')
    setBusyActionId(item.id)
    setBusyActionKind('resend')

    try {
      const result = await resendPreRegistration(item.id)
      const url = result.onboardingUrl ?? ''
      setOpenMenuId(null)
      setMessage(url
        ? `Novo convite enviado para ${item.responsibleEmail}. O link também está disponível para copiar.`
        : `Novo convite enviado para ${item.responsibleEmail}.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível reenviar.')
    } finally {
      setBusyActionId(null)
      setBusyActionKind(null)
    }
  }

  async function copyLink(item: TenantListItem) {
    setError('')
    setMessage('')
    setBusyActionId(item.id)
    setBusyActionKind('copy')

    try {
      const result = await getPreRegistrationOnboardingLink(item.id)
      const url = result.onboardingUrl
      if (!url) {
        setError('O convite foi enviado, mas a URL não está configurada neste ambiente.')
        return
      }

      await navigator.clipboard.writeText(url)
      setCopiedId(item.id)
      setOpenMenuId(null)
      setMessage(`Link copiado para ${item.name}.`)
      window.setTimeout(() => setCopiedId((current) => (current === item.id ? null : current)), 1600)
    } catch (caught) {
      setError(caught instanceof Error
        ? caught.message
        : 'Não foi possível copiar o link automaticamente. Tente novamente.')
    } finally {
      setBusyActionId(null)
      setBusyActionKind(null)
    }
  }

  async function openOnboarding(item: TenantListItem) {
    setError('')
    setMessage('')
    setBusyActionId(item.id)
    setBusyActionKind('open')

    try {
      const result = await getPreRegistrationOnboardingLink(item.id)
      const url = result.onboardingUrl

      if (!url) {
        setError('O convite foi enviado, mas a URL não está configurada neste ambiente.')
        return
      }

      window.location.assign(url)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível abrir o onboarding.')
    } finally {
      setBusyActionId(null)
      setBusyActionKind(null)
    }
  }

  function performAction(item: TenantListItem, action: PreRegistrationAction) {
    setOpenMenuId(null)
    if (action === 'open') void openOnboarding(item)
    else if (action === 'copy') void copyLink(item)
    else if (action === 'resend') void resend(item)
    else if (action === 'cancel') setCancelCandidate(item)
    else setDeleteCandidate(item)
  }

  return (
    <>
      <div className="pre-registration-summary">
        <article>
          <span>
            <Building2 />
          </span>
          <div>
            <small>Pré-cadastros pendentes</small>
            <strong>{pendingCount}</strong>
          </div>
        </article>

        <article>
          <span>
            <Mail />
          </span>
          <div>
            <small>Clínicas ativadas</small>
            <strong>{activeCount}</strong>
          </div>
        </article>

        <button className="button button-primary" onClick={beginCreate} type="button">
          <Plus />
          Novo pré-cadastro
        </button>
      </div>

      {(message || (error && !open)) && (
        <div className={`pre-registration-feedback ${error && !message ? 'is-error' : 'is-success'}`} role={error && !message ? 'alert' : 'status'}>
          {error && !message ? <CircleAlert /> : <CircleCheck />}
          <p>{error && !message ? error : message}</p>
          {onboardingUrl && !error && (
            <a className="button button-primary" href={onboardingUrl}>
              Abrir onboarding <ArrowRight />
            </a>
          )}
          <button
            onClick={() => {
              setMessage('')
              setError('')
              setOnboardingUrl('')
            }}
            aria-label="Fechar aviso"
            type="button"
          >
            <X />
          </button>
        </div>
      )}

      <section className="card table-card">
        <div className="table-toolbar">
          <label className="searchbox">
            <Search />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Filtrar pelo nome da clínica..."
              aria-label="Filtrar pelo nome da clínica"
            />
          </label>

          <span className="pre-registration-caption">
            {totalItems} {totalItems === 1 ? 'registro' : 'registros'}
          </span>
          {loading && items.length > 0 && <span className="pre-registration-action-progress" role="status"><LoaderCircle className="spin" />Atualizando lista...</span>}
          {busyActionId && <span className="pre-registration-action-progress" role="status"><LoaderCircle className="spin" />{busyActionKind === 'copy' ? 'Gerando e copiando link...' : busyActionKind === 'open' ? 'Preparando onboarding...' : busyActionKind === 'resend' ? 'Enviando convite...' : busyActionKind === 'delete' ? 'Excluindo pré-cadastro...' : 'Cancelando pré-cadastro...'}</span>}
          <button className="pre-registration-refresh" type="button" onClick={() => void load()} disabled={loading} aria-busy={loading}>
            {loading ? <LoaderCircle className="spin" /> : <RefreshCw />}
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Clínica</th>
                <th>Responsável</th>
                <th>Jornada de ativação</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const isPending = item.status === 'PendingOnboarding'

                return (
                  <tr key={item.id} className={isPending ? 'row--pending' : ''} aria-busy={busyActionId === item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <small className="table-secondary">{formatCnpj(item.cnpj ?? '') || 'CNPJ não informado'}</small>
                    </td>

                    <td>
                      {item.responsibleName}
                      <small className="table-secondary">{item.responsibleEmail}</small>
                    </td>

                    <td>
                      <div className={`activation-journey ${isPending ? 'is-pending' : item.status === 'Active' ? 'is-complete' : 'is-cancelled'}`}>
                        <span className="activation-journey-dot" />
                        <div><strong>{isPending ? 'Aguardando onboarding' : item.status === 'Active' ? 'Clínica ativada' : 'Pré-cadastro cancelado'}</strong><small>{isPending ? 'Convite enviado · responsável ainda não concluiu' : item.status === 'Active' ? 'Administrador confirmou o primeiro acesso' : 'O convite não está mais disponível'}</small></div>
                      </div>
                    </td>

                    <td className="pre-registration-actions-cell">
                      {isPending ? (
                        <div className="pre-registration-actions">
                          <button className="table-primary-action" type="button" onClick={() => void openOnboarding(item)} disabled={busyActionId === item.id}>
                            {busyActionId === item.id && busyActionKind === 'open' ? <LoaderCircle className="spin" /> : <ArrowUpRight />}
                            Abrir onboarding
                          </button>
                          <PreRegistrationActionMenu
                            item={item}
                            open={openMenuId === item.id}
                            busyAction={busyActionId === item.id ? busyActionKind : null}
                            copied={copiedId === item.id}
                            onToggle={() => toggleActionMenu(item.id)}
                            onEdit={() => beginEdit(item)}
                            onAction={(action) => performAction(item, action)}
                          />
                        </div>
                      ) : item.status !== 'Active' ? (
                        <button className="table-delete-action" type="button" onClick={() => setDeleteCandidate(item)}><Trash2 />Excluir</button>
                      ) : <span className="pre-registration-no-actions" aria-label="Sem ações disponíveis">—</span>}
                    </td>
                  </tr>
                )
              })}
              {loading && items.length === 0 && Array.from({ length: 5 }, (_, index) => (
                <tr className="table-skeleton-row" key={`skeleton-${index}`} aria-hidden="true">
                  <td><span className="skeleton-line primary" /><span className="skeleton-line secondary" /></td>
                  <td><span className="skeleton-line primary" /><span className="skeleton-line secondary" /></td>
                  <td><span className="skeleton-pill" /></td>
                  <td><span className="skeleton-action" /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && items.length === 0 && (
            <div className="empty-state">
              <Building2 />
              <h3>{query ? 'Nenhuma clínica encontrada' : 'Nenhum pré-cadastro encontrado'}</h3>
              <p>{query ? 'Tente buscar por outro nome.' : 'Cadastre a primeira clínica para iniciar o onboarding.'}</p>
              {!query && (
                <button className="button button-primary" onClick={beginCreate} type="button">
                  <Plus />
                  Cadastrar clínica
                </button>
              )}
            </div>
          )}

        </div>

        <div className="table-footer">
          <span>Página {page} de {totalPages || 1}</span>
          <div className="pagination">
            <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} aria-label="Voltar página" type="button">
              <ChevronLeft />
            </button>
            <button className="active" type="button">{page}</button>
            <button onClick={() => setPage((current) => Math.min(totalPages || current, current + 1))} disabled={page >= totalPages || totalPages === 0} aria-label="Próxima página" type="button">
              <ChevronRight />
            </button>
          </div>
        </div>
      </section>

      {open && <PreRegistrationFormModal
        editing={editingId !== null}
        form={form}
        saving={saving}
        error={error}
        onChange={setForm}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      />}
      {cancelCandidate && <CancelPreRegistrationDialog
        item={cancelCandidate}
        busy={busyActionId === cancelCandidate.id && busyActionKind === 'cancel'}
        onCancel={() => setCancelCandidate(null)}
        onConfirm={() => void cancel(cancelCandidate)}
      />}
      {deleteCandidate && <DeletePreRegistrationDialog
        item={deleteCandidate}
        busy={busyActionId === deleteCandidate.id && busyActionKind === 'delete'}
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={() => void permanentlyDelete(deleteCandidate)}
      />}
      {creationSuccess && <PreRegistrationSuccessDialog
        clinicName={creationSuccess.clinicName}
        onboardingUrl={creationSuccess.onboardingUrl}
        onClose={() => {
          setCreationSuccess(null)
          setMessage('Pré-cadastro criado e convite preparado com sucesso.')
        }}
      />}
      {busyActionId && busyActionKind === 'open' && <OnboardingPreparationOverlay
        clinicName={items.find((item) => item.id === busyActionId)?.name ?? 'a clínica'}
      />}
    </>
  )
}
