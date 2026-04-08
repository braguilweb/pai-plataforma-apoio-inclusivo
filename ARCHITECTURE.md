# PAI - Plataforma de Apoio Inclusivo — Arquitetura Técnica

## Visão Geral

A **PAI** é uma plataforma educacional inclusiva construída com arquitetura moderna (Vite + React + Express) que utiliza inteligência artificial (Gemini 2.0 Flash) para adaptar conteúdo escolar a alunos neurodivergentes (TEA, TDAH, DI). 

**Princípios arquiteturais:**
- **Type-Safety:** tRPC + Drizzle ORM + TypeScript (end-to-end types)
- **Segurança:** RLS (Row Level Security), bcrypt, nanoid tokens, auditoria LGPD
- **Escalabilidade:** Stateless API, PostgreSQL, S3 para storage
- **Acessibilidade:** Mobile-first, WCAG AA, interfaces adaptativas

---

## Stack Técnico (Real)

| Camada | Tecnologia | Versão | Justificativa |
|--------|-----------|---------|---------------|
| **Frontend** | React + Vite | 19 + 7 | HMR instantâneo, build otimizado, controle total do bundle |
| **Routing** | Wouter | 3.x | Leve (~2kB), React 19 ready, API similar a React Router |
| **Backend** | Express + tRPC | 4.x + 11.x | API RESTful type-safe, middlewares flexíveis, proteção de secrets |
| **ORM** | Drizzle ORM | 0.44.x | SQL-like queries, migrations versionadas, type-safe |
| **Banco** | Supabase PostgreSQL | 15+ | RLS integrado, Auth nativa, realtime opcional |
| **Storage** | AWS S3 | SDK v3 | Presigned URLs, segurança, escalabilidade |
| **IA** | Gemini 2.0 Flash | v1beta | Multimodal (texto/imagem/áudio), Content Safety API |
| **Áudio** | Web Speech API | - | Nativo do browser, STT gratuito, sem backend |
| **Email** | Resend | 3.x | Deliverability alta, templates React |
| **Build** | ESBuild | 0.25.x | Bundle ultra-rápido para produção |

---

## Estrutura de Arquivos (Real)
```
pai-plataforma-inclusivo/
├── client/                          # Frontend Vite + React 19
│   ├── src/
│   │   ├── main.tsx                 # Entry point (Vite)
│   │   ├── App.tsx                  # Router principal (Wouter)
│   │   ├── pages/                   # Rotas organizadas por perfil
│   │   │   ├── Auth/                # Login, FirstAccess
│   │   │   ├── Acceptance/          # Fluxo de aceite LGPD (3 steps)
│   │   │   ├── SuperAdmin/          # Dashboard, Schools, Avatars
│   │   │   ├── School/              # Admin escola: Students, Teachers, Identity
│   │   │   ├── Teacher/             # Painel professor
│   │   │   └── Student/             # Chat interface (IA)
│   │   ├── components/              # UI components (shadcn/ui based)
│   │   │   └── ui/                  # Button, Dialog, Input, etc
│   │   ├── hooks/                   # Custom hooks (useDialogComposition)
│   │   ├── contexts/                # AuthContext, ThemeContext
│   │   └── lib/                     # tRPC client, utils
│   ├── index.html                   # Template Vite
│   └── public/                      # Assets estáticos
│
├── server/                          # Backend Express + tRPC
│   ├── _core/                       # Bootstrap e configuração
│   │   ├── index.ts                 # Entry point Express
│   │   └── trpc.ts                  # Contexto tRPC (req, res, user)
│   ├── routers/                     # tRPC routers por domínio
│   │   ├── auth.ts                  # Login, logout, me
│   │   ├── students.ts              # CRUD alunos, anamnese
│   │   ├── schools.ts               # CRUD escolas, arquivamento
│   │   ├── acceptance.ts            # Tokens nanoid, fluxo aceite
│   │   └── chat.ts                  # Integração Gemini, moderação
│   ├── routers.ts                   # Aggregator (appRouter)
│   ├── auth-helper.ts               # Bcrypt, sessions, nanoid tokens
│   ├── email-helper.ts              # Templates Resend
│   ├── gemini.ts                    # Cliente Google AI, prompts
│   ├── storage.ts                   # AWS S3 presigned URLs
│   ├── db.ts                        # Pool PostgreSQL + Drizzle
│   └── *.test.ts                    # Testes Vitest
│
├── drizzle/                         # Database como código
│   ├── schema.ts                    # Definição TypeScript das tabelas
│   ├── relations.ts                 # Relações Drizzle (optional)
│   ├── migrations/                  # SQLs versionados (0001, 0002...)
│   └── meta/                        # Snapshots Drizzle Kit
│
├── shared/                          # Código compartilhado (schemas Zod)
└── package.json                     # Scripts: dev, build, db:push, test
plain
Copy
```
---

