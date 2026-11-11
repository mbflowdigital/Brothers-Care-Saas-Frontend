import { Building2, Check, MapPin, UserRound } from 'lucide-react'

const steps = [
  { label: 'Administrador', icon: UserRound },
  { label: 'Empresa', icon: Building2 },
  { label: 'Unidade', icon: MapPin },
]

export function OnboardingProgress({ current }: { current: number }) {
  return <ol className="onboarding-progress" aria-label="Progresso do cadastro">
    {steps.map(({ label, icon: Icon }, index) => <li key={label} className={index < current ? 'complete' : index === current ? 'current' : ''} aria-current={index === current ? 'step' : undefined}>
      <span className="onboarding-step-icon">{index < current ? <Check /> : <Icon />}</span>
      <span><small>Etapa {index + 1}</small><strong>{label}</strong></span>
    </li>)}
  </ol>
}
