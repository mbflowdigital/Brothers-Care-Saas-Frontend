import { lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Activity, AlertCircle, ArrowDownLeft, ArrowRight, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, Command, FileClock, FileText, Filter, HeartPulse, Home, LayoutDashboard, Menu, MessageCircle, MoreHorizontal, PanelLeftClose, Plus, Search, Settings, Shield, Sparkles, Stethoscope, UserCog, UserRound, Users, Wallet, X } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { monthlyAppointments, patients, professionals } from './data'
import { AdminContent, AuditPage, CommandPalette, CommunicationPage, DocumentsPage, EvolutionTimeline, FinancePage, Modal, PlansPage, ReportsPage, SettingsPage } from './ExtraViews'
import { ClinicalRecordsPage } from './features/clinical-records/ClinicalRecordsPage'
import { AccountMenu } from './features/identity/AccountMenu'
import { LoginPage, toUiSession, type AuthenticatedUiSession } from './features/identity/LoginPage'
import { getCurrentSession, logout } from './features/identity/accountActionApi'
import { PatientForm } from './features/patients/PatientForm'
import { deactivatePatient, listPatients, type PatientListItem } from './features/patients/patientApi'
import { ProfessionalsManagementPage } from './features/professionals/ProfessionalsManagementPage'
import { AppointmentAgendaPage } from './features/scheduling/AppointmentAgendaPage'
import { CreateAppointmentForm } from './features/scheduling/CreateAppointmentForm'
import { ProfessionalAvailabilityPage } from './features/scheduling/ProfessionalAvailabilityPage'
import { TeamPage, WelcomeTeamCard } from './features/team/TeamPage'
import { ClinicGettingStarted, getWorkspaceSummary, type WorkspaceSummary } from './features/workspace/ClinicGettingStarted'

const AccountActionPage = lazy(() => import('./features/identity/AccountActionPage').then((module) => ({ default: module.AccountActionPage })))
const TenantSelectionPage = lazy(() => import('./features/identity/TenantSelectionPage').then((module) => ({ default: module.TenantSelectionPage })))
const ClinicOnboardingPage = lazy(() => import('./features/onboarding/pages/ClinicOnboardingPage').then((module) => ({ default: module.ClinicOnboardingPage })))