## Arquitetura de Autenticação

### Modelo de Sessão

**Backend (Express):**
- Sessions baseadas em cookies HTTP-only (`connect` ou middleware custom)
- Contexto tRPC inclui `req`, `res`, e `user` autenticado
- Proteção CSRF via SameSite cookies

**Frontend:**
- Contexto React (`AuthContext`) mantém estado do usuário
- Hook `useUser()` acessa dados do usuário logado
- Proteção de rotas via componente `<ProtectedRoute role="admin_school">`

### Fluxos de Login

#### Grupo 1 (Lê e Escreve)

````
POST /api/auth.login
Body: { username: "maria.silva", password: "..." }
Fluxo:
Busca user por loginUsername
Bcrypt compare password
Cria session cookie
Retorna user + redirectTo (/aluno/chat ou /escola/dashboard)
plain
Copy
````

#### Grupo 2 (Não Lê/Não Escreve)
````
POST /api/auth.loginGroup2
Body: { firstName: "Maria", birthDate: "2010-05-15" }
Fluxo:
Busca student por firstName + birthDate
Valida match
Cria session cookie (curta duração)
Redirect para /aluno/chat
plain
Copy
````

### Tokens de Aceite (Fluxo Responsável)


**Arquitetura:** Nanoid + Database (não JWT)
Geração: nanoid(32) → Salvo em users.activationToken (com expiration 24h)
Validação: Lookup direto no banco + check expiration
Uso único: Token deletado após criação da senha
Auditoria: IP + User-Agent salvos em lgpdAcceptanceLogs
plain
Copy

---

## Modelo de Dados (Schema Drizzle)

### Tabela `users` (Autenticação Central)

```typescript
id: serial(pk)
openId: varchar(64)           // Identificador externo único
name: text
email: varchar(320)
role: enum('super_admin', 'admin_school', 'teacher', 'student')
schoolId: integer(fk)         // Nullable para super_admin
groupAccess: enum('reads_writes', 'non_reads_writes')
loginUsername: varchar(255)   // Gerado: nome.sobrenome (único)
loginPasswordHash: text       // Bcrypt hash
firstName: varchar(255)       // Para display e Grupo 2
birthDate: date               // Para Grupo 2
lgpdAccepted: boolean
lgpdAcceptedAt: timestamp
status: enum('active', 'blocked', 'pending_approval')



// Campos de Ativação (Admin Escola)
activationToken: varchar(255)        // Nanoid, expira 24h
activationTokenExpires: timestamp    // Limpado após uso

// Timestamps
createdAt, updatedAt, lastSignedIn: timestamp

````
### Tabela schools (Tenant Isolation)
```TypeScript
Copy
id: serial(pk)
name: varchar(255)
adminId: integer(fk → users)  // Dono da escola
logoUrl: text                 // URL S3 (presigned)
colorPalette: enum('azul_serenidade', 'verde_natureza', 
                   'roxo_criativo', 'laranja_energia', 'personalizada')
customColorHex: varchar(7)    // Ativo se palette = personalizada
lgpdAccepted: boolean
lgpdAcceptedAt: timestamp
isActive: boolean             // Pode fazer login?

// Soft Delete / Arquivamento
arquivada: boolean            // Soft delete lógico
dataArquivamento: timestamp   // Quando foi arquivada
deletedAt: timestamp          // Hard delete (null = ativa)

