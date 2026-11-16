import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, FileText, Filter, Home, Mail, Plus, Search, Stethoscope, Users, Wallet, X } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { evolutions, formatCurrency, patients, professionals, revenueByPlan } from './data'
import { listTenants, type TenantListItem, type TenantPage } from './features/identity/accountActionApi'
import { TenantPreRegistrationPage } from './features/tenants/TenantPreRegistrationPage'

const money = (value: number) => formatCurrency(value).replace(',00', '')

type Notify = (message: string) => void
type ClinicalEntry = (typeof evolutions)[number] & { observations?: string; guidance?: string; modality?: string; duration?: string; attachment?: string }
type ProfessionalEntry = (typeof professionals)[number] & { email?: string; phone?: string; license?: string; workload?: string; startDate?: string }

function readStoredEntries<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[] } catch { return [] }
}

export function readSavedProfessionals(): ProfessionalEntry[] {
  const saved = readStoredEntries<ProfessionalEntry>('brothers-care-professionals')
  saved.forEach((entry) => { if (!professionals.some((item) => item.id === entry.id)) professionals.push(entry) })
  return saved
}
readSavedProfessionals()

export function EvolutionTimeline({ filterPatient, entries }: { filterPatient?: string; entries?: ClinicalEntry[] }) {
  const source = entries || [...evolutions, ...readStoredEntries<ClinicalEntry>('brothers-care-evolutions')]
  const items = filterPatient ? source.filter((item) => item.patient === filterPatient) : source
  return <div className="activity-list">{items.map((item) => <div className="activity-item" key={item.id}><span className="activity-icon"><FileText /></span><div className="activity-copy"><strong>{item.patient}</strong><br />{item.objective}<small>{new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')} · {item.professional} · {item.specialty}</small><span className={`status status-${item.status.toLowerCase()}`} style={{ marginTop: 7 }}>{item.status}</span></div></div>)}</div>
}

export function EvolutionPage({ notify, professional }: { notify: Notify; professional: boolean }) {
  const initialFields = { patient: 'Regina Oliveira', professional: 'Ana Souza', date: '2026-10-15', time: '10:30', duration: '50', modality: 'Clínica', objective: '', interventions: '', response: '', observations: '', guidance: '', next: '' }
  const [fields, setFields] = useState(initialFields)
  const [entries, setEntries] = useState<ClinicalEntry[]>(() => readStoredEntries<ClinicalEntry>('brothers-care-evolutions'))
  const [recordId, setRecordId] = useState<number | null>(null)
  const [status, setStatus] = useState('Rascunho')
  const [attachment, setAttachment] = useState('')
  const [error, setError] = useState('')
  const patientOptions = professional ? ['Regina Oliveira', 'Helena Costa', 'Antônio Nogueira', 'Marta Rodrigues'] : patients.slice(0, 10).map((item) => item.name)
  const setField = (key: keyof typeof fields, value: string) => { setFields((current) => ({ ...current, [key]: value })); setStatus('Rascunho'); setError('') }
  const save = (finalize: boolean) => {
    if (!fields.patient || !fields.objective.trim() || !fields.interventions.trim()) { setError('Preencha paciente, objetivo e intervenções antes de salvar.'); return }
    const patientInfo = patients.find((item) => item.name === fields.patient)
    const professionalInfo = professionals.find((item) => item.name === fields.professional) || professionals[0]
    const entry: ClinicalEntry = { id: recordId || Date.now(), patient: fields.patient, professional: fields.professional, date: fields.date, specialty: professionalInfo.specialty, objective: fields.objective.trim(), intervention: fields.interventions.trim(), response: fields.response.trim() || 'Resposta não registrada.', next: fields.next.trim() || 'Reavaliar na próxima sessão.', observations: fields.observations, guidance: fields.guidance, modality: fields.modality, duration: fields.duration, attachment, status: finalize ? 'Finalizada' : 'Rascunho' }
    const nextEntries = recordId ? entries.map((item) => item.id === recordId ? entry : item) : [entry, ...entries]
    localStorage.setItem('brothers-care-evolucoes', JSON.stringify(nextEntries))
    setEntries(nextEntries)
    setRecordId(entry.id)
    setStatus(entry.status)
    setError('')
    notify(finalize ? `Evolução de ${fields.patient} finalizada e incluída no histórico.` : `Rascunho de ${fields.patient} salvo.`)
    if (finalize) { setFields({ ...initialFields, patient: patientInfo?.name || fields.patient }); setRecordId(null); setAttachment(''); setStatus('Rascunho') }
  }
  return <div className="grid two-col evolution-layout"><section className="card card-pad evolution-form"><div className="card-heading"><div><h2>Registro de evolução</h2><p>{fields.date ? new Date(`${fields.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Data da sessão'} · {fields.time || 'Horário'} · {fields.professional}</p></div><span className={`status status-${status.toLowerCase()}`}>{status}</span></div><div className="evolution-context"><div><span>ATENDIMENTO</span><strong>{fields.modality} · {fields.duration} min</strong></div><div><span>REGISTRO</span><strong>{recordId ? 'Em edição' : 'Novo registro'}</strong></div></div><div className="form-grid"><div className="field full"><label htmlFor="evolution-patient">Paciente <b>*</b></label><select id="evolution-patient" value={fields.patient} onChange={(event) => setField('patient', event.target.value)}>{patientOptions.map((name) => <option key={name}>{name}</option>)}</select></div><div className="field"><label>Profissional responsável</label><select value={fields.professional} disabled={professional} onChange={(event) => setField('professional', event.target.value)}>{(professional ? professionals.filter((item) => item.name === 'Ana Souza') : professionals).map((item) => <option key={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Especialidade</label><input value={professionals.find((item) => item.name === fields.professional)?.specialty || 'Terapia Ocupacional'} readOnly /></div><div className="field"><label>Data da sessão</label><input type="date" value={fields.date} onChange={(event) => setField('date', event.target.value)} /></div><div className="field"><label>Horário e duração</label><div className="inline-fields"><input type="time" value={fields.time} onChange={(event) => setField('time', event.target.value)} /><select value={fields.duration} onChange={(event) => setField('duration', event.target.value)}><option value="30">30 min</option><option value="45">45 min</option><option value="50">50 min</option><option value="60">60 min</option><option value="90">90 min</option></select></div></div><div className="field full"><label>Local do atendimento</label><div className="segmented">{['Clínica', 'Domiciliar', 'Teleatendimento'].map((item) => <button type="button" className={fields.modality === item ? 'selected' : ''} key={item} onClick={() => setField('modality', item)}>{item}</button>)}</div></div>{[
    ['objective', 'Objetivo terapêutico', 'O que se pretende alcançar nesta sessão?'], ['interventions', 'Intervenções realizadas', 'Descreva as atividades, recursos e estratégias utilizados.'], ['response', 'Resposta e participação do paciente', 'Registre a participação, tolerância e resposta observada.'], ['observations', 'Observações clínicas', 'Aspectos relevantes para continuidade do cuidado.'], ['guidance', 'Orientações ao paciente e família', 'Combine recomendações e atividades para o período.'], ['next', 'Plano e próximos passos', 'Defina foco da próxima sessão e necessidade de reavaliação.'],
  ].map(([key, label, placeholder]) => <div className="field full" key={key}><label>{label}{['objective', 'interventions', 'response'].includes(key) && <b> *</b>}</label><textarea rows={key === 'objective' ? 2 : 3} placeholder={placeholder} value={fields[key as keyof typeof fields]} onChange={(event) => setField(key as keyof typeof fields, event.target.value)} /></div>)}<div className="field full"><label>Anexos e documentos de apoio</label><label className="button button-outline upload-button"><Plus />Selecionar arquivo<input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => setAttachment(event.target.files?.[0]?.name || '')} /></label>{attachment && <span className="attachment-chip"><FileText size={14}/>{attachment}<button type="button" onClick={() => setAttachment('')} aria-label="Remover anexo"><X size={13}/></button></span>}</div></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="evolution-actions"><span>Registro vinculado ao histórico clínico.</span><div><button className="button button-outline" onClick={() => save(false)}><FileText />Salvar rascunho</button><button className="button button-primary" onClick={() => save(true)}><Check />Finalizar evolução</button></div></div></section><section className="card card-pad"><div className="card-heading"><div><h2>Histórico de evoluções</h2><p>Registros clínicos recentes</p></div><span className="status status-bom">{15 + entries.length} registros</span></div><EvolutionTimeline filterPatient={professional ? 'Regina Oliveira' : undefined} entries={[...entries, ...evolutions]} /></section></div>
}

function Stat({ label, value, note, icon: Icon, tone }: { label: string; value: string; note: string; icon: typeof Users; tone?: string }) {
  return <article className="card kpi-card"><div className="kpi-top"><span>{label}</span><span className="kpi-icon" style={tone === 'coral' ? { background: '#fff0eb', color: '#c76a56' } : undefined}><Icon /></span></div><div className="kpi-value">{value}</div><div className="kpi-note">{note}</div></article>
}

export function FinancePage({ notify }: { notify: Notify }) {
  const [step, setStep] = useState(1)
  const metrics = [['Faturamento previsto', 'R$ 78.450', 'Setembro · competência', CircleDollarSign], ['Recebido', 'R$ 61.300', '78,1% do previsto', CheckCircle2], ['A receber', 'R$ 17.150', '12 lançamentos pendentes', ArrowDownLeft], ['Repasses', 'R$ 32.640', '24 profissionais', Wallet], ['Resultado previsto', 'R$ 45.810', 'Margem operacional 58,4%', ArrowUpRight]] as const
  const amounts = [26780, 18450, 14920, 10300, 8000]
  const received = [23500, 15200, 11600, 7700, 3300]
  const steps = ['Período', 'Conferência', 'Divergências', 'Valores', 'Confirmação']
  return <><div className="grid kpi-grid" style={{ gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>{metrics.map(([label, value, note, Icon]) => <Stat key={label} label={label} value={value} note={note} icon={Icon} tone={label === 'A receber' ? 'coral' : undefined} />)}</div><div className="grid dashboard-grid"><section className="card chart-card"><div className="card-heading"><div><h2>Receita por convênio</h2><p>Produção faturada · setembro</p></div><button className="button button-outline" onClick={() => notify('Relatório por convênio preparado.')}>Ver relatório</button></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueByPlan} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}><CartesianGrid stroke="#edf1f2" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#87969c' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1adb0' }} tickFormatter={(value) => `R$${Math.round(Number(value) / 1000)}k`} /><Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 8, fontSize: 10 }} /><Area type="monotone" dataKey="value" stroke="#21bfa0" fill="#bfeee1" fillOpacity={0.48} /></AreaChart></ResponsiveContainer></div></section><section className="card card-pad"><div className="card-heading"><div><h2>Fechamento mensal</h2><p>Competência setembro de 2026</p></div><span className="status status-aguardando">Em andamento</span></div><div className="activity-list">{steps.map((label, index) => <div className="activity-item" key={label}><span className="activity-icon">{index < step ? <Check /> : index + 1}</span><div className="activity-copy"><strong>{label}</strong><small>{index === step - 1 ? 'Etapa atual' : index < step ? 'Concluída' : 'Aguardando'}</small></div></div>)}</div><button className="button button-primary" style={{ width: '100%', marginTop: 18 }} onClick={() => step < 5 ? setStep(step + 1) : (setStep(1), notify('Fechamento mensal confirmado.'))}>{step === 5 ? 'Confirmar fechamento' : 'Continuar fechamento'}<ArrowRight /></button></section></div><section className="card table-card" style={{ marginTop: 15 }}><div className="table-toolbar"><div><h2 className="section-title">Resumo por convênio</h2><span style={{ fontSize: 9, color: '#91a0a5' }}>Valores faturados no mês</span></div><button className="button button-outline" onClick={() => notify('Relatório exportado.')}>Exportar</button></div><div className="table-wrap"><table><thead><tr><th>Convênio</th><th>Produção</th><th>Recebido</th><th>A receber</th><th>Status</th></tr></thead><tbody>{revenueByPlan.map((item, index) => <tr key={item.name}><td style={{ fontWeight: 600, color: '#264352' }}>{item.name}</td><td>{money(amounts[index])}</td><td>{money(received[index])}</td><td>{money(amounts[index] - received[index])}</td><td><span className={`status ${index === 4 ? 'status-aguardando' : 'status-ativo'}`}>{index === 4 ? 'Conferência' : 'Conciliado'}</span></td></tr>)}</tbody></table></div></section></>
}

export function CommunicationPage() {
  const rows = [['Regina Oliveira', 'Resumo do atendimento', 'regina.oliveira@email.com', '15 out, 11:12', 'Entregue'], ['José Almeida', 'Confirmação de atendimento', 'jose.almeida@email.com', '15 out, 10:45', 'Entregue'], ['Helena Costa', 'Orientações para próxima visita', 'responsavel.costa@email.com', '15 out, 09:20', 'Pendente'], ['Marta Rodrigues', 'Agradecimento pela visita', 'marta.rodrigues@email.com', '14 out, 17:08', 'Entregue'], ['Antônio Nogueira', 'Lembrete de atendimento', 'antonio.nogueira@email.com', '14 out, 15:40', 'Entregue']]
  return <><div className="grid kpi-grid"><Stat label="E-mails enviados" value="684" note="Neste mês" icon={Mail} /><Stat label="Entregues" value="671" note="98,1% de entrega" icon={CheckCircle2} /><Stat label="Taxa de entrega" value="98,1%" note="↑ 1,4% em relação ao mês anterior" icon={Activity} /><Stat label="Pendentes" value="5" note="Aguardando envio" icon={Clock3} tone="coral" /></div><section className="card table-card"><div className="table-toolbar"><label className="searchbox"><Search /><input placeholder="Buscar comunicação..." /></label><div className="filter-actions"><select className="select-mini"><option>Todos os status</option><option>Entregue</option><option>Pendente</option></select><button className="button button-primary"><Plus />Nova comunicação</button></div></div><div className="table-wrap"><table><thead><tr><th>Paciente</th><th>Assunto</th><th>Destinatário</th><th>Data</th><th>Status</th><th>Conteúdo</th></tr></thead><tbody>{rows.map(([patient, subject, email, date, status]) => <tr key={patient}><td style={{ fontWeight: 600, color: '#294455' }}>{patient}</td><td>{subject}</td><td>{email}</td><td>{date}</td><td><span className={`status status-${status.toLowerCase()}`}>{status}</span></td><td><button className="link-button">Prévia segura</button></td></tr>)}</tbody></table></div><div style={{ padding: 14, fontSize: 9, color: '#8c9a9c', background: '#fbfcfc' }}>As mensagens não incluem informações clínicas. O paciente acessa os detalhes por um link seguro e autenticado.</div></section></>
}

export function AuditPage() {
  const rows = [['15 out, 11:12', '11:12', 'Ana Souza', 'Evolução finalizada', 'Evoluções', '192.168.1.24'], ['15 out, 10:48', '10:48', 'Mariana Farias', 'Atendimento atualizado', 'Agenda', '192.168.1.18'], ['15 out, 09:35', '09:35', 'Mariana Farias', 'Paciente atualizado', 'Pacientes', '192.168.1.18'], ['14 out, 18:02', '18:02', 'Mariana Farias', 'Fechamento reaberto', 'Financeiro', '192.168.1.18'], ['14 out, 17:42', '17:42', 'Ana Souza', 'Evolução finalizada', 'Evoluções', '192.168.1.24'], ['14 out, 16:21', '16:21', 'Mariana Farias', 'Atendimento alterado', 'Agenda', '192.168.1.18']]
  return <section className="card table-card"><div className="table-toolbar"><label className="searchbox"><Search /><input placeholder="Buscar usuário ou evento..." /></label><div className="filter-actions"><select className="select-mini"><option>Todos os módulos</option><option>Agenda</option><option>Evoluções</option><option>Financeiro</option></select><button className="button button-outline"><Filter />Período</button></div></div><div className="table-wrap"><table><thead><tr>{['Data', 'Hora', 'Usuário', 'Evento', 'Módulo', 'IP de acesso'].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{rows.map(([date, time, user, event, module, ip]) => <tr key={`${date}-${time}`}><td>{date}</td><td>{time}</td><td><span className="person-cell"><span className="avatar small">{user.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><strong>{user}</strong></span></td><td style={{ color: '#2e4958', fontWeight: 600 }}>{event}</td><td>{module}</td><td style={{ fontFamily: 'monospace' }}>{ip}</td></tr>)}</tbody></table></div><div className="table-footer"><span>Eventos recentes · retenção de 12 meses</span><Pager /></div></section>
}

export function ReportsPage({ notify }: { notify: Notify }) {
  const reports = [[CalendarDays, 'Atendimentos', 'Volume, conclusão e ocupação da agenda'], [Stethoscope, 'Produção por profissional', 'Atendimentos realizados e produtividade'], [CircleDollarSign, 'Financeiro por convênio', 'Faturamento, recebimentos e divergências'], [Users, 'Pacientes ativos', 'Crescimento e perfil da carteira'], [X, 'Cancelamentos', 'Frequência e motivos de cancelamento'], [FileText, 'Evoluções pendentes', 'Acompanhamento dos registros clínicos'], [Wallet, 'Fechamento mensal', 'Conferência financeira por competência']] as const
  return <div className="feature-grid">{reports.map(([Icon, title, copy]) => <button className="feature-card" key={title} style={{ textAlign: 'left' }} onClick={() => notify(`Relatório “${title}” preparado.`)}><div className="feature-icon"><Icon /></div><h3>{title}</h3><p>{copy}</p><span className="link-button" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 13 }}>Abrir relatório <ArrowRight size={12} /></span></button>)}</div>
}

export function PlansPage() { return <DataTable title="Convênios e tabelas" subtitle="5 convênios ativos · Instituto Vitta" headers={['Convênio', 'Pacientes ativos', 'Faturamento no mês', 'Prazo médio', 'Status']} rows={revenueByPlan.map((item, index) => [item.name, String([48, 35, 31, 22, 50][index]), money(item.value), [30, 35, 28, 42, 0][index] ? `${[30, 35, 28, 42, 0][index]} dias` : 'Imediato', 'Ativo'])} action="Novo convênio" /> }
export function UsersPage() { return <DataTable title="Acesso à plataforma" subtitle="28 usuários · 3 perfis de acesso" headers={['Usuário', 'Perfil', 'Último acesso', 'Status']} rows={[['Mariana Farias', 'Administradora', 'Hoje, 09:42', 'Ativo'], ['Ana Souza', 'Profissional', 'Hoje, 08:15', 'Ativo'], ...professionals.slice(1, 8).map((person) => [person.name, 'Profissional', '14 out, 17:30', 'Ativo'])]} action="Convidar usuário" /> }
export function DocumentsPage() { return <DataTable title="Documentos compartilhados" subtitle="Arquivos da sua equipe e pacientes autorizados" headers={['Documento', 'Paciente', 'Categoria', 'Atualizado', 'Acesso']} rows={ [['Plano terapêutico', 'Regina Oliveira', 'Plano de cuidado', '14 out, 2026', 'Autorizado'], ['Relatório funcional', 'Helena Costa', 'Relatório', '12 out, 2026', 'Autorizado'], ['Orientações domiciliares', 'Antônio Nogueira', 'Orientação', '10 out, 2026', 'Autorizado']] } action="Adicionar documento" /> }
export function SettingsPage({ notify }: { notify: Notify }) { const [tab, setTab] = useState('Empresa'); return <div className="card card-pad"><div className="tabs">{['Empresa', 'Atendimentos', 'Notificações', 'Privacidade'].map((item) => <button key={item} className={`tab ${tab === item ? 'active' : ''}`} onClick={() => setTab(item)}>{item}</button>)}</div><div className="form-grid"><div className="field"><label>Nome da empresa</label><input defaultValue="Instituto Vitta Reabilitação" /></div><div className="field"><label>Segmento</label><select defaultValue="Reabilitação multidisciplinar"><option>Reabilitação multidisciplinar</option></select></div><div className="field"><label>Localização</label><input defaultValue="Rio de Janeiro, RJ" /></div><div className="field"><label>Plano atual</label><input defaultValue="Professional" readOnly /></div><div className="field full"><label>Descrição institucional</label><textarea defaultValue="Cuidado integrado em reabilitação, na clínica e em domicílio." /></div></div><div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}><button className="button button-primary" onClick={() => notify('Configurações atualizadas.')}>Salvar alterações</button></div></div> }

function DataTable({ title, subtitle, headers, rows, action }: { title: string; subtitle: string; headers: string[]; rows: string[][]; action: string }) { return <section className="card table-card"><div className="table-toolbar"><div><h2 className="section-title">{title}</h2><span style={{ fontSize: 9, color: '#91a0a5' }}>{subtitle}</span></div><button className="button button-primary"><Plus />{action}</button></div><div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cellIndex === 0 ? <strong style={{ color: '#294455' }}>{cell}</strong> : cell === 'Ativo' || cell === 'Autorizado' ? <span className="status status-ativo">{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div></section> }

function Pager() { return <div className="pagination"><button aria-label="Página anterior"><ChevronLeft size={13} /></button><button className="active">1</button><button>2</button><button>3</button><button aria-label="Próxima página"><ChevronRight size={13} /></button></div> }

export function AdminContent({ path, query, setQuery, notify }: { path: string; query: string; setQuery: (value: string) => void; notify: Notify }) {
  void query
  void setQuery
  void notify
  if (path === '/admin') return <AdminDashboard notify={notify} />
  if (path === '/admin/pre-cadastros') return <TenantPreRegistrationPage />
  return <UnavailableAdminModule />
}

function AdminDashboard({ notify }: { notify: Notify }) {
  const [page, setPage] = useState<TenantPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setPage(await listTenants('', 1, 5))
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Não foi possível carregar os dados da plataforma.'
      setError(message)
      notify(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  if (loading) return <div className="card card-pad"><p>Carregando dados reais da plataforma...</p></div>
  if (error) return <section className="card card-pad empty-state"><h3>Não foi possível carregar o painel</h3><p>{error}</p><button className="button button-outline" onClick={() => void load()}>Tentar novamente</button></section>

  const metrics = [
    ['Empresas', String(page?.totalItems ?? 0), 'Total cadastrado na plataforma', Home],
    ['Empresas ativas', String(page?.activeCount ?? 0), 'Com acesso ativo', CheckCircle2],
    ['Onboardings pendentes', String(page?.pendingCount ?? 0), 'Aguardando conclusão', Clock3],
  ] as const

  return <><div className="grid kpi-grid">{metrics.map(([label, value, note, Icon]) => <Stat key={label} label={label} value={value} note={note} icon={Icon} />)}</div><section className="card table-card" style={{ marginTop: 15 }}><div className="table-toolbar"><div><h2 className="section-title">Empresas recentes</h2><span style={{ fontSize: 9, color: '#91a0a5' }}>Dados reais cadastrados na plataforma</span></div><Link className="link-button" to="/admin/pre-cadastros">Gerenciar empresas <ArrowRight size={12} /></Link></div><div className="table-wrap"><TenantTable rows={page?.items ?? []} /></div></section></>
}

function TenantTable({ rows }: { rows: TenantListItem[] }) {
  const administratorLabels: Record<string, string> = { Invited: 'Aguardando aceite', Active: 'Administrador ativo', Suspended: 'Administrador suspenso', Revoked: 'Convite revogado', WithoutAdministrator: 'Sem administrador' }
  if (rows.length === 0) return <div className="empty-state"><h3>Nenhuma empresa cadastrada</h3><p>Os cadastros reais aparecerão aqui.</p></div>
  return <table><thead><tr>{['Empresa', 'CNPJ', 'Status', 'Primeiro administrador'].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((tenant) => <tr key={tenant.id}><td><span className="person-cell"><span className="tenant-logo" style={{ width: 28, height: 28, fontSize: 9 }}>{tenant.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><strong>{tenant.name}</strong></span></td><td>{tenant.cnpj || 'Não informado'}</td><td><span className={`status ${tenant.status === 'Active' ? 'status-ativo' : 'status-aguardando'}`}>{tenant.status}</span></td><td>{administratorLabels[tenant.firstAdministratorStatus] ?? tenant.firstAdministratorStatus}</td></tr>)}</tbody></table>
}

function UnavailableAdminModule() {
  return <section className="card card-pad empty-state"><h3>Módulo ainda não integrado</h3><p>Esta área não exibe dados fictícios. Ela será habilitada quando o backend correspondente estiver disponível.</p></section>
}

const adminLinks = [['Visão geral', '/admin'], ['Pré-cadastros', '/admin/pre-cadastros']]
const clinicLinks = [['Visão geral', '/app/dashboard'], ['Agenda', '/app/agenda'], ['Pacientes', '/app/pacientes'], ['Profissionais', '/app/profissionais'], ['Atendimentos', '/app/atendimentos'], ['Evoluções', '/app/evolucoes'], ['Financeiro', '/app/financeiro'], ['Convênios', '/app/convenios'], ['Comunicação', '/app/comunicacao'], ['Relatórios', '/app/relatorios'], ['Auditoria', '/app/auditoria'], ['Usuários', '/app/usuarios'], ['Configurações', '/app/configuracoes']]
export function CommandPalette({ onClose }: { onClose: () => void }) { const [query, setQuery] = useState(''); const navigate = useNavigate(); const location = useLocation(); const links = (location.pathname.startsWith('/admin') ? adminLinks : clinicLinks).filter(([label]) => label.toLowerCase().includes(query.toLowerCase())); return <div className="modal-backdrop command-backdrop" onClick={onClose}><div className="command-modal" onClick={(event) => event.stopPropagation()}><label className="command-search"><Search /><input autoFocus placeholder="Buscar páginas e ações..." value={query} onChange={(event) => setQuery(event.target.value)} /><button className="icon-button" onClick={onClose}><X /></button></label><div className="command-results"><div className="command-label">Navegação</div>{links.length ? links.map(([label, href]) => <button className="command-item" key={href} onClick={() => { navigate(href); onClose() }}><Search />{label}<ArrowRight style={{ marginLeft: 'auto' }} /></button>) : <div className="empty-state" style={{ padding: 22 }}>Nenhum resultado encontrado.</div>}</div></div></div> }
export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="modal-backdrop" onClick={onClose}><section className="modal" onClick={(event) => event.stopPropagation()}><header className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X /></button></header><div className="modal-body">{children}</div></section></div> }

export function ProfessionalForm({ onDone }: { onDone: (message: string) => void }) {
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const name = String(values.get('name') || '').trim()
    const email = String(values.get('email') || '').trim()
    if (!name || !email) { setError('Preencha nome e e-mail profissional para continuar.'); return }
    const specialty = String(values.get('specialty') || 'Terapeuta Ocupacional')
    const colors = ['#d8eee8', '#f6e3d6', '#dce7f5', '#f1e7bb', '#eeddf0', '#dce9dc']
    const entry: ProfessionalEntry = {
      id: Math.max(0, ...professionals.map((person) => person.id)) + 1, name, specialty, patients: 0, appointments: 0, status: 'Ativo',
      initials: name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase(),
      color: colors[readSavedProfessionals().length % colors.length],
      email, phone: String(values.get('phone') || ''), license: String(values.get('license') || ''),
      workload: String(values.get('workload') || ''), startDate: String(values.get('startDate') || ''),
    }
    const saved = readStoredEntries<ProfessionalEntry>('brothers-care-professionals')
    localStorage.setItem('brothers-care-professionals', JSON.stringify([...saved, entry]))
    if (!professionals.some((item) => item.id === entry.id)) professionals.push(entry)
    onDone(`Acesso preparado para ${name}. O cadastro já aparece na equipe.`)
  }
  return <form className="record-form" onSubmit={submit}><div className="form-intro"><span className="form-step">01</span><div><strong>Perfil profissional</strong><small>O acesso será preparado após a confirmação.</small></div></div><div className="form-grid"><div className="field full"><label htmlFor="professional-name">Nome completo <b>*</b></label><input id="professional-name" name="name" placeholder="Nome e sobrenome" required autoFocus /></div><div className="field"><label htmlFor="professional-email">E-mail profissional <b>*</b></label><input id="professional-email" name="email" type="email" placeholder="nome@institutovitta.com.br" required /></div><div className="field"><label htmlFor="professional-phone">Telefone</label><input id="professional-phone" name="phone" type="tel" placeholder="(21) 00000-0000" /></div><div className="field"><label htmlFor="professional-specialty">Especialidade</label><select id="professional-specialty" name="specialty"><option>Terapeuta Ocupacional</option><option>Fisioterapeuta</option><option>Fonoaudiólogo</option><option>Psicólogo</option><option>Nutricionista</option></select></div><div className="field"><label htmlFor="professional-license">Conselho e registro</label><input id="professional-license" name="license" placeholder="Ex.: CREFITO-2 · 00000-TO" /></div><div className="field"><label htmlFor="professional-workload">Disponibilidade semanal</label><select id="professional-workload" name="workload"><option>20 horas</option><option>30 horas</option><option>40 horas</option><option>Horários flexíveis</option></select></div><div className="field"><label htmlFor="professional-start">Início previsto</label><input id="professional-start" name="startDate" type="date" defaultValue="2026-10-19" /></div><div className="field full"><label className="check-row"><input type="checkbox" name="access" defaultChecked /><span>Enviar instruções de acesso e integração</span></label></div></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-footer"><span><CheckCircle2 size={14} />Acesso vinculado ao Instituto Vitta</span><button className="button button-primary" type="submit"><Check />Cadastrar profissional</button></div></form>
}