type Session = AuthenticatedUiSession
const sessionDestination = (session: Session) => {
  if (session.profile === 'admin') return '/admin'
  if (!session.tenantId) return '/selecionar-empresa'
  const role = session.memberships.find((item) => item.tenantId === session.tenantId)?.role
  return role === 'Professional' ? '/app/minha-agenda' : role === 'Receptionist' ? '/app/agenda' : '/app/dashboard'
}
type ModalRequest = { title: string; content: string; kind?: 'patient' | 'appointment' }
type OpenModal = (modal: ModalRequest | null) => void
const clinicPath = '/app/dashboard'
const routeLabels: Record<string, string> = {
  '/admin/pre-cadastros': 'Pré-cadastros',
  '/app/dashboard': 'Visão geral', '/app/agenda': 'Agenda', '/app/pacientes': 'Pacientes', '/app/profissionais': 'Profissionais', '/app/atendimentos': 'Atendimentos', '/app/evolucoes': 'Evoluções', '/app/financeiro': 'Financeiro', '/app/convenios': 'Convênios', '/app/comunicacao': 'Comunicação', '/app/relatorios': 'Relatórios', '/app/auditoria': 'Auditoria', '/app/usuarios': 'Usuários', '/app/configuracoes': 'Configurações', '/app/minha-agenda': 'Minha agenda', '/app/minha-disponibilidade': 'Minha disponibilidade', '/app/disponibilidade': 'Disponibilidade', '/app/meus-pacientes': 'Meus pacientes', '/app/meus-atendimentos': 'Atendimentos', '/app/minhas-evolucoes': 'Evoluções', '/app/documentos': 'Documentos', '/admin': 'Visão geral', '/admin/empresas': 'Empresas', '/admin/assinaturas': 'Assinaturas', '/admin/planos': 'Planos', '/admin/tickets': 'Tickets', '/admin/atividade': 'Atividade global',
}
const clinicalNav = [
  { label: 'VISÃO GERAL', items: [['/app/dashboard', 'Visão geral', LayoutDashboard]] },
  { label: 'OPERAÇÃO CLÍNICA', items: [['/app/agenda', 'Agenda', CalendarDays], ['/app/pacientes', 'Pacientes', Users], ['/app/profissionais', 'Profissionais', Stethoscope], ['/app/disponibilidade', 'Disponibilidade', CalendarDays]] },
  { label: 'GESTÃO', items: [['/app/usuarios', 'Usuários', UserCog]] },
  { label: 'SISTEMA', items: [['/app/configuracoes', 'Configurações', Settings]] },
]
const professionalNav = [
  { label: 'ESPAÇO DE TRABALHO', items: [['/app/minha-agenda', 'Minha agenda', CalendarDays], ['/app/minha-disponibilidade', 'Minha disponibilidade', CalendarDays], ['/app/meus-pacientes', 'Meus pacientes', Users], ['/app/meus-atendimentos', 'Atendimentos', ClipboardCheck], ['/app/minhas-evolucoes', 'Evoluções', FileText], ['/app/documentos', 'Documentos', FileClock]] },
]
const adminNav = [
  { label: 'BROTHERS CARE', items: [['/admin', 'Visão geral', LayoutDashboard], ['/admin/pre-cadastros', 'Pré-cadastros', FileClock]] },
]

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<ModalRequest | null>(null)
  const [appointmentsRevision, setAppointmentsRevision] = useState(0)
  const [commandOpen, setCommandOpen] = useState(false)
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800) }
  const signIn = (value: Session) => setSession(value)
  const signOut = async () => {
    try { await logout() } finally { setSession(null) }
  }

  useEffect(() => {
    let mounted = true
    getCurrentSession()
      .then((value) => { if (mounted) setSession(value ? toUiSession(value) : null) })
      .catch(() => { if (mounted) setSession(null) })
      .finally(() => { if (mounted) setSessionLoading(false) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen((open) => !open) }
      if (event.key === 'Escape') { setCommandOpen(false); setModal(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (sessionLoading) return <main className="account-action-page"><div className="account-action-card" role="status">Carregando sessão…</div></main>

  return <>
    <Suspense fallback={<RouteLoading />}><Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={session ? <Navigate to={sessionDestination(session)} replace /> : <LoginPage onLogin={signIn} />} />
      <Route path="/selecionar-empresa" element={session && session.profile !== 'admin' ? session.tenantId ? <Navigate to={sessionDestination(session)} replace /> : <TenantSelectionPage session={session} onSelect={signIn} /> : <Navigate to="/login" replace />} />
      <Route path="/ativar-conta" element={<AccountActionPage mode="activation" onAuthenticated={signIn} />} />
      <Route path="/recuperar-senha" element={<AccountActionPage mode="recovery" />} />
      <Route path="/onboarding" element={<ClinicOnboardingPage hasPlatformAdministratorSession={session?.profile === 'admin'} onAuthenticated={signIn} />} />
      <Route path="/vitta" element={<VittaPage onAction={() => notify('Nossa equipe entrará em contato em breve.')} />} />
      <Route path="/admin/*" element={session?.profile === 'admin' ? <Workspace session={session} onLogout={signOut} notify={notify} openModal={setModal} appointmentsRevision={appointmentsRevision} /> : <Navigate to="/login" replace />} />
      <Route path="/app/*" element={session && session.profile !== 'admin' ? session.tenantId ? <Workspace session={session} onLogout={signOut} notify={notify} openModal={setModal} appointmentsRevision={appointmentsRevision} /> : <Navigate to="/selecionar-empresa" replace /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
    {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} />}
    {modal && <Modal title={modal.title} onClose={() => setModal(null)}>{modal.kind === 'patient'
      ? <PatientForm onDone={(patient) => { setModal(null); window.dispatchEvent(new Event('patients:changed')); notify(`${patient.fullName} foi cadastrado com sucesso.`) }} />
      : modal.kind === 'appointment'
        ? <CreateAppointmentForm viewerRole={session?.memberships.find((item) => item.tenantId === session.tenantId)?.role === 'Professional' ? 'professional' : 'clinicManager'} onCreated={() => { setModal(null); setAppointmentsRevision((revision) => revision + 1); notify('Agendamento criado com sucesso.') }} />
        : <><p className="modal-copy">{modal.content}</p><div className="modal-foot"><button className="button button-outline" onClick={() => setModal(null)}>Fechar</button><button className="button button-primary" onClick={() => { setModal(null); notify('Alterações salvas com sucesso.') }}>Confirmar</button></div></>}</Modal>}
    {toast && <div className="toast"><CheckCircle2 />{toast}</div>}
  </>
}

function RouteLoading() {
  return <main className="account-action-page"><div className="account-action-card" role="status" aria-live="polite">Carregando experiência…</div></main>
}

function Brand({ inverse = false }: { inverse?: boolean }) { return <Link to="/" className="public-brand" style={inverse ? { color: 'white' } : undefined}><span className="brand-mark"><HeartPulse size={18} strokeWidth={2.5} /></span><span>brothers care</span></Link> }

function Landing() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0)
  const plans = [
    { name: 'Starter', price: 'R$ 299/mês', description: 'Para clínicas que estão organizando a operação', features: ['Até 5 profissionais', 'Agenda e prontuário', 'Relatórios essenciais'] },
    { name: 'Professional', price: 'R$ 799/mês', description: 'Para equipes multidisciplinares em crescimento', features: ['Até 30 profissionais', 'Financeiro e convênios', 'Relatórios avançados'] },
    { name: 'Enterprise', price: 'Sob consulta', description: 'Para operações com necessidades próprias', features: ['Unidades e equipes flexíveis', 'Implantação acompanhada', 'Suporte prioritário'] },
  ]
  const choosePlan = (plan: (typeof plans)[number]) => {
    window.location.href = `mailto:comercial@brothers.digital?subject=${encodeURIComponent(`Apresentação Brothers Care · ${plan.name}`)}`
  }
  const features = [
    [Users, 'Pacientes', 'Histórico, documentos e jornada de cuidado em um só lugar.'], [UserRound, 'Profissionais', 'Equipe, especialidades, disponibilidade e produção conectadas.'], [CalendarDays, 'Agenda inteligente', 'Organize atendimentos presenciais e domiciliares.'], [FileText, 'Evolução clínica', 'Registros estruturados, seguros e sempre acessíveis.'], [Wallet, 'Financeiro', 'Acompanhe produção, repasses e recebimentos.'], [Shield, 'Auditoria', 'Rastreabilidade para uma gestão mais segura.'], [Activity, 'Relatórios', 'Indicadores que transformam operação em decisão.'], [MessageCircle, 'Comunicação', 'Lembretes e retornos com cuidado em cada detalhe.'],
  ] as const
  const faqs = [
    ['O Brothers Care atende clínicas de diferentes especialidades?', 'Sim. A plataforma foi pensada para operações multidisciplinares, incluindo reabilitação, terapia ocupacional, fisioterapia, fonoaudiologia e psicologia.'],
    ['É possível gerenciar atendimentos domiciliares?', 'Sim. A agenda organiza atendimentos na clínica e em domicílio, com visão por profissional, especialidade e status.'],
    ['Como funciona a segurança das informações?', 'O acesso é organizado por perfil e empresa, com trilhas de auditoria e controles de permissão para cada equipe.'],
    ['Posso conhecer a plataforma antes de contratar?', 'Claro. Nossa equipe apresenta os fluxos mais importantes para a realidade da sua clínica.'],
  ]
  return <main className="public-page">
    <header className="public-nav"><Brand /><nav className="public-links"><a href="#produto">Produto</a><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><a href="#planos">Planos</a><a href="#faq">FAQ</a></nav><div className="public-cta"><Link to="/login" className="button button-outline">Entrar</Link><a href="mailto:comercial@brothers.digital" className="button button-primary">Solicitar apresentação <ArrowRight size={14} /></a></div></header>
    <section className="public-section hero" id="produto"><div className="hero-copy"><span className="hero-kicker"><span /> Cuidado conectado, gestão inteligente</span><h1>Sua clínica organizada. Sua equipe conectada. Sua gestão <em>no controle.</em></h1><p>Centralize pacientes, profissionais, atendimentos, evoluções clínicas e financeiro em uma única plataforma.</p><div className="hero-actions"><a className="button button-primary" href="mailto:comercial@brothers.digital">Solicitar apresentação <ArrowRight /></a><a className="button button-outline" href="#recursos">Conhecer plataforma <ArrowDownLeft /></a></div><div className="hero-proof"><Shield size={18} /><span><strong>Estrutura multiempresa</strong><br />com perfis, permissões e auditoria</span></div></div><DashboardMockup /></section>
    <section className="social-strip"><div className="social-inner"><div className="social-number"><strong>Uma operação</strong><span>do atendimento à gestão</span></div>{['Multiunidade', 'Perfis e permissões', 'Histórico auditável', 'Rotina integrada'].map((capability) => <div className="client-name" key={capability}>{capability}</div>)}</div></section>
    <section className="public-section" id="recursos"><div className="section-intro"><div className="eyebrow">Tudo conectado</div><h2>Uma rotina mais leve para quem cuida</h2><p>Da primeira consulta ao fechamento do mês, as informações fluem entre as pessoas e processos da sua clínica.</p></div><div className="feature-grid">{features.map(([Icon, title, description]) => <article className="feature-card" key={title}><div className="feature-icon"><Icon /></div><h3>{title}</h3><p>{description}</p></article>)}</div></section>
    <section className="social-strip"><div className="social-inner"><div className="social-number"><strong>Visão central</strong><span>da operação</span></div><div className="social-number"><strong>Agenda</strong><span>por equipe e unidade</span></div><div className="social-number"><strong>Prontuário</strong><span>com histórico</span></div><div className="social-number"><strong>Financeiro</strong><span>integrado à rotina</span></div><div className="social-number"><strong>Indicadores</strong><span>para decidir melhor</span></div></div></section>
    <section className="public-section steps-section" id="como-funciona"><div className="section-intro"><div className="eyebrow">Simples desde o primeiro dia</div><h2>Da organização ao cuidado, sem perder o ritmo</h2><p>Uma implantação que acompanha o jeito de trabalhar da sua clínica.</p></div><div className="steps-grid">{[['01','Configure sua empresa','Defina unidades, especialidades e regras de atendimento.'],['02','Cadastre sua equipe','Convide profissionais e organize agendas e permissões.'],['03','Organize seus pacientes','Reúna dados, planos terapêuticos e histórico em um lugar.'],['04','Acompanhe a operação','Veja indicadores, evoluções e financeiro em tempo real.']].map(([number,title,copy])=><article className="step-card" key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="public-section"><div className="section-intro"><div className="eyebrow">Impacto na rotina</div><h2>Mais clareza em cada ponto da operação</h2></div><div className="quote-grid">{[['Recepção organizada','Agenda, confirmações e informações do paciente no mesmo fluxo.'],['Equipe conectada','Profissionais acompanham atendimentos e evoluções com o contexto certo.'],['Gestão presente','Indicadores operacionais e financeiros apoiam decisões sem depender de várias planilhas.']].map(([title,copy])=><article className="quote-card outcome-card" key={title}><CheckCircle2 /><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="public-section" id="planos"><div className="section-intro"><div className="eyebrow">Implantação acompanhada</div><h2>Encontre a configuração ideal para sua clínica</h2><p>Nossa equipe apresenta a plataforma e prepara seu acesso de acordo com a operação.</p></div><div className="price-grid">{plans.map((plan,index)=><article className={`price-card ${index===1?'featured':''}`} key={plan.name}>{index===1&&<span className="price-tag">MAIS ESCOLHIDO</span>}<h3>{plan.name}</h3><p>{plan.description}</p><div className="price-amount">{plan.price}</div><ul className="price-list">{plan.features.map((item)=><li key={item}><Check />{item}</li>)}</ul><button type="button" onClick={() => choosePlan(plan)} className={`button ${index===1?'button-primary':'button-outline'}`}>Falar com um especialista</button></article>)}</div></section>
    <section className="public-section" id="faq"><div className="section-intro"><div className="eyebrow">Perguntas frequentes</div><h2>O que você precisa saber</h2></div><div className="faq-list">{faqs.map(([question,answer],index)=><div className="faq-item" key={question}><button className="faq-question" onClick={()=>setFaqOpen(faqOpen===index?null:index)}>{question}{faqOpen===index?<X />:<Plus />}</button>{faqOpen===index&&<div className="faq-answer">{answer}</div>}</div>)}</div></section>
    <footer className="public-footer"><Brand /><span>© 2026 Brothers Digital. Tecnologia que aproxima o cuidado.</span><div className="footer-links"><Link to="/vitta">Instituto Vitta</Link><Link to="/login">Entrar</Link><a href="#faq">Privacidade</a></div></footer>
  </main>
}

function DashboardMockup() {
  return <div className="hero-visual"><div className="mock-window"><div className="mock-top"><i/><i/><i/><span>care.brothers.digital / visão geral</span></div><div className="mock-content"><aside className="mock-sidebar"><div className="mock-brand">✳ brothers care</div>{['Visão geral','Agenda','Pacientes','Evoluções','Financeiro'].map((item,index)=><div className={`mock-nav ${index===0?'active':''}`} key={item}>{item}</div>)}</aside><div className="mock-main"><div className="mock-heading"><strong>Bom dia, Instituto Vitta</strong><small>15 de outubro de 2026</small></div><div className="mock-kpis">{[['Pacientes ativos','186'],['Atendimentos no mês','742'],['Faturamento','R$ 78.450']].map(([label,value])=><div className="mock-kpi" key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><div className="mock-chart"><div className="mock-chart-label">Atendimentos por mês</div><div className="mock-bars">{[35,43,48,59,66,72,62,82,76,94,85,100].map((height,index)=><i key={index} style={{height:`${height}%`}} />)}</div></div></div></div></div><div className="mock-side-card"><small>Taxa de conclusão</small><strong>94,6%</strong><span>↑ 4,2% neste mês</span></div></div>
}

function VittaPage({ onAction }: { onAction: () => void }) {
  const services = [[HeartPulse,'Terapia Ocupacional','Autonomia e participação nas atividades do dia a dia.'],[Activity,'Fisioterapia','Movimento, funcionalidade e qualidade de vida.'],[MessageCircle,'Fonoaudiologia','Comunicação, linguagem e deglutição.'],[Sparkles,'Psicologia','Acolhimento e cuidado em cada etapa.'],[Home,'Atendimento domiciliar','Cuidado próximo, no conforto de casa.']] as const
  return <main className="public-page"><header className="public-nav"><Link className="public-brand" to="/vitta"><span className="tenant-logo" style={{width:34,height:34}}>IV</span><span>Instituto Vitta</span></Link><nav className="public-links"><a href="#especialidades">Especialidades</a><a href="#sobre-vitta">A clínica</a><a href="#contato-vitta">Contato</a></nav><button className="button button-primary" onClick={onAction}>Solicitar atendimento <ArrowRight /></button></header><section className="vitta-hero"><div className="eyebrow" style={{color:'#66ddc3'}}>INSTITUTO VITTA REABILITAÇÃO</div><h1>Seu caminho para mais autonomia começa com cuidado.</h1><p>Uma equipe multidisciplinar, atenta à sua história e comprometida com cada conquista, na clínica ou em casa.</p><button className="button button-primary" onClick={onAction}>Solicitar atendimento <ArrowRight /></button></section><section className="public-section" id="sobre-vitta"><div className="section-intro"><div className="eyebrow">Cuidado que acompanha você</div><h2>Um jeito integrado de reabilitar</h2><p>Na Vitta, cada plano é construído junto com você, com escuta, conhecimento e acompanhamento próximo.</p></div><div className="vitta-service-grid" id="especialidades">{services.map(([Icon,title,description])=><article className="feature-card" key={title}><div className="feature-icon"><Icon /></div><h3>{title}</h3><p>{description}</p></article>)}</div></section><section className="public-section" id="contato-vitta"><div className="final-cta"><div><h2>Vamos conversar sobre o seu cuidado?</h2><p>Atendimento em clínica e domiciliar no Rio de Janeiro.</p></div><button className="button button-dark" onClick={onAction}>Solicitar atendimento <ArrowRight /></button></div></section><footer className="public-footer"><Link to="/vitta" className="public-brand"><span className="tenant-logo" style={{width:30,height:30}}>IV</span>Instituto Vitta</Link><span>Rio de Janeiro · Cuidado multidisciplinar</span><Link to="/">Uma plataforma Brothers Digital</Link></footer></main>
}

function Workspace({ session, onLogout, notify, openModal, appointmentsRevision }: { session: Session; onLogout: () => void; notify: (text: string) => void; openModal: OpenModal; appointmentsRevision: number }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = session.profile === 'admin'
  const isProfessional = session.profile === 'professional'
  const membershipRole = session.memberships.find((item) => item.tenantId === session.tenantId)?.role
  const isClinicAdministrator = membershipRole === 'ClinicAdministrator'
  const tenantName = session.tenantName || 'Sua clínica'
  const tenantInitials = tenantName.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Visão geral')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const path = location.pathname
  const navGroups = isAdmin ? adminNav : isProfessional ? professionalNav : isClinicAdministrator ? clinicalNav : clinicalNav.map((group) => ({ ...group, items: group.items.filter(([href]) => href !== '/app/disponibilidade') }))
  const allowed = isAdmin ? path.startsWith('/admin') : isProfessional ? ['/app/minha-agenda','/app/minha-disponibilidade','/app/meus-pacientes','/app/meus-atendimentos','/app/minhas-evolucoes','/app/documentos'].includes(path) : path.startsWith('/app/')
  useEffect(() => { if (!allowed) navigate(isAdmin ? '/admin' : isProfessional ? '/app/minha-agenda' : clinicPath, { replace: true }) }, [allowed, isAdmin, isProfessional, navigate])
  useEffect(() => {
    setLoading(true)
    const timeout = window.setTimeout(() => setLoading(false), 180)
    return () => window.clearTimeout(timeout)
  }, [path])
  const title = routeLabels[path] || (path.startsWith('/app/pacientes/') ? 'Perfil do paciente' : path.startsWith('/app/profissionais/') ? 'Perfil profissional' : 'Detalhes')
  const menuIcon = (Icon: typeof LayoutDashboard) => <Icon />
  const mobileLinks = isProfessional ? professionalNav[0].items.slice(0,4) : clinicalNav[1].items.slice(0,4)
  return <div className="app-shell">
    <aside className={`sidebar ${collapsed?'collapsed':''} ${mobileOpen?'mobile-open':''}`}><Link to={isAdmin?'/admin':clinicPath} className="brand"><span className="brand-mark"><HeartPulse size={18}/></span>{!collapsed&&<span className="brand-text">brothers care</span>}</Link>{!isAdmin&&<button className="tenant-switch" onClick={()=>notify(tenantName)}><span className="tenant-logo">{tenantInitials}</span>{!collapsed&&<><span className="tenant-copy"><strong>{tenantName}</strong><small>{isProfessional?'Seu espaço profissional':'Clínica ativa'}</small></span><ChevronDown size={13}/></>}</button>}{navGroups.map((group)=><div key={group.label}><div className="nav-label">{!collapsed&&group.label}</div><nav className="side-nav">{group.items.map(([href,label,Icon])=><Link key={String(href)} to={href as string} onClick={()=>setMobileOpen(false)} className={`nav-link ${path===href?'active':''}`} title={collapsed?label as string:undefined}>{menuIcon(Icon as typeof LayoutDashboard)}{!collapsed&&<span>{label as string}</span>}</Link>)}</nav></div>)}<div className="side-bottom"><button className="collapse-btn" onClick={()=>setCollapsed(!collapsed)}><PanelLeftClose size={15}/>{!collapsed&&<span>Recolher menu</span>}</button></div></aside>
    <div className="main-area"><header className="topbar"><div style={{display:'flex',alignItems:'center',gap:10}}><button className="icon-button mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Abrir menu"><Menu /></button><div className="breadcrumbs"><span>{isAdmin?'Brothers Care':tenantName}</span><ChevronRight size={12}/><strong>{title}</strong></div></div><div className="top-actions"><button className="icon-button" onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true}))} aria-label="Buscar"><Search/></button><button className="icon-button command-trigger" onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true}))} title="Busca rápida"><Command/></button><button className="icon-button" onClick={()=>notify('Você está em dia. Não há novas notificações.')} aria-label="Notificações"><Bell/><i className="notification-dot"/></button><span className="top-divider"/><AccountMenu name={session.name} email={session.username} role={isAdmin?'Super Admin':isProfessional?'Profissional':membershipRole==='Receptionist'?'Recepção':'Administradora'} onLogout={onLogout} onPasswordChanged={onLogout} /></div></header>
      <main className="content"><PageHeading title={title} path={path} tenantName={tenantName} notify={notify} openModal={openModal} professional={session.profile === 'professional'} />{loading?<PageSkeleton/>:isAdmin?<AdminContent path={path} query={query} setQuery={setQuery} notify={notify} />:<ClinicContent path={path} session={session} activeTab={activeTab} setActiveTab={setActiveTab} query={query} setQuery={setQuery} notify={notify} appointmentsRevision={appointmentsRevision} />}</main>
    </div>
    {!isAdmin&&<nav className="mobile-bottom">{mobileLinks.map(([href,label,Icon])=><Link key={String(href)} to={href as string} className={path===href?'active':''}>{menuIcon(Icon as typeof LayoutDashboard)}<span>{label as string}</span></Link>)}</nav>}
  </div>
}

