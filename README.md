# PAI - Plataforma de Apoio Inclusivo

Uma plataforma educacional inovadora que utiliza inteligência artificial para adaptar conteúdo escolar a alunos com TEA, TDAH e deficiência intelectual.

## 🎯 Visão Geral

A **PAI** é um MVP em evolução, conectando alunos, professores, administradores escolares e super admin através de uma interface adaptativa e segura.

### Status real do projeto (abril/2026)

✅ **Já implementado (núcleo funcional):**

- Cadastro de aluno com anamnese em 4 blocos e link de aceite LGPD (token nanoid)
- Fluxo de aceite do responsável com criação de senha (3 steps: dados → LGPD → senha)
- Geração automática de login: `nome.sobrenome` (com fallback inteligente)
- Primeiro acesso do aluno com persistência de persona/avatar
- Painéis de Super Admin, Escola e Professor com dados reais
- Sistema de arquivamento de escolas (soft delete + hard delete)
- Moderação e bloqueio progressivo por conteúdo inadequado
- Upload de arquivos via AWS S3 (presigned URLs)
- Auditoria de aceites LGPD (IP/User-Agent)

⚠️ **Pendências para produção 100%:**

- Validação final de políticas RLS no Supabase
- Testes E2E dos fluxos críticos ponta a ponta
- Hardening de observabilidade (alertas, métricas)

---

## 🏗️ Stack Tecnológico (Atualizado)

| Componente | Tecnologia | Motivo |
|------------|------------|---------|
| **Frontend** | React 19 + Vite 7 | Build rápido, HMR eficiente, controle total |
| **Backend** | Express + tRPC | API type-safe, middlewares flexíveis |
| **Routing** | Wouter | Leve, compatível com React 19, SSR-ready |
| **Banco** | Supabase (PostgreSQL) | RLS integrado, Auth nativa, realtime |
| **ORM** | Drizzle ORM | Type-safe, migrations versionadas |
| **IA** | Gemini 2.0 Flash | Análise multimodal (imagem/texto/áudio) |
| **Storage** | AWS S3 | Uploads seguros com presigned URLs |
| **Email** | Resend | Deliverability alta |
| **Build** | ESBuild | Bundle otimizado para produção |

---

## 📋 Estrutura Real do Projeto

```plain
pai-plataforma-inclusiva/
├── client/                    # Frontend React + Vite
│   ├── src/
│   │   ├── pages/             # Páginas por perfil (Auth, Student, Teacher, etc)
│   │   ├── components/        # Componentes reutilizáveis (ui/, forms/)
│   │   ├── contexts/          # React contexts (Auth, Theme)
│   │   ├── hooks/             # Custom hooks (useDialogComposition, etc)
│   │   ├── lib/               # Clientes tRPC, utilidades
│   │   └── main.tsx           # Entry point Vite
│   └── public/                # Assets estáticos
├── server/                    # Backend Express
│   ├── routers/               # tRPC routers (auth, students, schools...)
│   ├── _core/                 # Framework core (trpc, express setup)
│   ├── auth-helper.ts         # Lógica de autenticação (bcrypt, tokens)
│   ├── email-helper.ts        # Templates Resend
│   ├── gemini.ts              # Integração Google AI
│   ├── storage.ts             # AWS S3 presigned URLs
│   ├── db.ts                  # Conexão Drizzle + Supabase
│   └── *.test.ts              # Testes Vitest
├── drizzle/                   # Schema e migrações
│   ├── schema.ts              # Definição TypeScript das tabelas
│   ├── migrations/            # SQLs versionados
│   └── relations.ts           # Relações Drizzle
├── shared/                    # Código compartilhado (types, schemas)
└── ```


---

## 🚀 Quick Start (Corrigido)

Pré-requisitos
Node.js 20+
pnpm (recomendado) ou npm
Conta Supabase (banco + auth)
Conta AWS (S3 bucket para uploads)
Chaves API: Gemini, Resend
Instalação Local
bash
# Clone o repositório
git clone https://github.com/braguilweb/pai-plataforma-apoio-inclusivo.git
cd pai-plataforma-apoio-inclusivo

# Instale dependências
pnpm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas chaves (veja seção abaixo)

# Execute migrações do banco
pnpm db:push

# (Opcional) Seed de paletas de cores
pnpm db:seed

