import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Building2, Edit3, Plus, Search, ShieldCheck, Stethoscope, UserRound, UserX } from 'lucide-react'
import { Modal } from '../../ExtraViews'
import {
  deactivateTeamMember,
  inviteTeamMember,
  listClinicUnits,
  listTeam,
  updateTeamMember,
  type ClinicUnit,
  type InviteTeamMember,
  type TeamMember,
} from '../team/teamApi'

type Props = { query: string; setQuery: (value: string) => void }

const emptyForm: InviteTeamMember = {
  displayName: '',
  email: '',
  role: 'Professional',
  clinicUnitIds: [],
  performsCare: true,
  specialty: '',
  councilType: '',
  registrationNumber: '',
  councilState: '',
}

function formFromMember(member: TeamMember): InviteTeamMember {
  return {
    displayName: member.displayName,
    email: member.email,
    role: member.role,
    clinicUnitIds: member.units.map((unit) => unit.id),
    performsCare: true,
    specialty: member.specialty ?? '',
    councilType: member.councilType ?? '',
    registrationNumber: member.registrationNumber ?? '',
    councilState: member.councilState ?? '',
    defaultAppointmentDurationMinutes: member.defaultAppointmentDurationMinutes,
  }
}

export function ProfessionalsManagementPage({ query, setQuery }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [units, setUnits] = useState<ClinicUnit[]>([])
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [form, setForm] = useState<InviteTeamMember>(emptyForm)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [team, clinicUnits] = await Promise.all([listTeam(), listClinicUnits()])
      setMembers(team.filter((member) => member.performsCare || member.role === 'Professional'))
      setUnits(clinicUnits)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os profissionais.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const create = () => beginCreate()
    window.addEventListener('professionals:create', create)
    return () => window.removeEventListener('professionals:create', create)
  })

  const filtered = useMemo(() => members.filter((member) =>
    `${member.displayName} ${member.email} ${member.specialty ?? ''}`
      .toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [members, query])
  const active = members.filter((member) => member.status === 'Active').length
  const invited = members.filter((member) => member.status === 'Invited').length
  const linkedUnits = new Set(members.flatMap((member) => member.units.map((unit) => unit.id))).size

  function beginCreate(member?: TeamMember) {
    setEditing(null)
    setForm(member ? formFromMember(member) : {
      ...emptyForm,
      clinicUnitIds: units.length === 1 ? [units[0].id] : [],
    })
    setError('')
    setOpen(true)
  }

  function beginEdit(member: TeamMember) {
    setEditing(member)
    setForm(formFromMember(member))
    setError('')
    setOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.clinicUnitIds.length) return setError('Selecione ao menos uma unidade ativa.')
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updateTeamMember(editing.membershipId, form)
        setMessage(`${editing.displayName} foi atualizado.`)
      } else {
        await inviteTeamMember(form)
        setMessage(`Convite enviado para ${form.email}.`)
      }
      setOpen(false)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o profissional.')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(member: TeamMember) {
    if (!window.confirm(`Desativar ${member.displayName}? O histórico será preservado.`)) return
    setError('')
    try {
      await deactivateTeamMember(member.membershipId)
      setMessage(`${member.displayName} foi desativado. O histórico foi preservado.`)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível desativar o profissional.')
    }
  }

  const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2)
    .map((part) => part[0]).join('').toUpperCase()
  const statusLabel = (status: TeamMember['status']) =>
    status === 'Active' ? 'Ativo' : status === 'Invited' ? 'Convite enviado' : 'Desativado'

  return <>
    <div className="grid kpi-grid" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
      <Metric label="Profissionais ativos" value={String(active)} note="Equipe assistencial" icon={Stethoscope} />
      <Metric label="Convites pendentes" value={String(invited)} note="Aguardando primeiro acesso" icon={UserRound} />
      <Metric label="Unidades atendidas" value={String(linkedUnits)} note="Com profissionais vinculados" icon={Building2} />
    </div>
    {message && <div className="account-action-success" role="status">{message}</div>}
    {error && !open && <p className="form-error" role="alert">{error}</p>}
    <section className="card table-card">
      <div className="table-toolbar">
        <label className="searchbox"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por profissional ou especialidade..." /></label>
      </div>
      <div className="table-wrap"><table className="professionals-table"><thead><tr><th>Profissional</th><th>Especialidade</th><th>Conselho</th><th>Unidades</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        {filtered.map((member) => <tr key={member.membershipId}>
          <td><span className="person-cell"><span className="avatar small">{initials(member.displayName)}</span><span><strong>{member.displayName}</strong><small>{member.email}</small></span></span></td>
          <td>{member.specialty || 'Não informada'}</td>
          <td>{member.councilType || member.registrationNumber ? [member.councilType, member.registrationNumber, member.councilState].filter(Boolean).join(' · ') : 'Não informado'}</td>
          <td>{member.units.map((unit) => unit.name).join(', ') || 'Nenhuma unidade'}</td>
          <td><span className={`status status-${member.status === 'Active' ? 'ativo' : member.status === 'Invited' ? 'atenção' : 'inativo'}`}>{statusLabel(member.status)}</span></td>
          <td><div className="row-actions">
            {(member.status === 'Active' || member.status === 'Invited') && <button onClick={() => beginEdit(member)} title="Editar profissional"><Edit3 /></button>}
            {member.status === 'Revoked' && <button onClick={() => beginCreate(member)} title="Reativar por convite"><Plus /></button>}
            {member.status !== 'Revoked' && !member.isCurrentUser && <button className="danger" onClick={() => void deactivate(member)} title="Desativar profissional"><UserX /></button>}
          </div></td>
        </tr>)}
      </tbody></table>
        {loading && <div className="empty-state"><p>Carregando profissionais...</p></div>}
        {!loading && filtered.length === 0 && <div className="empty-state"><Stethoscope /><h3>{query ? 'Nenhum profissional encontrado' : 'Nenhum profissional cadastrado'}</h3><p>{query ? 'Tente buscar por outro termo.' : 'Envie o primeiro convite para montar a equipe assistencial.'}</p></div>}
      </div>
      <div className="table-footer"><span>{filtered.length} de {members.length} profissionais</span></div>
    </section>
    {open && <Modal title={editing ? 'Editar profissional' : 'Novo profissional'} onClose={() => setOpen(false)}>
      <ProfessionalEditor editing={editing} form={form} setForm={setForm} units={units} saving={saving} error={error} onSubmit={submit} />
    </Modal>}
  </>
}

