export type InvitationState = 'ready' | 'invalid' | 'expired' | 'revoked' | 'used' | 'unavailable'

export type OnboardingContext = {
  email: string
  cnpj: string
  companyName?: string
  expiresAt?: string
}

export type AdministratorData = {
  displayName: string
  cpf: string
  password: string
  passwordConfirmation: string
}

export type CompanyData = {
  legalName: string
  tradeName: string
  commercialEmail: string
  phone: string
}

export type ClinicUnitData = {
  name: string
  postalCode: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
  phone: string
}

export type OnboardingFormData = {
  administrator: AdministratorData
  company: CompanyData
  clinicUnit: ClinicUnitData
}

export type OnboardingCompletion = OnboardingFormData & { token: string }

export type OnboardingCompletionResult = {
  status: 'completed'
  nextAction: 'login'
}

export interface OnboardingApi {
  getContext(token: string): Promise<OnboardingContext>
  complete(payload: OnboardingCompletion): Promise<OnboardingCompletionResult>
}

export class OnboardingApiError extends Error {
  constructor(public readonly state: Exclude<InvitationState, 'ready'>, message: string) {
    super(message)
    this.name = 'OnboardingApiError'
  }
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>