function PageHeading({ title, path, tenantName, notify, openModal, professional }: { title: string; path: string; tenantName: string; notify: (text: string) => void; openModal: OpenModal; professional: boolean }) {
  const isDashboard = path === clinicPath || path === '/admin'
  const isAgenda = path.includes('agenda')
  const isAvailability = path.includes('disponibilidade')
  const isEvolution = path.includes('evolu')
  const isPatientProfile = path.startsWith('/app/pacientes/')
  const subtitle = isAvailability ? professional ? 'Configure sua jornada semanal e seus períodos de bloqueio ou férias.' : 'Gerencie as jornadas e os períodos de bloqueio ou férias dos profissionais.' : path === '/admin/pre-cadastros' ? 'Acompanhe convites e cadastros pendentes das clínicas.' : isDashboard ? path === '/admin' ? 'Acompanhe a saúde de toda a operação Brothers Care.' : `Uma visão clara da operação de ${tenantName}.` : isAgenda ? 'Organize atendimentos, equipe e rotina em um só lugar.' : isEvolution ? 'Registros clínicos organizados para acompanhar cada conquista.' : isPatientProfile ? 'Histórico e informações do cuidado em um só lugar.' : `Gerencie ${title.toLocaleLowerCase('pt-BR')} de ${tenantName}.`
  let action: ReactNode = <button className="button button-outline" onClick={() => notify('Relatório preparado para exportação.')}><ArrowDownLeft />Exportar</button>
  if (path === '/admin' || path === '/admin/pre-cadastros') action = null
  else if (isAvailability) action = null
  else if ((path === '/app/minha-agenda' && professional) || path === '/app/agenda') action = <button className="button button-primary" onClick={() => openModal({ title: 'Novo agendamento', content: '', kind: 'appointment' })}><Plus />Novo agendamento</button>
  else if (isAgenda) action = null
  else if (isDashboard) action = <button className="button button-primary" onClick={() => openModal({ title: 'Novo atendimento', content: 'Selecione paciente, profissional, modalidade e horário para adicionar um atendimento à agenda.' })}><Plus />Novo atendimento</button>
  else if (isEvolution) action = <button className="button button-primary" onClick={() => document.getElementById('evolution-patient')?.focus()}><Plus />Nova evolução</button>
  else if (path === '/app/pacientes') action = <button className="button button-primary" onClick={() => openModal({ title: 'Cadastrar paciente', content: 'Preencha os dados do paciente para iniciar o acompanhamento na clínica.', kind: 'patient' })}><Plus />Novo paciente</button>
  else if (path === '/app/profissionais') action = <button className="button button-primary" onClick={() => window.dispatchEvent(new Event('professionals:create'))}><Plus />Novo profissional</button>
  return <div className="page-heading"><div><div className="eyebrow">{path.startsWith('/admin') ? 'PAINEL SAAS · BROTHERS DIGITAL' : path.includes('minha') || path.includes('meu') ? `ÁREA PROFISSIONAL · ${tenantName}` : `OPERAÇÃO CLÍNICA · ${tenantName}`}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}

