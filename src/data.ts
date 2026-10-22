export type Profile = 'admin' | 'clinic' | 'professional'
export type Professional = { id: number; name: string; specialty: string; patients: number; appointments: number; status: string; initials: string; color: string; email?: string; phone?: string; license?: string; workload?: string; startDate?: string }
export type Patient = { id: number; name: string; age: number; plan: string; professional: string; lastNote: string; nextVisit: string; status: string; initials: string; color: string }

const colors = ['#d8eee8', '#f6e3d6', '#dce7f5', '#f1e7bb', '#eeddf0', '#dce9dc']
const professionalSeed = [
  ['Ana Souza', 'Terapeuta Ocupacional'], ['Fernanda Rocha', 'Terapeuta Ocupacional'], ['Juliana Mendes', 'Fisioterapeuta'], ['Rafael Costa', 'Fonoaudiólogo'], ['Carlos Lima', 'Fisioterapeuta'], ['Patrícia Alves', 'Psicóloga'],
  ['Mariana Freitas', 'Fonoaudióloga'], ['Bruno Martins', 'Fisioterapeuta'], ['Camila Ribeiro', 'Terapeuta Ocupacional'], ['Lucas Ferreira', 'Psicólogo'], ['Beatriz Nunes', 'Fisioterapeuta'], ['Eduardo Barros', 'Fonoaudiólogo'],
  ['Letícia Carvalho', 'Terapeuta Ocupacional'], ['Gustavo Moreira', 'Fisioterapeuta'], ['Isabela Cardoso', 'Psicóloga'], ['Thiago Azevedo', 'Fonoaudiólogo'], ['Renata Oliveira', 'Fisioterapeuta'], ['Diego Monteiro', 'Terapeuta Ocupacional'],
  ['Aline Teixeira', 'Psicóloga'], ['Vinícius Lopes', 'Fisioterapeuta'], ['Clara Batista', 'Fonoaudióloga'], ['Marcelo Dias', 'Terapeuta Ocupacional'], ['Sofia Pereira', 'Fisioterapeuta'], ['Pedro Gomes', 'Psicólogo'],
]
export const professionals: Professional[] = professionalSeed.map(([name, specialty], index) => ({
  id: index + 1, name, specialty, patients: [12, 10, 14, 9, 11, 8][index % 6] + (index < 6 ? 0 : index % 4), appointments: [74, 68, 81, 62, 71, 56][index % 6], status: index === 19 ? 'Férias' : 'Ativo', initials: name.split(' ').map((part) => part[0]).slice(0, 2).join(''), color: colors[index % colors.length],
}))

const patientNames = ['Regina Oliveira', 'José Almeida', 'Carlos Mendes', 'Helena Costa', 'Marta Rodrigues', 'Antônio Nogueira', 'Laura Campos', 'Pedro Henrique', 'Sônia Martins', 'Miguel Santos', 'Cláudia Ribeiro', 'Roberto Lima', 'Lúcia Ferreira', 'Davi Carvalho', 'Teresa Alves', 'Paulo Azevedo', 'Marina Lopes', 'Cecília Barros', 'João Pedro', 'Elisa Moreira']
const patientPlans = ['Saúde Prime', 'Vida Integral', 'BemEstar Saúde', 'Plena Assist', 'Particular']
export const patients: Patient[] = patientNames.map((name, index) => ({
  id: index + 1, name, age: [68, 72, 54, 61, 77, 65, 8, 12, 59, 7, 63, 71, 48, 9, 80, 66, 56, 10, 5, 69][index], plan: patientPlans[index % patientPlans.length], professional: index < 12 ? professionals[0].name : professionals[(index - 11) % professionals.length].name, lastNote: `${index % 3 + 1} dias atrás`, nextVisit: ['Hoje, 14:30', 'Amanhã, 09:00', '17 out, 10:00'][index % 3], status: index === 17 ? 'Inativo' : 'Em acompanhamento', initials: name.split(' ').map((part) => part[0]).slice(0, 2).join(''), color: colors[(index + 2) % colors.length],
}))

