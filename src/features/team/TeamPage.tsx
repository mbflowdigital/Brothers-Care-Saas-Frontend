import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, BriefcaseMedical, Building2, Check, Edit3, MoreHorizontal, Plus, RotateCw, Search, ShieldCheck, Sparkles, UserRound, UserX, Users, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { deactivateTeamMember, inviteTeamMember, listClinicUnits, listTeam, updateTeamMember, type ClinicUnit, type InviteTeamMember, type TeamMember, type TeamRole } from './teamApi'

const roleCopy: Record<TeamRole, { label: string; description: string }> = {
  ClinicAdministrator: { label: 'Administrador', description: 'Configura a clínica e gerencia a equipe.' },
  Professional: { label: 'Profissional', description: 'Atende pacientes e acessa sua rotina clínica.' },
  Receptionist: { label: 'Recepção', description: 'Organiza agenda, pacientes e recepção.' },
}
const statusCopy = { Active: 'Ativo', Invited: 'Convite enviado', Suspended: 'Suspenso', Revoked: 'Desativado' }
const empty: InviteTeamMember = { displayName: '', email: '', role: 'Professional', clinicUnitIds: [], performsCare: true, specialty: '', councilType: '', registrationNumber: '' }

function formFromMember(member: TeamMember): InviteTeamMember {
  return { displayName: member.displayName, email: member.email, role: member.role, clinicUnitIds: member.units.map((unit) => unit.id), performsCare: member.performsCare, specialty: member.specialty ?? '', councilType: member.councilType ?? '', registrationNumber: member.registrationNumber ?? '' }
}