function PageSkeleton() { return <div className="skeleton-grid" aria-label="Carregando conteúdo"><div className="skeleton-row"><i/><i/><i/><i/></div><div className="skeleton-main"><i/><i/></div><div className="skeleton-row"><i/><i/></div></div> }

function Kpi({ label, value, note, icon: Icon, tone = 'teal' }: { label: string; value: string; note?: ReactNode; icon: typeof Users; tone?: string }) { return <article className="card kpi-card"><div className="kpi-top"><span>{label}</span><span className="kpi-icon" style={tone==='coral'?{background:'#fff0eb',color:'#c76a56'}:tone==='blue'?{background:'#edf3fb',color:'#6686b1'}:undefined}><Icon/></span></div><div className="kpi-value">{value}</div>{note&&<div className="kpi-note">{note}</div>}</article> }

function ClinicContent({ path, session, activeTab, setActiveTab, query, setQuery, notify, appointmentsRevision }: { path: string; session: Session; activeTab: string; setActiveTab: (tab: string) => void; query: string; setQuery: (query: string) => void; notify: (text: string) => void; appointmentsRevision: number }) {
  if (path===clinicPath) return <><WelcomeTeamCard tenantName={session.tenantName}/><ClinicDashboard notify={notify}/></>
  if (path==='/app/minha-agenda') return <AppointmentAgendaPage viewerRole="professional" appointmentsRevision={appointmentsRevision}/>
  if (path === '/app/minha-disponibilidade') return <ProfessionalAvailabilityPage viewerRole="professional"/>
  if (path === '/app/disponibilidade') {
    const membershipRole = session.memberships.find((item) => item.tenantId === session.tenantId)?.role
    return membershipRole === 'ClinicAdministrator'
      ? <ProfessionalAvailabilityPage viewerRole="clinicAdministrator"/>
      : <div className="card availability-card" role="alert">Você não tem permissão para gerenciar a disponibilidade dos profissionais.</div>
  }
  if (path==='/app/agenda'||path==='/app/meus-atendimentos') {
    const membershipRole = session.memberships.find((item) => item.tenantId === session.tenantId)?.role
    const viewerRole = session.profile === 'professional'
      ? 'professional'
      : membershipRole === 'ClinicAdministrator' || membershipRole === 'Receptionist'
        ? 'clinicAdministrator'
        : 'unsupported'
    return <AppointmentAgendaPage viewerRole={viewerRole} appointmentsRevision={appointmentsRevision}/>
  }
  if (path==='/app/pacientes'||path==='/app/meus-pacientes') return <RealPatientsPage query={query} setQuery={setQuery} professional={session.profile==='professional'}/>
  if (path.startsWith('/app/pacientes/')) return <PatientDetail activeTab={activeTab} setActiveTab={setActiveTab} />
  if (path==='/app/profissionais') return <ProfessionalsManagementPage query={query} setQuery={setQuery}/>
  if (path.startsWith('/app/profissionais/')) return <ProfessionalDetail />
  if (path==='/app/evolucoes'||path==='/app/minhas-evolucoes') return <ClinicalRecordsPage />
  if (path==='/app/financeiro') return <FinancePage notify={notify}/>
  if (path==='/app/comunicacao') return <CommunicationPage />
  if (path==='/app/auditoria') return <AuditPage />
  if (path==='/app/relatorios') return <ReportsPage notify={notify}/>
  if (path==='/app/convenios') return <PlansPage />
  if (path==='/app/usuarios') return <TeamPage />
  if (path==='/app/configuracoes') return <SettingsPage notify={notify}/>
  if (path==='/app/documentos') return <DocumentsPage />
  return <ClinicDashboard notify={notify}/>
}