createdAt, updatedAt: timestamp
````
### Tabela students (Perfil Pedagógico)
```TypeScript
Copy
id: serial(pk)
userId: integer(fk → users)   // 1:1 com users
schoolId: integer(fk → schools) // Tenant isolation
series: enum('1º_ano', '2º_ano', '3º_ano')
teacherId: integer(fk → users, nullable) // Professor responsável

// Personalização
personaName: varchar(255)     // "Prof. Gui", "Tia Maria"
avatarStyle: enum('manga', 'pixar', 'android')
preferredSubjects: json       // ["Matemática", "Ciências"]

// Funcionalidades
enemEnabled: boolean          // Flag questões ENEM
firstAccessCompleted: boolean // Já escolheu avatar/persona?

// Moderação
moderationWarnings: integer   // Contador (0, 1, 2...)
blockedAt: timestamp          // Null = não bloqueado

createdAt, updatedAt: timestamp
```
### Tabela anamnesis (Ficha Médico-Pedagógica)
```TypeScript
Copy
id: serial(pk)
studentId: integer(fk)        // 1:1 com students

// Progresso (4 blocos)
block1Completed: boolean      // Identificação
block2Completed: boolean      // Diagnóstico
block3Completed: boolean      // Preferências (responsável)
block4Completed: boolean      // Plano de estudo

// Bloco 1: Identificação
guardianName: varchar(255)
guardianContactWhatsapp: varchar(20)
guardianContactEmail: varchar(320)

// Bloco 2: Diagnóstico
conditions: json              // [{cid: "F84", name: "TEA"}, ...]
readingLevel: enum('non_reader', 'reads_with_difficulty', 'reads_well')
writingLevel: enum('non_writer', 'writes_with_difficulty', 'writes_well')
observations: text

// Bloco 3: Preferências (personalização IA)
favoriteMovies, favoriteMusic, favoriteSports: text
favoriteFoods, favoriteAnimations: text
otherInterests: text
prohibitedThemes: json        // ["violência", "política"] - filtro IA

// Bloco 4: Plano de Estudo
subjects: json                // Configuração por matéria

createdAt, updatedAt: timestamp
```
### Tabela chatMessages (Histórico IA)
```TypeScript
Copy
id: serial(pk)
studentId: integer(fk)        // Isolamento por aluno
messageType: enum('student_input', 'ai_response')
contentType: enum('text', 'image', 'audio')
content: text                 // Texto ou transcrição
imageUrl: text                // URL S3 (se imagem)
audioUrl: text                // URL S3 (se áudio)

// Compreensão
isComprehended: boolean       // null = aguardando resposta
comprehensionScore: varchar(10) // "85%" ou "compreendido"
subjectTopic: varchar(255)    // "Frações", "Photosíntese"

// Versionamento de conteúdo
versionNumber: integer        // 1, 2, 3... (revisões)
previousVersionId: integer(fk → chatMessages) // Linked list

createdAt, updatedAt: timestamp
```
### Tabela moderationLogs (Auditoria de Segurança)
```TypeScript
Copy
id: serial(pk)
studentId: integer(fk)
messageId: integer(fk → chatMessages)
violationType: enum('inappropriate_image', 'other')
warningCount: integer         // Acumulado (1, 2...)
actionTaken: enum('warning', 'blocked')
guardianNotified: boolean
adminNotified: boolean
adminActionRequired: boolean  // true = aguardando liberação manual
adminActionTakenAt: timestamp // Quando admin desbloqueou
createdAt: timestamp
```
### Tabela lgpdAcceptanceLogs (Compliance)
```TypeScript
Copy
id: serial(pk)
userId: integer(fk, nullable)    // Quem aceitou (pode ser null para escolas)
schoolId: integer(fk, nullable)  // Contexto escolar
acceptanceType: enum('school', 'teacher', 'guardian', 'student')
ipAddress: varchar(45)           // IPv4 ou IPv6
userAgent: text                  // Browser info
createdAt: timestamp
```

## Arquitetura de Comunicação (tRPC)
### Fluxo de Requisição
```plain

Copy
Client (React)          Server (Express)
     |                         |
     |-- trpc.students.create ->|
     |                         |
     |    Resolve Context      |
     |    (req, res, user)     |
     |                         |
     |    Input Validation     |
     |    (Zod Schema)         |
     |                         |
     |    Authorization        |
     |    (RLS/Role Check)     |
     |                         |
     |    Business Logic       |
     |    (Drizzle + Gemini)   |
     |                         |
     |<- JSON Response --------|
     |    (Type-safe)          |

```     
### Exemplo de Router (students.ts)