export const evolutions = Array.from({ length: 15 }, (_, index) => ({
  id: index + 1, patient: patients[index].name, professional: professionals[index % 6].name, date: `2026-10-${String(15 - (index % 12)).padStart(2, '0')}`, specialty: professionals[index % 6].specialty,
  objective: index === 0 ? 'Treino de autonomia em atividades de vida diária.' : ['Ampliar autonomia nas atividades cotidianas.', 'Desenvolver coordenação motora e equilíbrio.', 'Estimular comunicação funcional e interação.'][index % 3],
  intervention: 'Atividades funcionais de coordenação, rotina e tarefas do cotidiano.', response: index % 4 === 1 ? 'Participação consistente, com necessidade de pausas.' : 'Boa participação e evolução dentro do esperado.', next: 'Manter plano terapêutico e reavaliar na próxima sessão.', status: index < 7 ? 'Finalizada' : 'Rascunho',
}))

const tenantNames = ['Instituto Vitta Reabilitação', 'Clínica Horizonte', 'Espaço Reabilitar', 'Nexus Terapias', 'Centro Evoluir', 'Clínica Nova Vida', 'Movimento Saúde', 'Instituto Avançar', 'Clínica Bem Viver', 'Cuidar em Casa', 'Viva Pleno', 'Equilíbrio Terapias', 'Clínica Integra', 'Reabilitar Mais', 'Instituto Acolher', 'Clínica Ser', 'Espaço Plural', 'Instituto Caminhos', 'Clínica Florescer', 'Viver Bem Terapias', 'Centro Recomeço', 'Instituto Essencial', 'Clínica Travessia', 'Movimento e Vida', 'Espaço Aquarela', 'Instituto Conectar']
export const tenants = tenantNames.map((name, index) => ({
  name,
  plan: index === 0 || (index >= 9 && index <= 22) ? 'Professional' : index >= 23 ? 'Enterprise' : 'Starter',
  professionals: index === 0 ? 24 : index <= 6 ? 11 : 12,
  patients: index === 0 ? 186 : index <= 10 ? 107 : 106,
  mrr: index === 0 || (index >= 9 && index <= 22) ? 799 : index >= 23 ? [2500, 2500, 2563][index - 23] : 299,
  status: index === 13 ? 'Atenção' : 'Ativo',
  health: ['Excelente', 'Bom', 'Excelente', 'Bom', 'Atenção'][index % 5],
  access: `${String(15 - index % 4).padStart(2, '0')} out, ${['09:42', '08:16', 'ontem', '11:28'][index % 4]}`,
}))

export const appointments = [
  { time: '08:00', patient: 'Regina Oliveira', professional: 'Ana Souza', type: 'Terapia Ocupacional', status: 'Realizado', place: 'Clínica' },
  { time: '09:00', patient: 'José Almeida', professional: 'Juliana Mendes', type: 'Fisioterapia', status: 'Realizado', place: 'Clínica' },
  { time: '10:30', patient: 'Helena Costa', professional: 'Ana Souza', type: 'Terapia Ocupacional', status: 'Confirmado', place: 'Domiciliar' },
  { time: '11:00', patient: 'Marta Rodrigues', professional: 'Rafael Costa', type: 'Fonoaudiologia', status: 'Aguardando', place: 'Clínica' },
  { time: '14:30', patient: 'Antônio Nogueira', professional: 'Ana Souza', type: 'Terapia Ocupacional', status: 'Confirmado', place: 'Clínica' },
  { time: '15:00', patient: 'Carlos Mendes', professional: 'Patrícia Alves', type: 'Psicologia', status: 'Reagendado', place: 'Domiciliar' },
  { time: '16:00', patient: 'Laura Campos', professional: 'Carlos Lima', type: 'Fisioterapia', status: 'Cancelado', place: 'Clínica' },
]

export const monthlyAppointments = [
  { month: 'Abr', value: 618 }, { month: 'Mai', value: 641 }, { month: 'Jun', value: 675 }, { month: 'Jul', value: 703 }, { month: 'Ago', value: 716 }, { month: 'Set', value: 742 },
]
export const monthlyMrr = [
  { month: 'Abr', value: 15300 }, { month: 'Mai', value: 16900 }, { month: 'Jun', value: 17800 }, { month: 'Jul', value: 19100 }, { month: 'Ago', value: 20240 }, { month: 'Set', value: 21940 },
]
export const revenueByPlan = [
  { name: 'Saúde Prime', value: 26780 }, { name: 'Vida Integral', value: 18450 }, { name: 'BemEstar', value: 14920 }, { name: 'Plena Assist', value: 10300 }, { name: 'Particular', value: 8000 },
]
export const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