function ClinicDashboard({ notify }: { notify: (text: string) => void }) {
  const [workspaceSummary, setWorkspaceSummary] = useState<WorkspaceSummary | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  useEffect(() => { getWorkspaceSummary().then(setWorkspaceSummary).catch(() => notify('Não foi possível atualizar o início da clínica.')).finally(() => setWorkspaceLoading(false)) }, [])
  if (workspaceLoading) return <PageSkeleton/>
  if (workspaceSummary && workspaceSummary.appointments === 0) return <ClinicGettingStarted summary={workspaceSummary}/>
  const pieData = [{name:'Terapia Ocupacional',value:36,color:'#25c6a5'},{name:'Fisioterapia',value:27,color:'#79bfc0'},{name:'Fonoaudiologia',value:18,color:'#f0b35d'},{name:'Psicologia',value:12,color:'#e5806d'},{name:'Outros',value:7,color:'#9c9fb9'}]
  return <><div className="grid kpi-grid"><Kpi label="Pacientes ativos" value="186" note="↑ 8 novos este mês" icon={Users}/><Kpi label="Profissionais" value={String(professionals.length)} note="Equipe multidisciplinar" icon={Stethoscope} tone="blue"/><Kpi label="Atendimentos hoje" value="31" note="6 próximos na agenda" icon={CalendarDays}/><Kpi label="Atendimentos no mês" value="742" note={<><span className="up">↑ 3,6%</span> vs. mês anterior</>} icon={ClipboardCheck}/><Kpi label="Taxa de conclusão" value="94,6%" note="Meta mensal: 92%" icon={CheckCircle2}/><Kpi label="Faturamento previsto" value="R$ 78.450" note="Setembro · fechamento em andamento" icon={CircleDollarSign}/><Kpi label="Evoluções pendentes" value="7" note="2 aguardando revisão" icon={FileText} tone="coral"/><Kpi label="Pendências financeiras" value="12" note="R$ 4.280 em conferência" icon={AlertCircle} tone="coral"/></div><div className="grid dashboard-grid"><div className="card chart-card"><div className="card-heading"><div><h2>Atendimentos realizados</h2><p>Volume mensal da clínica</p></div><div className="chart-legend"><i/>Atendimentos</div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyAppointments} margin={{top:8,right:5,left:-22,bottom:0}}><defs><linearGradient id="appointmentsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#21d5b2" stopOpacity={.24}/><stop offset="90%" stopColor="#21d5b2" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf1f2" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'#93a0a5'}} dy={8}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:9,fill:'#a1adb0'}}/><Tooltip contentStyle={{border:'1px solid #e7eeee',borderRadius:8,fontSize:10,boxShadow:'0 8px 20px #193a3015'}}/><Area type="monotone" dataKey="value" stroke="#25c4a3" strokeWidth={2.5} fill="url(#appointmentsGradient)" activeDot={{r:5,fill:'#25c4a3',stroke:'white',strokeWidth:2}}/></AreaChart></ResponsiveContainer></div></div><div className="side-stack"><div className="card distribution"><div className="card-heading"><div><h2>Atendimentos por especialidade</h2><p>Distribuição no mês</p></div><button className="icon-button" onClick={()=>notify('Distribuição atualizada')}><MoreHorizontal/></button></div><div style={{display:'flex',alignItems:'center',gap:14}}><div style={{width:112,height:112,flex:'none'}}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" innerRadius={34} outerRadius={51} paddingAngle={3} stroke="none">{pieData.map((entry)=><Cell key={entry.name} fill={entry.color}/>)}</Pie><Tooltip formatter={(value)=>`${value}%`} contentStyle={{fontSize:10,borderRadius:7}}/></PieChart></ResponsiveContainer></div><div className="distribution-list" style={{margin:0,flex:1}}>{pieData.map((item)=><div className="distribution-row" key={item.name}><span className="distribution-label"><i className="dot" style={{background:item.color}}/>{item.name}</span><span className="distribution-value">{item.value}%</span></div>)}</div></div></div><ActivityCard/></div></div><div className="card appointments-card" style={{marginTop:15}}><div className="card-heading"><div><h2>Próximos atendimentos</h2><p>Quarta-feira, 15 de outubro</p></div><Link className="link-button" to="/app/agenda">Ver agenda completa <ArrowRight size={12}/></Link></div><AppointmentList compact/></div></>
}