function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Stethoscope }) {
  return <article className="card kpi-card"><div className="kpi-top"><span>{label}</span><span className="kpi-icon"><Icon /></span></div><div className="kpi-value">{value}</div><div className="kpi-note">{note}</div></article>
}

function ProfessionalEditor({ editing, form, setForm, units, saving, error, onSubmit }: {
  editing: TeamMember | null
  form: InviteTeamMember
  setForm: (form: InviteTeamMember) => void
  units: ClinicUnit[]
  saving: boolean
  error: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return <form className="record-form" onSubmit={onSubmit}>
    <div className="form-intro"><span className="form-step">01</span><div><strong>Perfil profissional</strong><small>{editing ? 'Atualize a atuação e as unidades.' : 'O profissional receberá um convite por e-mail.'}</small></div></div>
    <div className="form-grid">
      <div className="field"><label htmlFor="professional-name">Nome completo <b>*</b></label><input id="professional-name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} disabled={Boolean(editing)} required maxLength={200} autoFocus /></div>
      <div className="field"><label htmlFor="professional-email">E-mail <b>*</b></label><input id="professional-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} disabled={Boolean(editing)} required maxLength={320} /></div>
      <div className="field"><label htmlFor="professional-specialty">Especialidade <small>(opcional)</small></label><input id="professional-specialty" value={form.specialty} onChange={(event) => setForm({ ...form, specialty: event.target.value })} placeholder="Ex.: Fisioterapia" maxLength={150} /></div>
      <div className="field"><label htmlFor="professional-council">Conselho <small>(opcional)</small></label><input id="professional-council" value={form.councilType} onChange={(event) => setForm({ ...form, councilType: event.target.value.toUpperCase() })} placeholder="Ex.: CREFITO" maxLength={30} /></div>
      <div className="field"><label htmlFor="professional-registration">Número do registro <small>(opcional)</small></label><input id="professional-registration" value={form.registrationNumber} onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })} maxLength={100} /></div>
      <div className="field"><label htmlFor="professional-council-state">UF do registro <small>(opcional)</small></label><input id="professional-council-state" value={form.councilState} onChange={(event) => setForm({ ...form, councilState: event.target.value.toUpperCase().slice(0, 2) })} placeholder="Ex.: SP" maxLength={2} /></div>
      <div className="field"><label htmlFor="professional-duration">Duração padrão <small>(opcional)</small></label><select id="professional-duration" value={form.defaultAppointmentDurationMinutes ?? ''} onChange={(event) => setForm({ ...form, defaultAppointmentDurationMinutes: event.target.value ? Number(event.target.value) : undefined })}><option value="">Definir depois</option><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">60 minutos</option><option value="90">90 minutos</option></select></div>
      <fieldset className="unit-picker full"><legend>Unidades de atuação</legend>{units.map((unit) => <label key={unit.id}><input type="checkbox" checked={form.clinicUnitIds.includes(unit.id)} onChange={(event) => setForm({ ...form, clinicUnitIds: event.target.checked ? [...form.clinicUnitIds, unit.id] : form.clinicUnitIds.filter((id) => id !== unit.id) })} /><span><Building2 />{unit.name}</span></label>)}</fieldset>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-footer"><span><ShieldCheck size={14} />Histórico preservado por tenant</span><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Enviar convite'}</button></div>
  </form>
}
