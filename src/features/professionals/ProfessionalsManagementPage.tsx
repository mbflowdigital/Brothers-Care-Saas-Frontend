import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Building2, Edit3, Plus, Search, Stethoscope, UserRound, UserX } from 'lucide-react'
import { InvitationResultModal, TeamMemberModal } from '../team/TeamPage'
import {
  deactivateTeamMember,
  inviteTeamMember,
  listClinicUnits,
  listTeam,
  updateTeamMember,
  type ClinicUnit,
  type InvitationResult,
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
  const [invitation, setInvitation] = useState<{ email: string; result: InvitationResult } | null>(null)

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
        const result = await inviteTeamMember(form)
        setInvitation({ email: form.email, result })
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
          <td data-label="Profissional"><span className="person-cell"><span className="avatar small">{initials(member.displayName)}</span><span><strong>{member.displayName}</strong><small>{member.email}</small></span></span></td>
          <td data-label="Especialidade">{member.specialty || 'Não informada'}</td>
          <td data-label="Conselho">{member.councilType || member.registrationNumber ? [member.councilType, member.registrationNumber, member.councilState].filter(Boolean).join(' · ') : 'Não informado'}</td>
          <td data-label="Unidades">{member.units.map((unit) => unit.name).join(', ') || 'Nenhuma unidade'}</td>
          <td data-label="Status"><span className={`status status-${member.status === 'Active' ? 'ativo' : member.status === 'Invited' ? 'atenção' : 'inativo'}`}>{statusLabel(member.status)}</span></td>
          <td data-label="Ações"><div className="row-actions">
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
    {open && <TeamMemberModal editing={editing} form={form} setForm={setForm} units={units} saving={saving} error={error} onClose={() => setOpen(false)} onSubmit={submit} professionalOnly />}
    {invitation && <InvitationResultModal email={invitation.email} result={invitation.result} onClose={() => setInvitation(null)} />}
  </>
}

function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Stethoscope }) {
  return <article className="card kpi-card"><div className="kpi-top"><span>{label}</span><span className="kpi-icon"><Icon /></span></div><div className="kpi-value">{value}</div><div className="kpi-note">{note}</div></article>
}
