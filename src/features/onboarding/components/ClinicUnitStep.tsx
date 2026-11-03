import type { ClinicUnitData, FieldErrors } from '../types'
import { maskPhone, maskPostalCode } from '../validation'

type Props = { value: ClinicUnitData; errors: FieldErrors<ClinicUnitData>; onChange: (value: ClinicUnitData) => void }

export function ClinicUnitStep({ value, errors, onChange }: Props) {
  const update = (field: keyof ClinicUnitData, nextValue: string) => onChange({ ...value, [field]: nextValue })
  const renderField = (name: keyof ClinicUnitData, label: string, className = '', placeholder = '') => <div className={`field ${className} ${errors[name] ? 'field-invalid' : ''}`}><label htmlFor={`unit-${name}`}>{label}</label><input id={`unit-${name}`} placeholder={placeholder} value={value[name]} maxLength={name === 'state' ? 2 : undefined} onChange={(event) => {
    const raw = event.target.value
    update(name, name === 'postalCode' ? maskPostalCode(raw) : name === 'phone' ? maskPhone(raw) : name === 'state' ? raw.toUpperCase().replace(/[^A-Z]/g, '') : raw)
  }} aria-invalid={Boolean(errors[name])} />{errors[name] && <small className="field-error">{errors[name]}</small>}</div>
  return <fieldset className="onboarding-fields">
    <legend className="sr-only">Primeira unidade clínica</legend>
    {renderField('name', 'Nome da unidade', 'full', 'Unidade Principal')}
    {renderField('postalCode', 'CEP', '', '00000-000')}
    {renderField('phone', 'Telefone da unidade', '', '(00) 00000-0000')}
    {renderField('street', 'Logradouro', 'full')}
    {renderField('number', 'Número')}
    {renderField('complement', 'Complemento (opcional)')}
    {renderField('district', 'Bairro')}
    {renderField('city', 'Cidade')}
    {renderField('state', 'UF')}
  </fieldset>
}
