<div align="center">

# Brothers Care

**Sua clínica organizada. Sua equipe conectada. Sua gestão no controle.**

Plataforma de gestão para clínicas de reabilitação, terapia ocupacional e atendimento domiciliar.

![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06b6d4?logo=tailwindcss&logoColor=white)

</div>

---

## Começar

Requisitos: Node.js 20 LTS ou superior e npm.

```bash
npm ci
npm run dev
```

Abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

Para validar uma compilação de produção:

```bash
npm run build
npm run preview
```

Os comandos devem ser executados na raiz deste repositório. `npm ci` instala as versões travadas em `package-lock.json`.

## Acessos de demonstração

| Perfil | Usuário | Senha | Acesso |
| --- | --- | --- | --- |
| Super Admin Brothers | `admin` | `admin` | Operação global em `/admin` |
| Administradora do Instituto Vitta | `adminVitta` | `adminVitta` | Gestão do tenant Vitta em `/app` |
| Terapeuta ocupacional Ana Souza | `userVitta` | `userVitta` | Agenda e registros autorizados |

As contas são fixas para apresentação. Cadastros e evoluções criados durante a demonstração ficam no `localStorage` do navegador usado.

## O produto

O Brothers Care reúne a operação diária de uma clínica multidisciplinar: pacientes, profissionais, agenda, atendimentos, evoluções, financeiro, convênios, comunicação, relatórios e auditoria. A experiência também inclui um painel global de empresas e a página institucional do Instituto Vitta.

| Endereço | Área |
| --- | --- |
| `/` | Apresentação pública do Brothers Care |
| `/login` | Acesso por perfil |
| `/vitta` | Página institucional do Instituto Vitta |
| `/app/dashboard` | Visão geral da clínica |
| `/app/agenda` | Agenda e atendimentos |
| `/app/pacientes` | Pacientes e perfis individuais |
| `/app/profissionais` | Equipe e perfis profissionais |
| `/app/evolucoes` | Registro e histórico clínico de demonstração |
| `/app/financeiro` | Produção, convênios e fechamento |
| `/app/comunicacao` | Mensagens pós-atendimento |
| `/app/relatorios` | Relatórios operacionais |
| `/app/auditoria` | Atividade da clínica |
| `/admin` | Visão global Brothers Care |
| `/admin/empresas` | Empresas e saúde dos tenants |
| `/admin/assinaturas` | Assinaturas e cobranças previstas |
| `/admin/planos` | Planos comerciais |
| `/admin/tickets` | Suporte às empresas |
| `/admin/atividade` | Atividade global |

As rotas internas exigem uma sessão de demonstração. A navegação muda conforme o perfil conectado.

## Estrutura técnica atual

```text
.
├── src/
│   ├── App.tsx          # Rotas, sessão local, shell e telas principais
│   ├── ExtraViews.tsx   # Módulos complementares e formulários
│   ├── data.ts          # Modelos TypeScript e dados de demonstração
│   ├── main.tsx         # Inicialização React e roteador
│   ├── styles.css       # Design system e estilos base
│   └── polish.css       # Ajustes de responsividade e componentes
├── index.html
├── package.json
├── package-lock.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

**Stack:** React 19, TypeScript, Vite, React Router, Tailwind CSS, Recharts e Lucide.

**Fluxo atual:** o navegador mantém a sessão e os novos cadastros no armazenamento local. Não há API, banco de dados, envio de e-mail, autenticação real ou isolamento de tenant no servidor. Os dados de pacientes e evoluções são cenográficos e não devem ser substituídos por dados reais.

## Direção de arquitetura

A estrutura atual prioriza uma apresentação navegável. Antes de ampliar regras de negócio, extraia gradualmente os módulos concentrados em `App.tsx` e `ExtraViews.tsx` para uma organização por domínio. O modelo alvo, os limites de tenant e a sequência de migração estão em [ARCHITECTURE.md](ARCHITECTURE.md).

```text
src/
├── app/                 # Composição, providers e configuração das rotas
├── features/
│   ├── tenants/          # Empresas, planos e contexto de tenant
│   ├── patients/         # Pacientes, documentos e permissões
│   ├── professionals/    # Equipe e disponibilidade
│   ├── scheduling/      # Agenda e atendimentos
│   ├── clinical-records/ # Evoluções e histórico clínico
│   ├── billing/          # Convênios, produção e fechamento
│   └── communications/  # Mensagens e notificações
├── shared/              # UI, tipos comuns e utilitários sem regra de domínio
└── infrastructure/      # Clientes HTTP e implementações de repositório
```

Evolua em fatias pequenas: primeiro extraia uma feature e seus tipos; depois introduza interfaces de repositório; por fim conecte os adaptadores a uma API. Componentes React não devem conhecer detalhes de banco de dados ou transporte HTTP.

### Multi-tenancy e segurança antes de produção

- Identidade, autenticação e autorização precisam ser validadas no servidor. Guardas de rota no React servem apenas para UX.
- O tenant ativo deve vir de uma identidade autenticada, nunca ser confiado de um campo editável ou de uma chave arbitrária do navegador.
- Toda consulta e mutação de dados de tenant deve ser escopada no servidor e coberta por testes de isolamento entre empresas. Considere controles de acesso também no banco.
- Nunca armazene dados clínicos reais, tokens ou segredos em `localStorage`, no código ou em arquivos versionados.
- Evoluções e documentos exigem revisão de LGPD, controle de acesso mínimo, trilha de auditoria protegida, política de retenção e armazenamento seguro de anexos.
- Antes de disponibilizar para clínicas, substitua credenciais fixas e dados locais por autenticação, API, persistência segura, observabilidade, backups e testes automatizados.

## Verificações

```bash
npm run build
npm audit
```

O projeto ainda não possui uma suíte de testes automatizados configurada. Antes de adicionar uma ferramenta de testes, defina os fluxos críticos e execute-os em CI junto com a compilação.

## Contribuição

Leia [AGENTS.md](AGENTS.md) antes de alterar o código. Ele define os padrões de implementação para pessoas, GitHub Copilot e outros agentes de programação. Consulte também [ARCHITECTURE.md](ARCHITECTURE.md) antes de mudanças de domínio, autorização ou dados.

---

**Brothers Care** é um produto da **Brothers Digital**.