import type { OnboardingApi } from '../types'
import { OnboardingApiError } from '../types'

const wait = () => new Promise((resolve) => window.setTimeout(resolve, 450))

export const mockOnboardingApi: OnboardingApi = {
  async getContext(token) {
    await wait()
    const knownErrors = {
      expirado: new OnboardingApiError('expired', 'Este convite expirou. Solicite um novo link.'),
      revogado: new OnboardingApiError('revoked', 'Este convite foi revogado.'),
      utilizado: new OnboardingApiError('used', 'Este convite já foi utilizado.'),
    } as const
    if (token in knownErrors) throw knownErrors[token as keyof typeof knownErrors]
    if (!token || token === 'invalido') throw new OnboardingApiError('invalid', 'Este convite não é válido.')
    return {
      email: 'mariana@clinicaexemplo.com.br',
      cnpj: '11222333000181',
      companyName: 'Clínica Exemplo',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }
  },
  async complete() {
    await wait()
    return { status: 'completed', nextAction: 'login' }
  },
}
