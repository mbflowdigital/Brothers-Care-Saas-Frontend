import { ArrowRight, Building2, Check, CheckCircle2, MapPin, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

export function OnboardingSuccessPage() {
  return <section className="onboarding-result onboarding-success" role="status">
    <span className="onboarding-result-icon"><CheckCircle2 /></span>
    <div className="eyebrow">Cadastro concluído</div>
    <h1>Sua clínica está pronta para o primeiro acesso.</h1>
    <p>Criamos a estrutura inicial da operação. Entre com o CPF e a senha que você acabou de definir.</p>
    <div className="onboarding-result-list"><span><UserRound /><Check />Administrador ativado</span><span><Building2 /><Check />Empresa configurada</span><span><MapPin /><Check />Primeira unidade criada</span></div>
    <Link className="button button-dark" to="/login">Entrar no Brothers Care <ArrowRight /></Link>
  </section>
}