```TypeScript Copy
export const studentsRouter = router({
  create: protectedProcedure
    .input(createStudentSchema)  // Zod validation
    .mutation(async ({ ctx, input }) => {
      // Check role: only admin_school or super_admin
      if (ctx.user.role !== 'admin_school') throw new TRPCError({ code: 'FORBIDDEN' });
      
      // RLS: Ensure user can only create students for their school
      if (ctx.user.schoolId !== input.schoolId) throw new TRPCError({ code: 'FORBIDDEN' });
      
      // Generate unique login: nome.sobrenome (with conflict resolution)
      const login = await generateUniqueLogin(input.firstName, input.lastName);
      
      // Create user + student (transaction)
      const result = await ctx.db.transaction(async (trx) => {
        const [user] = await trx.insert(users).values({...}).returning();
        const [student] = await trx.insert(students).values({
          userId: user.id,
          schoolId: input.schoolId,
          ...
        }).returning();
        return { user, student };
      });
      
      // Send email to guardian with acceptance link (nanoid token)
      await sendAcceptanceEmail(result.student, input.guardianEmail);
      
      return result;
    }),
    
  archive: protectedProcedure
    .input(z.object({ schoolId: z.number(), archive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete logic
      await ctx.db.update(schools)
        .set({ 
          arquivada: input.archive,
          dataArquivamento: input.archive ? new Date() : null 
        })
        .where(eq(schools.id, input.schoolId));
    })
});
```
## Arquitetura de Storage (AWS S3)
### Presigned URLs (Segurança)
```plain
Copy
1. Cliente solicita upload: POST /api/getUploadUrl
   Body: { filename: "avatar.jpg", contentType: "image/jpeg" }
   
2. Server gera presigned URL (válido por 5 min):
   - Bucket: pai-uploads
   - Key: schools/{schoolId}/students/{studentId}/{uuid}.jpg
   - ACL: private
   
3. Client faz PUT direto para S3 (bypass server)
   
4. Client notifica server: POST /api/confirmUpload
   - Salva URL no banco
   - Validação de tipo/tamanho já feita na geração do presigned

```   
### Estrutura de Buckets
```plain
Copy
s3://pai-uploads/
├── schools/
│   ├── {schoolId}/
│   │   ├── logo.png              # Logo da escola
│   │   └── students/
│   │       ├── {studentId}/
│   │       │   ├── avatar.jpg
│   │       │   └── uploads/
│   │       │       ├── msg_001_img.jpg
│   │       │       └── msg_002_audio.webm
```
## Arquitetura de IA (Gemini 2.0 Flash)
### Pipeline de Processamento
```plain
Copy
Input (Aluno)           Moderação              Processamento           Output
   |                         |                        |                   |
   |-- Foto/Texto/Áudio --->|                        |                   |
   |                        |-- Content Safety ---->|                   |
   |                        |   (imagem/texto)      |                   |
   |                        |<-- Inapropriado? --   |                   |
   |                                                     |                   |
   |                        Não                       |                   |
   |                        |                         |                   |
   |----------------------->|                         |                   |
   |                        |-- Construir Prompt --->|                   |
   |                        |   (anamnese,          |                   |
   |                        |    preferências,      |                   |
   |                        |    temas proibidos)   |                   |
   |                        |                        |                   |
   |                        |-- Gemini API -------->|                   |
   |                        |   (multimodal)        |                   |
   |                        |                        |                   |
   |                        |<-- Resposta Estruturada|                   |
   |                                                   |                   |
   |-- Salvar no banco --->|                        |                   |
   |   (chatMessages)       |                        |                   |
   |                                                   |                   |
   |<-- JSON para UI ------|                        |                   |
       { intro, resumo, glossario, perguntas[] }
```
### Prompt Engineering (Estrutura)
```plain Copy
Você é um professor particular inclusivo chamado {personaName}.
 
CONTEXTO DO ALUNO:
- Nome: {firstName}
- Diagnóstico: {conditions} (TEA, TDAH...)
- Nível leitura: {readingLevel}
- Nível escrita: {writingLevel}
- Preferências: {favoriteMovies}, {favoriteSports}...
- Temas PROIBIDOS: {prohibitedThemes} (nunca mencione)

CONTEÚDO ENVIADO:
[Tipo: {contentType}]
{content}

INSTRUÇÕES:
1. Analise o conteúdo escolar enviado
2. Crie uma resposta ADAPTADA ao nível cognitivo
3. Estruture em JSON:
   {
     "introducao": "Contextualização usando {favoriteAnimations}...",
     "resumo": "Explicação simples...",
     "glossario": [{"termo": "...", "definicao": "..."}],
     "perguntas": [
       {"id": 1, "texto": "...", "tipo": "multiple_choice"},
       {"id": 2, "texto": "...", "tipo": "open"},
       {"id": 3, "texto": "..."}
     ]
   }
4. Se ENEM habilitado, adicione questão similar
Segurança (Detalhamento)
Row Level Security (RLS) - Supabase
Políticas implementadas:
sql
Copy
-- Users: Super admin vê tudo, outros veem apenas sua escola
CREATE POLICY "Users isolation" ON users
FOR ALL USING (
  auth.role() = 'super_admin' 
  OR school_id = auth.uid()
);

-- Students: Apenas escola do aluno acessa
CREATE POLICY "Students school isolation" ON students
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.school_id = students.school_id
  )
);

-- Chat Messages: Apenas o próprio aluno e professores da escola
CREATE POLICY "Chat privacy" ON chat_messages
FOR SELECT USING (
  student_id IN (
    SELECT id FROM students 
    WHERE school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  )
);
```
### Proteção de Dados Sensíveis
```Table
Dado	Proteção	Implementação
Senhas	Bcrypt (salt 10)	auth-helper.ts
Tokens aceite	Nanoid 32 chars, expiração 24h	Coluna activation_token_expires
Imagens inapropriadas	Não persistidas	Rejeitadas na moderação
API Keys	Server-only	Nunca expostas no client
Logs LGPD	Imutáveis	Tabela lgpdAcceptanceLogs, append-only
Fluxos Detalhados (Atualizados)
```
#### 1. Cadastro Completo de Aluno
```plain
Copy
Admin Escola
   |
   |-- Cria usuário (Bloco 1)
   |   ├── Gera login: maria.silva (ou maria.silva2 se existe)
   |   └── Envia email responsável (com token nanoid)
   |
Responsável (link /aceite/:token)
   |
   |-- Step 1: Visualiza dados (somente leitura)
   |-- Step 2: Preenche preferências + Aceite LGPD
   |   └── Log: IP, User-Agent, timestamp
   |-- Step 3: Cria senha para o aluno
   |   └── Token é invalidado (deleted from DB)
   |
Aluno (primeiro acesso)
   |
   |-- Login com username (maria.silva) + senha criada
   |-- Escolhe avatar (manga/pixar/android)
   |-- Escolhe nome da persona ("Tia Maria")
   |-- firstAccessCompleted = true
   |-- Acesso liberado ao chat
 ```  