export function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [units, setUnits] = useState<ClinicUnit[]>([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<InviteTeamMember>(empty)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const [team, clinicUnits] = await Promise.all([listTeam(), listClinicUnits()]); setMembers(team); setUnits(clinicUnits) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a equipe.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const filtered = useMemo(() => members.filter((member) => `${member.displayName} ${member.email} ${member.specialty ?? ''}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [members, query])

  function beginInvite(member?: TeamMember) { setEditing(null); setForm(member ? formFromMember(member) : { ...empty, clinicUnitIds: units.length === 1 ? [units[0].id] : [] }); setError(''); setMenu(null); setOpen(true) }
  function beginEdit(member: TeamMember) { setEditing(member); setForm(formFromMember(member)); setError(''); setMenu(null); setOpen(true) }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.clinicUnitIds.length) return setError('Escolha ao menos uma unidade.')
    if (form.performsCare && (!form.specialty.trim() || !form.councilType.trim() || !form.registrationNumber.trim())) return setError('Preencha especialidade, conselho e registro profissional.')
    setSaving(true); setError('')
    try { if (editing) { await updateTeamMember(editing.membershipId, form); setMessage(`Acesso de ${editing.displayName} atualizado.`) } else { await inviteTeamMember(form); setMessage(`Convite preparado para ${form.email}.`) } setOpen(false); await load() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar este acesso.') }
    finally { setSaving(false) }
  }
  async function resend(member: TeamMember) { setMenu(null); setError(''); try { await inviteTeamMember(formFromMember(member)); setMessage(`Novo convite preparado para ${member.email}.`); await load() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível reenviar o convite.') } }
  async function deactivate(member: TeamMember) { setMenu(null); if (!window.confirm(`Desativar o acesso de ${member.displayName}? O histórico será preservado.`)) return; setError(''); try { await deactivateTeamMember(member.membershipId); setMessage(`Acesso de ${member.displayName} desativado. O histórico foi preservado.`); await load() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível desativar este acesso.') } }

  return <div className="team-page">
    <section className="team-intro"><div><span className="team-kicker"><Sparkles /> Sua equipe, sem complicação</span><h2>Uma pessoa, um acesso, uma rotina clara</h2><p>Defina o acesso ao sistema e, separadamente, quem também realiza atendimentos.</p></div><button className="button button-primary" onClick={() => beginInvite()}><Plus />Convidar pessoa</button></section>
    <div className="team-stats"><article><span><Users /></span><div><strong>{members.filter((item) => item.status === 'Active').length}</strong><small>pessoas ativas</small></div></article><article><span><BriefcaseMedical /></span><div><strong>{members.filter((item) => item.performsCare && item.status === 'Active').length}</strong><small>realizam atendimentos</small></div></article><article className="team-tip"><ShieldCheck /><p><strong>Histórico protegido.</strong> Desativar remove novos acessos e agendamentos sem apagar o que já aconteceu.</p></article></div>
    {message && <div className="account-action-success" role="status">{message}<button onClick={() => setMessage('')} aria-label="Fechar"><X /></button></div>}{error && !open && <p className="form-error" role="alert">{error}</p>}
    <section className="card team-card"><div className="team-toolbar"><div><h2>Equipe da clínica</h2><p>Acesso, atuação profissional e unidades em um só lugar.</p></div><label className="searchbox"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, e-mail ou especialidade" /></label></div>
      <div className="team-list">{filtered.map((member) => <article className="team-member" key={member.membershipId}>
        <span className="team-avatar">{member.displayName.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><div className="team-person"><strong>{member.displayName}</strong><small>{member.email}</small></div>
        <div className="team-role"><small>Acesso</small><strong>{roleCopy[member.role].label}</strong>{member.performsCare && <span className="care-badge"><BriefcaseMedical /> Também atende</span>}</div>
        <div className="team-units"><small>{member.performsCare ? 'Atuação e unidades' : 'Unidades'}</small><span>{member.performsCare && `${member.specialty} · ${member.councilType} ${member.registrationNumber} · `}{member.units.map((unit) => unit.name).join(', ') || 'Nenhuma unidade'}</span></div>
        <span className={`status status-${member.status === 'Active' ? 'ativo' : member.status === 'Invited' ? 'atenção' : 'inativo'}`}>{statusCopy[member.status]}</span>
        <div className="team-actions"><button onClick={() => setMenu(menu === member.membershipId ? null : member.membershipId)} aria-label={`Ações para ${member.displayName}`}><MoreHorizontal /></button>{menu === member.membershipId && <div className="team-action-menu">{(member.status === 'Active' || member.status === 'Invited') && <button onClick={() => beginEdit(member)}><Edit3 />Editar acesso e atuação</button>}{member.status === 'Invited' && <button onClick={() => void resend(member)}><RotateCw />Reenviar convite</button>}{member.status === 'Revoked' && <button onClick={() => beginInvite(member)}><RotateCw />Reativar por convite</button>}{member.status !== 'Revoked' && !member.isCurrentUser && <button className="danger" onClick={() => void deactivate(member)}><UserX />Desativar acesso</button>}</div>}</div>
      </article>)}</div>
      {!loading && filtered.length === 0 && <div className="empty-state"><Users /><h3>{query ? 'Nenhuma pessoa encontrada' : 'Sua equipe começa aqui'}</h3><p>{query ? 'Tente buscar por outro termo.' : 'Convide a primeira pessoa. Leva menos de um minuto.'}</p>{!query && <button className="button button-primary" onClick={() => beginInvite()}><Plus />Fazer primeiro convite</button>}</div>}{loading && <div className="empty-state"><p>Organizando sua equipe…</p></div>}
    </section>{open && <TeamModal editing={editing} form={form} setForm={setForm} units={units} saving={saving} error={error} onClose={() => setOpen(false)} onSubmit={submit} />}
  </div>
}

function TeamModal({ editing, form, setForm, units, saving, error, onClose, onSubmit }: { editing: TeamMember | null; form: InviteTeamMember; setForm: (form: InviteTeamMember) => void; units: ClinicUnit[]; saving: boolean; error: string; onClose: () => void; onSubmit: (event: React.FormEvent) => void }) {
  const selectRole = (role: TeamRole) => setForm({ ...form, role, performsCare: role === 'Professional' ? true : role === 'Receptionist' ? false : form.performsCare })
  return <div className="modal-backdrop"><section className="modal team-modal" role="dialog" aria-modal="true" aria-labelledby="team-modal-title"><button className="modal-close" onClick={onClose} aria-label="Fechar"><X /></button><span className="team-kicker"><Sparkles /> {editing ? 'Acesso e atuação' : 'Convite rápido'}</span><h2 id="team-modal-title">{editing ? `Configurar ${editing.displayName}` : 'Quem você quer trazer?'}</h2><p className="team-modal-lead">Primeiro defina o acesso. Depois informe se essa pessoa também atende pacientes.</p><form onSubmit={onSubmit}>
    {!editing && <div className="form-grid"><div className="field"><label htmlFor="team-name">Nome</label><input id="team-name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Nome da pessoa" required maxLength={200} autoFocus /></div><div className="field"><label htmlFor="team-email">E-mail</label><input id="team-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="nome@clinica.com.br" required maxLength={320} /></div></div>}
    <fieldset className="role-picker"><legend>Qual será o acesso ao sistema?</legend>{(Object.keys(roleCopy) as TeamRole[]).map((role) => <label className={form.role === role ? 'selected' : ''} key={role}><input type="radio" name="role" checked={form.role === role} onChange={() => selectRole(role)} /><span>{role === 'ClinicAdministrator' ? <ShieldCheck /> : role === 'Professional' ? <UserRound /> : <Building2 />}</span><strong>{roleCopy[role].label}</strong><small>{roleCopy[role].description}</small>{form.role === role && <Check className="role-check" />}</label>)}</fieldset>
    {form.role === 'ClinicAdministrator' && <label className={`care-toggle ${form.performsCare ? 'selected' : ''}`}><input type="checkbox" checked={form.performsCare} onChange={(event) => setForm({ ...form, performsCare: event.target.checked })} /><span><BriefcaseMedical /></span><div><strong>Também realiza atendimentos</strong><small>Ative se este administrador também aparece na agenda e atende pacientes.</small></div><i><Check /></i></label>}
    {form.role === 'Professional' && <div className="care-required"><BriefcaseMedical /><div><strong>Este perfil realiza atendimentos</strong><small>Profissionais aparecem na agenda das unidades selecionadas.</small></div></div>}
    {form.performsCare && <div className="professional-fields"><div className="field"><label htmlFor="team-specialty">Especialidade</label><input id="team-specialty" value={form.specialty} onChange={(event) => setForm({ ...form, specialty: event.target.value })} placeholder="Ex.: Psicologia" required maxLength={150} /></div><div className="field"><label htmlFor="team-council">Conselho</label><input id="team-council" value={form.councilType} onChange={(event) => setForm({ ...form, councilType: event.target.value.toUpperCase() })} placeholder="Ex.: CRP" required maxLength={30} /></div><div className="field"><label htmlFor="team-registration">Número do registro</label><input id="team-registration" value={form.registrationNumber} onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })} placeholder="Ex.: 06/123456" required maxLength={100} /></div></div>}
    <fieldset className="unit-picker"><legend>{form.performsCare ? 'Em quais unidades trabalha e atende?' : 'Quais unidades pode acessar?'}</legend>{units.map((unit) => <label key={unit.id}><input type="checkbox" checked={form.clinicUnitIds.includes(unit.id)} onChange={(event) => setForm({ ...form, clinicUnitIds: event.target.checked ? [...form.clinicUnitIds, unit.id] : form.clinicUnitIds.filter((id) => id !== unit.id) })} /><span><Building2 />{unit.name}</span></label>)}</fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}<div className="team-modal-footer"><span><ShieldCheck /> O histórico nunca é apagado.</span><div><button type="button" className="button button-outline" onClick={onClose}>Agora não</button><button className="button button-primary" disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar configuração' : 'Enviar convite'}<ArrowRight /></button></div></div>
  </form></section></div>
}

export function WelcomeTeamCard({ tenantName }: { tenantName?: string }) {
  const key = `brothers-care-welcome:${tenantName ?? 'clinic'}`
  const [visible, setVisible] = useState(() => sessionStorage.getItem(key) !== 'dismissed')
  if (!visible) return null
  const dismiss = () => { sessionStorage.setItem(key, 'dismissed'); setVisible(false) }
  return <section className="welcome-team"><div className="welcome-orbit"><span><Check /></span></div><div className="welcome-copy"><span className="team-kicker"><Sparkles /> Tudo pronto para começar</span><h2>Boas-vindas à {tenantName || 'sua clínica'}!</h2><p>Seu espaço já está criado. Convide sua equipe e indique de forma simples quem também realiza atendimentos.</p><div className="welcome-points"><span><Check /> Um acesso por pessoa</span><span><Check /> Histórico sempre preservado</span></div><div className="welcome-actions"><Link className="button button-primary" to="/app/usuarios">Montar minha equipe <ArrowRight /></Link><button onClick={dismiss}>Explorar primeiro</button></div></div><button className="welcome-close" onClick={dismiss} aria-label="Fechar boas-vindas"><X /></button></section>
}