# Inicie o servidor de desenvolvimento
pnpm dev
Acesse: http://localhost:3000

Scripts disponíveis
bash
pnpm dev          # Desenvolvimento (tsx watch + Vite HMR)
pnpm build        # Build produção (Vite + ESBuild)
pnpm start        # Produção (node dist/index.js)
pnpm check        # Type checking (tsc --noEmit)
pnpm test         # Testes (vitest)
pnpm db:push      # Gerar e aplicar migrações Drizzle
🔐 Variáveis de Ambiente
env
# Banco de dados (Supabase)
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Autenticação
SESSION_SECRET=seu_segredo_super_secreto_32chars

# Google AI
GEMINI_API_KEY=AIza...

# Email
RESEND_API_KEY=re_...

# AWS S3 (Uploads)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=nome-do-bucket

# Frontend URL (para links de aceite)
VITE_APP_URL=http://localhost:3000
🔄 Fluxos Principais (Atualizados)
1. Cadastro de Aluno (Fluxo Real)
Admin da escola cadastra aluno (Blocos 1 e 2 da anamnese)
Sistema gera login único: nome.sobrenome (ou nome.sobrenome2 se duplicado)
Sistema gera token nanoid único com expiração em 24h
Responsável recebe email com link de aceite
Fluxo de aceite em 3 etapas:
Step 1: Visualização dos dados
Step 2: Aceite LGPD + auditoria (IP/User-Agent)
Step 3: Criação de senha do aluno
Redirecionamento automático para login (aba correta) após 10s
2. Hierarquia de Acesso
plain
SUPER ADMIN
├── Gerencia escolas (ativas/arquivadas)
├── Configura avatares disponíveis
└── Acesso total

ADMIN ESCOLA
├── Personaliza identidade visual (cores, logo S3)
├── Cadastra professores e alunos
├── Visualiza escolas arquivadas (restore)
└── Libera/bloqueia acesso alunos

PROFESSOR
├── Visualiza alunos vinculados
└── Acompanha evolução pedagógica

ALUNO (Grupo 1: lê/escreve | Grupo 2: não lê/escreve)
└── Interage com IA (interface WhatsApp)
3. Moderação de Conteúdo
Aluno envia imagem, texto ou áudio
Gemini Content Safety analisa em tempo real
Se conteúdo for inapropriado:
1ª violação: Aviso + email para responsável/admin
2ª violação: Bloqueio imediato da conta
Dashboard de alertas permite desbloqueio manual
🛡️ Segurança & Compliance
LGPD
Aceites obrigatórios em múltiplos níveis (escola, professor, responsável, aluno)
Row Level Security (RLS) ativo no Supabase
Auditoria completa: IP, User-Agent e timestamp em lgpdAcceptanceLogs
Tokens de aceite únicos (nanoid) com expiração de 24h
Senhas hasheadas com bcrypt
Proteção de Dados
Uploads via presigned URLs AWS com acesso temporário
Imagens inapropriadas não persistem após rejeição na moderação
Soft delete de escolas (arquivamento) antes de exclusão permanente
Isolamento de dados por escola com políticas RLS
🧪 Testes
bash
# Todos os testes
pnpm test

# Watch mode
pnpm test --watch

# Testes específicos
pnpm test server/secrets.test.ts
pnpm test server/auth.logout.test.ts
📱 Responsividade & Acessibilidade
Mobile-first com Tailwind CSS
Acessibilidade alinhada ao padrão WCAG AA
Interface adaptativa por perfil cognitivo
Suporte a temas de alto contraste
🐛 Troubleshooting
Erro de tipos do Google Maps
Se houver erro Cannot find name 'google':

bash
pnpm add -D @types/google.maps
Ou remova o componente Map.tsx se não estiver usando.

Migrações pendentes
Se o schema do banco estiver desatualizado:

bash
pnpm db:push
Verifique se todas as migrations foram aplicadas, especialmente:

activation_token em users
arquivada / dataArquivamento em schools
AWS S3 - Uploads falhando
Verifique se:

As credenciais AWS têm permissão s3:PutObject
O CORS do bucket permite o domínio da aplicação
O bucket aceita uploads via presigned URLs
📄 Licença
Copyright (c) 2026 - Guilherme Braga
Todos os direitos reservados.

Versão: 1.0.0
Última atualização: Abril 2026
Status: MVP funcional (hardening em andamento)