function ActivityCard() { const activity=[['evolução finalizada','Ana Souza finalizou evolução de Regina Oliveira','Há 12 min'],['novo paciente','Helena Costa foi cadastrada pela recepção','Há 38 min'],['atendimento realizado','Juliana Mendes concluiu sessão de José Almeida','Há 1 h']];return <div className="card activity-card"><div className="card-heading"><div><h2>Atividade recente</h2><p>Atualizações da equipe</p></div></div><div className="activity-list">{activity.map(([title,copy,time],index)=><div className="activity-item" key={title}><span className="activity-icon">{index===0?<FileText/>:index===1?<UserRound/>:<CheckCircle2/>}</span><div className="activity-copy"><strong>{title}</strong><br/>{copy}<small>{time}</small></div></div>)}</div></div> }

function AppointmentList({ compact = false }: {
  compact?: boolean
  professional?: boolean
  onSelect?: (patient: string) => void
}) {
  return <div className={`empty-state ${compact ? 'appointment-empty' : ''}`}>
    <p>Consulte a agenda para visualizar os horários carregados da empresa.</p>
    <Link className="link-button" to="/app/agenda">Ver agenda</Link>
  </div>
}

function TableToolbar({ query, setQuery, placeholder, children }: { query: string; setQuery: (value:string)=>void; placeholder:string; children?:React.ReactNode }) { return <div className="table-toolbar"><label className="searchbox"><Search/><input placeholder={placeholder} value={query} onChange={(event)=>setQuery(event.target.value)}/></label><div className="filter-actions">{children}<button className="button button-outline"><Filter/>Filtros</button></div></div> }

