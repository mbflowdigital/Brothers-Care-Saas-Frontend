# Arquitetura do Brothers Care

Este documento separa o estado executável atual da arquitetura recomendada para evoluir o produto. Ele não afirma que controles futuros já existem.

## Estado atual

- Aplicação web única em React + TypeScript, compilada pelo Vite.
- Rotas, shell, páginas e parte da lógica estão concentrados em `src/App.tsx` e `src/ExtraViews.tsx`.
- `src/data.ts` contém modelos e dados de apresentação.
- Sessão, novos parceiros, profissionais e evoluções usam `localStorage`.
- Não há API, banco, identidade de usuário, isolamento de tenant no servidor nem persistência compartilhada.

Esse estado serve para demonstrações comerciais locais. Não deve receber informação clínica real nem ser exposto como sistema de produção.

## Arquitetura alvo

Manter o frontend como cliente de uma API e organizar o código por domínio. Migrar gradualmente, sem uma reescrita ampla:

```text
src/
├── app/
│   ├── routes/              # Rotas e composição de layouts
│   ├── providers/           # Sessão, configuração e query client
│   └── navigation/          # Navegação por papel e permissões de UI
├── features/
│   ├── identity/            # Sessão, membership e perfil
│   ├── tenants/             # Empresas, unidades, planos e assinaturas
│   ├── patients/            # Cadastro, consentimento e documentos
│   ├── professionals/       # Equipe, especialidades e disponibilidade
│   ├── scheduling/          # Agenda, atendimentos e status
│   ├── clinical-records/    # Evoluções, anexos e histórico
│   ├── billing/             # Convênios, produção, repasses e fechamento
│   ├── communications/      # Preferências e histórico de envio
│   └── audit/               # Eventos de auditoria e consulta
├── shared/
│   ├── ui/                  # Componentes sem regra de domínio
│   ├── forms/               # Campos e validação reutilizável
│   └── lib/                 # Utilitários puros
└── infrastructure/
    ├── http/                # Cliente e tratamento de erros da API
    └── repositories/        # Adaptadores por domínio
```

Cada feature deve conter apenas as peças necessárias ao domínio, por exemplo `components/`, `pages/`, `schemas/`, `types.ts` e `services/`. Não criar subpastas vazias preventivamente.

### Dependências

```text
app -> features -> shared
features -> interfaces de repositório
infrastructure -> implementações dessas interfaces
```

Componentes de UI não devem importar clientes de banco nem montar SQL. Regras de domínio não devem depender de React. O frontend chama contratos HTTP; adaptadores de infraestrutura implementam esses contratos. Os dados locais atuais podem continuar como adaptador de apresentação até existir uma API, sem fingir que oferecem segurança ou concorrência de backend.

## Modelo de domínio recomendado

```text
User 1---N TenantMembership N---1 Tenant 1---N ClinicUnit
Tenant 1---N Patient
Tenant 1---N Professional
Patient 1---N Appointment N---1 Professional
Appointment 1---N ClinicalRecord
Tenant 1---N PayerContract
Appointment 1---N FinancialEntry
Tenant 1---N CommunicationLog
Tenant 1---N AuditEvent
```

- `User` representa uma identidade global; não guarda um único papel global de clínica.
- `TenantMembership` liga pessoa e empresa e contém papel, estado e escopo de acesso. A mesma pessoa pode participar de mais de um tenant.
- `Tenant` representa a empresa cliente; `ClinicUnit` representa unidades da operação dentro dela.
- Toda entidade pertencente a uma empresa deve ter `tenant_id` obrigatório no backend. Entidades por unidade podem também ter `clinic_unit_id`.
- `Appointment` referencia paciente, profissional, unidade/modalidade, intervalo de tempo e estado.
- `ClinicalRecord` referencia atendimento, paciente, autor e estado do registro; retificações devem preservar histórico, não sobrescrever silenciosamente uma evolução finalizada.
- `FinancialEntry` e `AuditEvent` devem preservar a origem e o ator das mudanças relevantes.

No frontend, use IDs opacos e tipos separados para entidades diferentes. Não use nome de empresa como chave, autorização ou relação persistente.

## Fronteira de tenant

O frontend pode ocultar ações e filtrar visualizações para UX, mas não é uma fronteira de segurança. Em produção:

1. Autentique a pessoa no servidor e valide a sessão em cada requisição.
2. Derive tenant e memberships da identidade autenticada; não confie em `tenant_id` enviado no body, query string ou `localStorage`.
3. Autorize a operação no servidor por membership, papel, unidade e recurso solicitado.
4. Faça cada leitura e escrita ser tenant-scoped. Use chaves/índices compostos que incluam `tenant_id`; avalie Row-Level Security como defesa adicional, não como substituto de autorização correta.
5. Evite endpoints que aceitam IDs de recurso sem confirmar tenant e permissões daquele recurso.
6. Registre eventos de auditoria no servidor para operações sensíveis; proteja a trilha contra edição pela própria aplicação cliente.
7. Cubra leituras, alterações, exclusões e anexos com testes negativos entre tenants e entre papéis.

Papéis são capacidades, não simples rótulos de UI. Comece com políticas explícitas por ação, como `patient.read`, `clinical_record.create` e `financial.close`, e mapeie memberships aos conjuntos de capacidades. A visibilidade de um botão nunca substitui a validação da API.

## Dados clínicos e LGPD

Antes de armazenar dados reais, definir base legal e consentimentos aplicáveis, papéis de controlador/operador, minimização, retenção e descarte, atendimento de direitos dos titulares, resposta a incidentes e contratos com fornecedores. Também requer revisão profissional de segurança e privacidade.

Credenciais, tokens e chaves ficam em secret manager no servidor/CI, nunca em código versionado ou no bundle React. Arquivos clínicos devem usar armazenamento privado, autorização por tenant e links de curta duração; não embutir conteúdo sensível em e-mail ou URL pública. Logs devem evitar texto clínico e dados pessoais desnecessários.

## Sequência de evolução

1. **Organizar sem mudar comportamento:** extrair páginas e componentes atuais por feature e centralizar contratos TypeScript; manter rotas de demonstração.
2. **Separar dados da interface:** definir interfaces de repositório por domínio e criar adaptadores locais para a demo. Escrever testes de contrato para os adaptadores.
3. **Projetar backend:** escolher API, identidade e banco considerando tenant, membership, unidades, migrações, auditoria e requisitos de privacidade.
4. **Introduzir autorização real:** server-side em todas as operações, com testes de acesso cruzado entre empresas e papéis.
5. **Persistir dados e anexos com segurança:** adicionar migrações, backups testados, retenção, monitoramento, alertas e processo de resposta a incidentes.
6. **Endurecer operação:** CI com typecheck/build/testes, revisão de dependências, observabilidade sem PHI, limites de requisição e plano de recuperação.

Cada etapa deve ser entregue em mudanças pequenas e reversíveis. Não adicionar uma abstração de tenant no frontend e descrevê-la como isolamento seguro antes da implementação server-side.

## Critérios para aceitar uma feature

- O domínio dono da regra está claro e a UI não concentra persistência ou autorização.
- Papéis, tenant e unidade estão considerados tanto na experiência quanto, quando houver backend, na autorização server-side.
- Há estados de erro, vazio, carregamento e sucesso e validação acessível dos formulários.
- Regras críticas têm testes; isolamento entre tenants tem casos positivos e negativos.
- Nenhum dado pessoal/clínico real, segredo ou build local entrou no Git.
- README, `AGENTS.md` e este documento continuam fiéis ao que foi implementado.