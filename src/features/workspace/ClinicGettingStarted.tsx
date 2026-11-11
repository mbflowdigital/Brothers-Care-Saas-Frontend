import { ArrowRight, CalendarDays, Check, Clock3, Sparkles, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
export type WorkspaceSummary = { teamMembers: number; patients: number; appointments: number }

export async function getWorkspaceSummary(): Promise<WorkspaceSummary> {
  const response = await fetch(`${apiBaseUrl}/workspace/summary`, { credentials: 'include', cache: 'no-store' })
  if (!response.ok) throw new Error('Não foi possível carregar o início da clínica.')
  return response.json() as Promise<WorkspaceSummary>
}

export function ClinicGettingStarted({ summary }: { summary: WorkspaceSummary }) {
  const steps = [
    { title: 'Monte sua equipe', copy: 'Convide profissionais e recepção para trabalhar com você.', done: summary.teamMembers > 1, icon: UserPlus, href: '/app/usuarios', action: 'Convidar equipe' },
    { title: 'Cadastre o primeiro paciente', copy: 'Comece com os dados essenciais. Você completa depois.', done: summary.patients > 0, icon: Users, href: '/app/pacientes', action: 'Cadastrar paciente' },
    { title: 'Configure os horários', copy: 'Defina quando sua clínica e profissionais atendem.', done: false, icon: Clock3, href: '/app/configuracoes', action: 'Configurar horários' },
    { title: 'Crie o primeiro atendimento', copy: 'Com paciente e equipe prontos, sua agenda ganha vida.', done: summary.appointments > 0, icon: CalendarDays, href: '/app/agenda', action: 'Criar atendimento' },
  ]
  const completed = steps.filter((step) => step.done).length
  return <div className="getting-started"><section className="getting-hero"><div><span className="team-kicker"><Sparkles /> Seu ponto de partida</span><h2>Sua clínica está pronta.<br/>Vamos dar vida à operação?</h2><p>Não existe uma configuração enorme esperando por você. Faça um passo por vez, na ordem que fizer sentido.</p><div className="getting-progress"><div><span style={{ width: `${completed * 25}%` }}/></div><small>{completed} de 4 passos concluídos</small></div></div><div className="getting-illustration"><span className="getting-calendar"><CalendarDays /></span><i/><i/><i/></div></section>
    <section className="getting-layout"><div><div className="getting-heading"><div><h2>Próximos passos</h2><p>Uma jornada curta para começar a atender.</p></div><span>{completed}/4</span></div><div className="getting-steps">{steps.map(({ title, copy, done, icon: Icon, href, action }, index) => <article className={done ? 'done' : ''} key={title}><span className="getting-number">{done ? <Check /> : index + 1}</span><span className="getting-step-icon"><Icon /></span><div><h3>{title}</h3><p>{copy}</p></div>{done ? <strong>Concluído</strong> : <Link to={href}>{action}<ArrowRight /></Link>}</article>)}</div></div>
      <aside className="getting-empty"><span><CalendarDays /></span><h3>Sua agenda começa limpa</h3><p>Os próximos atendimentos aparecerão aqui assim que você criar o primeiro.</p><div><small>Hoje</small><strong>Nenhum atendimento agendado</strong></div><Link className="button button-outline" to="/app/agenda">Conhecer a agenda <ArrowRight /></Link></aside>
    </section></div>
}