#### 2. Sistema de Arquivamento (Escolas)
```plain

Super Admin/Admin Escola
   |
   |-- Solicita "exclusão" escola
   |
Sistema
   |
   |-- Opção 1: Arquivar (Soft Delete)
   |   ├── arquivada = true
   |   ├── dataArquivamento = now()
   |   └── Escola some dos dashboards ativos
   |   └── Pode ser restaurada (undo)
   |
   |-- Opção 2: Deletar Permanentemente (Hard Delete)
   |   ├── Verifica se há alunos ativos
   |   ├── Backup opcional dos dados
   |   └── deletedAt = now()
   |   └── (Futuro: anonimização dos dados)
```   
#### 3. Moderação em Tempo Real
```plain

Aluno envia imagem
   |
   |-- Upload S3 (presigned URL)
   |-- Client envia URL para /api/chat.sendMessage
   |
Server
   |
   |-- Gemini Content Safety API
   |   ├── categories: HARM_CATEGORY_DANGEROUS_CONTENT, etc
   |   ├── threshold: BLOCK_MEDIUM_AND_ABOVE
   |   └── Retorna: safe / unsafe
   |
   |-- Se UNSAFE:
   |   ├── NÃO salva mensagem no banco
   |   ├── Cria moderation_log
   |   ├── Incrementa moderation_warnings++
   |   ├── Se warnings >= 2: status = blocked
   |   └── Emails: responsável + admin
   |
   |-- Se SAFE:
       ├── Salva mensagem
       ├── Chama Gemini para resposta educacional
       └── Retorna para aluno
```       
# Variáveis de Ambiente (Obrigatórias)
````bash

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Session (32+ chars random)
SESSION_SECRET=super_secret_random_string_min_32_chars