function RealPatientsPage({ query, setQuery, professional }: { query:string; setQuery:(value:string)=>void; professional:boolean }) {
  const [result, setResult] = useState<{ items: PatientListItem[]; totalItems: number }>({ items: [], totalItems: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<PatientListItem | null>(null)
  const [deactivating, setDeactivating] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = () => {
      setLoading(true)
      listPatients(query, 1, 100)
        .then((page) => { if (active) { setResult(page); setError('') } })
        .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os pacientes.') })
        .finally(() => { if (active) setLoading(false) })
    }
    const timer = window.setTimeout(load, 250)
    window.addEventListener('patients:changed', load)
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener('patients:changed', load) }
  }, [query])

  const age = (birthDate: string) => {
    const birth = new Date(`${birthDate}T12:00:00`)
    const today = new Date()
    let value = today.getFullYear() - birth.getFullYear()
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) value--
    return value
  }
  const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  async function deactivate(patient: PatientListItem) {
    if (!window.confirm(`Desativar ${patient.fullName}? O histórico será preservado.`)) return
    setDeactivating(patient.id)
    try {
      await deactivatePatient(patient.id)
      window.dispatchEvent(new Event('patients:changed'))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível desativar o paciente.')
    } finally {
      setDeactivating(null)
    }
  }

  if (professional) return <><div className="grid kpi-grid" style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}><Kpi label="Meus pacientes" value={String(result.totalItems)} note="Vínculos assistenciais ativos" icon={Users}/><Kpi label="Pacientes ativos" value={String(result.items.filter((item)=>item.status==='Active').length)} note="Na página atual" icon={UserRound}/><Kpi label="Em acompanhamento" value={String(result.items.filter((item)=>item.professionalId).length)} note="Somente leitura" icon={Stethoscope}/></div><section className="card table-card"><TableToolbar query={query} setQuery={setQuery} placeholder="Buscar meus pacientes por nome ou convênio..."/><div className="table-wrap"><table className="patients-readonly-table"><thead><tr><th>Paciente</th><th>Idade</th><th>Convênio</th><th>Profissional</th><th>Última evolução</th><th>Próxima visita</th><th>Status</th></tr></thead><tbody>{result.items.map((patient)=><tr key={patient.id}><td><span className="person-cell"><span className="avatar small">{initials(patient.fullName)}</span><strong>{patient.fullName}</strong></span></td><td>{age(patient.birthDate)} anos</td><td>{patient.healthPlan || 'Não informado'}</td><td>{patient.professionalName || 'Sem vínculo'}</td><td>—</td><td>—</td><td><span className={`status ${patient.status==='Inactive'?'status-inativo':'status-ativo'}`}>{patient.status==='Inactive'?'Inativo':'Ativo'}</span></td></tr>)}</tbody></table>{loading&&<div className="empty-state"><p>Carregando pacientes...</p></div>}{!loading&&!error&&result.items.length===0&&<div className="empty-state"><Search/><h3>Nenhum paciente associado</h3><p>Os pacientes aparecerão aqui quando um administrador criar o vínculo assistencial.</p></div>}{error&&<div className="empty-state"><AlertCircle/><h3>Não foi possível carregar</h3><p>{error}</p></div>}</div><div className="table-footer"><span>Mostrando {result.items.length} de {result.totalItems} pacientes associados</span></div></section></>

  return <><div className="grid kpi-grid" style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}><Kpi label="Pacientes cadastrados" value={String(result.totalItems)} note="Dados reais da empresa ativa" icon={Users}/><Kpi label="Pacientes ativos" value={String(result.items.filter((item)=>item.status==='Active').length)} note="Na página atual" icon={UserRound}/><Kpi label="Com profissional" value={String(result.items.filter((item)=>item.professionalId).length)} note="Vínculo de cuidado ativo" icon={Stethoscope}/></div><section className="card table-card"><TableToolbar query={query} setQuery={setQuery} placeholder="Buscar paciente por nome ou convênio..."/><div className="table-wrap"><table><thead><tr><th>Paciente</th><th>Idade</th><th>Convênio</th><th>Profissional</th><th>Última evolução</th><th>Próxima visita</th><th>Status</th><th>Ações</th></tr></thead><tbody>{result.items.map((patient)=><tr key={patient.id}><td><span className="person-cell"><span className="avatar small">{initials(patient.fullName)}</span><strong>{patient.fullName}</strong></span></td><td>{age(patient.birthDate)} anos</td><td>{patient.healthPlan || 'Não informado'}</td><td>{patient.professionalName || 'Sem vínculo'}</td><td>—</td><td>—</td><td><span className={`status ${patient.status==='Inactive'?'status-inativo':'status-ativo'}`}>{patient.status==='Inactive'?'Inativo':'Ativo'}</span></td><td><div className="filter-actions"><button className="link-button" onClick={()=>setEditing(patient)}>Editar</button>{patient.status!=='Inactive'&&<button className="link-button" disabled={deactivating===patient.id} onClick={()=>deactivate(patient)}>{deactivating===patient.id?'Desativando...':'Desativar'}</button>}</div></td></tr>)}</tbody></table>{loading&&<div className="empty-state"><p>Carregando pacientes...</p></div>}{!loading&&!error&&result.items.length===0&&<div className="empty-state"><Search/><h3>Nenhum paciente encontrado</h3><p>Cadastre o primeiro paciente ou ajuste sua busca.</p></div>}{error&&<div className="empty-state"><AlertCircle/><h3>Não foi possível carregar</h3><p>{error}</p></div>}</div><div className="table-footer"><span>Mostrando {result.items.length} de {result.totalItems} pacientes</span></div></section>{editing&&<Modal title="Editar paciente" onClose={()=>setEditing(null)}><PatientForm patient={editing} onDone={(_patient)=>{setEditing(null);window.dispatchEvent(new Event('patients:changed'));setError('')}}/></Modal>}</>
}

