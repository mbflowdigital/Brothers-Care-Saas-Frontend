import type { AdministratorData, ClinicUnitData, CompanyData, FieldErrors } from './types'

const digits = (value: string) => value.replace(/\D/g, '')

export function maskCpf(value: string) {
  return digits(value).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskCnpj(value: string) {
  return digits(value).slice(0, 14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function isValidCnpj(value: string) {
  const cnpj = digits(value)
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false
  const calculate = (base: string, weights: number[]) => {
    const remainder = base.split('').reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0) % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const first = calculate(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = calculate(`${cnpj.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return cnpj.endsWith(`${first}${second}`)
}

export function maskPostalCode(value: string) {
  return digits(value).slice(0, 8).replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}

export function maskPhone(value: string) {
  const valueDigits = digits(value).slice(0, 11)
  return valueDigits.length > 10
    ? valueDigits.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3')
    : valueDigits.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3')
}

export function isValidCpf(value: string) {
  const cpf = digits(value)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const calculate = (length: number) => {
    const sum = cpf.slice(0, length).split('').reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  return calculate(9) === Number(cpf[9]) && calculate(10) === Number(cpf[10])
}

const required = (value: string) => value.trim().length > 0
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

export function validateAdministrator(data: AdministratorData): FieldErrors<AdministratorData> {
  const errors: FieldErrors<AdministratorData> = {}
  if (!required(data.displayName)) errors.displayName = 'Informe o nome completo.'
  if (!isValidCpf(data.cpf)) errors.cpf = 'Informe um CPF válido.'
  if (data.password.length < 12 || data.password.length > 128 || !/[A-ZÀ-Þ]/.test(data.password) || !/[a-zß-ÿ]/.test(data.password) || !/\d/.test(data.password)) {
    errors.password = 'Use de 12 a 128 caracteres, com letra maiúscula, minúscula e número.'
  }
  if (data.passwordConfirmation !== data.password) errors.passwordConfirmation = 'As senhas não coincidem.'
  return errors
}

export function validateCompany(data: CompanyData): FieldErrors<CompanyData> {
  const errors: FieldErrors<CompanyData> = {}
  if (!required(data.legalName)) errors.legalName = 'Informe a razão social.'
  if (!required(data.tradeName)) errors.tradeName = 'Informe o nome fantasia.'
  if (!validEmail(data.commercialEmail)) errors.commercialEmail = 'Informe um e-mail comercial válido.'
  if (digits(data.phone).length < 10) errors.phone = 'Informe um telefone válido.'
  return errors
}

export function validateClinicUnit(data: ClinicUnitData): FieldErrors<ClinicUnitData> {
  const errors: FieldErrors<ClinicUnitData> = {}
  if (!required(data.name)) errors.name = 'Informe o nome da unidade.'
  if (digits(data.postalCode).length !== 8) errors.postalCode = 'Informe um CEP válido.'
  if (!required(data.street)) errors.street = 'Informe o logradouro.'
  if (!required(data.number)) errors.number = 'Informe o número.'
  if (!required(data.district)) errors.district = 'Informe o bairro.'
  if (!required(data.city)) errors.city = 'Informe a cidade.'
  if (!/^[A-Za-z]{2}$/.test(data.state)) errors.state = 'Informe a UF com duas letras.'
  if (data.phone && digits(data.phone).length < 10) errors.phone = 'Informe um telefone válido.'
  return errors
}