# Google AI Studio
GEMINI_API_KEY=AIzaSy...

# Email (Resend)
RESEND_API_KEY=re_...

# AWS S3 (Uploads)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=pai-uploads

# App Config
NODE_ENV=development|production
PORT=3000
VITE_APP_URL=http://localhost:3000  # Client-side URL for links

````
# Performance & Escalabilidade
## Otimizações Implementadas
```Table
Estratégia	Implementação	Ganho
Code Splitting	Vite dynamic imports (lazy())	Bundle inicial < 200kB
Query Caching	TanStack Query (React Query)	Stale-while-revalidate, menos chamadas API
DB Connection Pool	pg-pool (via Drizzle)	Reutilização conexões PostgreSQL
Image Optimization	S3 + CloudFront (CDN)	Entrega global rápida
Compression	Express compression middleware	Gzip/Brotli responses
Limites & Rate Limiting
Gemini API: 15 req/min por aluno (implementar fila se necessário)
Login: 5 tentativas/min por IP (prevenir brute force)
Uploads: 10MB max por arquivo, 50MB total por aluno/dia
Deployment (Produção)
Build Process
````
```bash
Copy
# 1. Type check
tsc --noEmit

# 2. Build client (Vite)
vite build
# Output: dist/client/ (index.html, assets/)

# 3. Build server (ESBuild)
esbuild server/_core/index.ts --platform=node --bundle --format=esm --outdir=dist/server
# Output: dist/server/index.js

# 4. Start
node dist/server/index.js

````
# Serve static files from dist/client/ + API routes
## Infraestrutura Recomendada
````plain
Copy
┌─────────────────┐
│   CloudFlare    │  DNS + SSL + DDoS Protection
│     (DNS)       │
└────────┬────────┘
         │
┌────────▼────────┐
│   VPS/Container │  (Railway, Render, or AWS EC2)
│   Node.js 20    │
│   Express API   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌──▼────┐
│Supabase│  │ AWS S3 │
│PostgreSQL  │Storage │
└────────┘  └───────┘
Nota: Não é necessário Vercel/Next.js. Qualquer host Node.js funciona (Railway, Render, Fly.io, AWS ECS).
````
# Testes
## Estrutura de Testes (Vitest)
``````plain

server/
├── secrets.test.ts         # Validação de variáveis env
├── auth.logout.test.ts     # Testes de sessão
└── routers/
    ├── students.test.ts    # (A implementar)
    └── acceptance.test.ts  # (A implementar)
Cobertura Necessária
[x] Validação de secrets no startup
[x] Logout destrói sessão
[ ] Criação de aluno (fluxo completo)
[ ] Aceite LGPD (token expiration)
[ ] Moderação (contagem de warnings)
[ ] RLS policies (teste de isolamento)
Checklist Pré-Produção
[ ] Migrar schema completo (incluir activation_token, campos arquivada)
[ ] Configurar RLS policies no Supabase (validar por role)
[ ] Criar bucket S3 com CORS configurado
[ ] Configurar Resend (verificar domínio)
[ ] Gerar SESSION_SECRET forte (openssl rand -base64 32)
[ ] Testar fluxo E2E: Cadastro → Aceite → Primeiro Acesso → Chat
[ ] Configurar backups automáticos (Supabase)
[ ] Implementar rate limiting (Redis ou memory-store)
[ ] Configurar logs estruturados (Winston ou Pino)
[ ] Testar moderação com imagem inapropriada (verificar bloqueio)