function ProfessionalsPage({ query, setQuery }: { query:string; setQuery:(value:string)=>void }) { const list=professionals.filter((person)=>person.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))||person.specialty.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));return <><div className="grid kpi-grid" style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}><Kpi label="Profissionais ativos" value={String(professionals.filter((person)=>person.status==='Ativo').length)} note="Equipe multidisciplinar" icon={Stethoscope}/><Kpi label="Atendimentos no mês" value="742" note="Média de 31 por profissional" icon={ClipboardCheck}/><Kpi label="Agenda ocupada" value="86%" note="Disponibilidade desta semana" icon={CalendarDays}/></div><section className="card table-card"><TableToolbar query={query} setQuery={setQuery} placeholder="Buscar por profissional ou especialidade..."><select className="select-mini"><option>Todas as especialidades</option><option>Fisioterapia</option><option>Terapia Ocupacional</option></select></TableToolbar><div className="table-wrap"><table><thead><tr><th>Profissional</th><th>Especialidade</th><th>Agenda</th><th>Pacientes</th><th>Atendimentos do mês</th><th>Status</th><th></th></tr></thead><tbody>{list.map((person)=><tr key={person.id}><td><Link to={`/app/profissionais/${person.id}`} className="person-cell"><span className="avatar small" style={{background:person.color}}>{person.initials}</span><strong>{person.name}</strong></Link></td><td>{person.specialty}</td><td><span className="status status-bom">Disponível</span></td><td>{person.patients}</td><td>{person.appointments}</td><td><span className={`status ${person.status==='Ativo'?'status-ativo':'status-atenção'}`}>{person.status}</span></td><td><Link to={`/app/profissionais/${person.id}`} className="link-button">Abrir</Link></td></tr>)}</tbody></table></div><div className="table-footer"><span>{professionals.length} profissionais na equipe</span><Pagination/></div></section></> }

export { ProfessionalsPage as LegacyProfessionalsPage }

function Pagination() { return <div className="pagination"><button aria-label="Página anterior"><ChevronLeft size={13}/></button><button className="active">1</button><button>2</button><button>3</button><button aria-label="Próxima página"><ChevronRight size={13}/></button></div> }

function PatientDetail({ activeTab, setActiveTab }: { activeTab:string; setActiveTab:(tab:string)=>void }) {
  const patientId = Number(window.location.pathname.split('/').pop()) || 1
  const patient = patients[patientId - 1] || patients[0]
  const tabs = ['Visão geral', 'Evoluções', 'Atendimentos', 'Documentos', 'Financeiro', 'Comunicações']
  return <>
    <div className="card" style={{padding:20,marginBottom:17,display:'flex',alignItems:'center',gap:15,flexWrap:'wrap'}}>
      <span className="avatar" style={{width:52,height:52,fontSize:15,background:patient.color}}>{patient.initials}</span>
      <div style={{flex:1}}><h2 style={{font:'700 17px Manrope',color:'#193649',margin:'0 0 6px'}}>{patient.name}</h2><span style={{fontSize:10,color:'#829297'}}>{patient.age} anos · {patient.plan} · Acompanhamento desde março de 2025</span></div>
      <span className="status status-ativo">{patient.status}</span>
      <button className="button button-outline"><MoreHorizontal/>Ações</button>
    </div>
    <div className="tabs">{tabs.map((tab)=><button className={`tab ${activeTab===tab?'active':''}`} key={tab} onClick={()=>setActiveTab(tab)}>{tab}</button>)}</div>
    {activeTab==='Visão geral'?<div className="two-col"><div className="card card-pad"><h2 className="section-title">Resumo do acompanhamento</h2><p style={{fontSize:11,lineHeight:1.7,color:'#6b7e86',marginTop:12}}>Paciente em acompanhamento de terapia ocupacional, com foco em autonomia nas atividades de vida diária e participação social.</p><div className="grid" style={{gridTemplateColumns:'1fr 1fr',marginTop:16}}><Detail label="Profissional responsável" value={patient.professional}/><Detail label="Próxima visita" value={patient.nextVisit}/><Detail label="Última evolução" value={patient.lastNote}/><Detail label="Plano terapêutico" value="Ativo · revisão em 30 dias"/></div></div><div className="card card-pad"><h2 className="section-title">Próximos atendimentos</h2><AppointmentList compact/></div></div>:activeTab==='Evoluções'?<EvolutionTimeline filterPatient={patient.name}/>:<div className="card empty-state"><FileText/><h3>{activeTab} de {patient.name}</h3><p>As informações serão exibidas nesta seção conforme forem registradas.</p></div>}
  </>
}
function Detail({label,value}:{label:string;value:string}){return <div><div className="eyebrow">{label}</div><div style={{fontSize:11,color:'#304b5a',fontWeight:600}}>{value}</div></div>}
function ProfessionalDetail(){const id=Number(window.location.pathname.split('/').pop())||1;const person=professionals.find((entry)=>entry.id===id)||professionals[0];const startDate=person.startDate?new Date(`${person.startDate}T12:00:00`).toLocaleDateString('pt-BR',{dateStyle:'long'}):'12 de março de 2023';return <><div className="card" style={{padding:20,display:'flex',alignItems:'center',gap:15,marginBottom:16}}><span className="avatar" style={{width:52,height:52,background:person.color}}>{person.initials}</span><div style={{flex:1}}><h2 style={{font:'700 17px Manrope',margin:'0 0 5px',color:'#193649'}}>{person.name}</h2><span style={{fontSize:10,color:'#829297'}}>{person.specialty} · Instituto Vitta</span></div><span className="status status-ativo">{person.status}</span><button className="button button-outline"><MoreHorizontal/>Ações</button></div><div className="grid kpi-grid" style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}><Kpi label="Pacientes ativos" value={String(person.patients)} note="Acompanhamento atual" icon={Users}/><Kpi label="Atendimentos no mês" value={String(person.appointments)} note="Setembro de 2026" icon={ClipboardCheck}/><Kpi label="Agenda ocupada" value="88%" note="Disponibilidade semanal" icon={CalendarDays}/></div><div className="grid two-col"><div className="card appointments-card"><div className="card-heading"><div><h2>Próximos atendimentos</h2><p>Agenda desta semana</p></div></div><AppointmentList professional/></div><div className="card card-pad"><h2 className="section-title">Dados profissionais</h2><div className="grid" style={{gap:18,marginTop:17}}><Detail label="Especialidade" value={person.specialty}/><Detail label="Conselho profissional" value={person.license||'CREFITO-2 · 18452-TO'}/><Detail label="E-mail" value={person.email||`${person.name.toLowerCase().replace(' ','.')}@institutovitta.com.br`}/><Detail label="Telefone" value={person.phone||'Não informado'}/><Detail label="Disponibilidade semanal" value={person.workload||'Horários flexíveis'}/><Detail label="Início na clínica" value={startDate}/></div></div></div></>}
