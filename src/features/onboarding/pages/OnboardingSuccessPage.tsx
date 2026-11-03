import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export function OnboardingSuccessPage() {
  return <section className="onboarding-result onboarding-success" role="status">
    <span className="onboarding-result-icon"><CheckCircle2 /></span>
    <div className="eyebrow">Cadastro concluído</div>
    <h1>Sua clínica está pronta para o primeiro acesso.</h1>
    <p>Use o CPF e a senha definidos no cadastro para entrar na plataforma.</p>
    <Link className="button button-dark" to="/login">Ir para o login <ArrowRight /></Link>
  </section>
}
