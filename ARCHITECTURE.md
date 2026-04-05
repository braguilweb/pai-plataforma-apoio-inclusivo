# PAI - Plataforma de Apoio Inclusivo — Arquitetura

## Visão Geral

A **PAI** é uma plataforma educacional inclusiva que utiliza inteligência artificial (Gemini 2.0 Flash) para adaptar conteúdo escolar a alunos com TEA, TDAH e deficiência intelectual. A arquitetura segue princípios de segurança, acessibilidade e escalabilidade.

---

## Stack Técnico

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Frontend | React 19 + Tailwind CSS 4 | Interface responsiva, mobile-first, acessível |
| Backend | Next.js 14 (App Router) + Express | API segura, proteção de chaves, tRPC type-safe |
| Banco de Dados | Supabase (PostgreSQL) | Gratuito, RLS integrado, Auth nativa |
| IA | Gemini 2.0 Flash | Gratuito, análise de imagem/texto/áudio, Content Safety |
| Áudio | Web Speech API | Nativa do browser, gratuito, sem servidor |
| Email | Resend | Gratuito para MVP, confiável |
| Deploy | Vercel | Gratuito, integração Next.js perfeita |

---

## Hierarquia de Usuários

```
SUPER ADMIN (você)
├── Gerencia escolas
├── Configura avatares disponíveis
└── Acessa tudo

ADMIN ESCOLA
├── Personaliza identidade visual
├── Cadastra professores
├── Cadastra alunos
├── Libera/bloqueia acesso
└── Recebe alertas

PROFESSOR
├── Visualiza alunos vinculados
├── Acessa relatórios
└── Acompanha evolução

ALUNO
└── Interage com IA (PAI)
```

---

## Modelo de Dados

### Tabelas Principais

#### `schools`
Armazena informações das escolas cadastradas.

```
id (PK)
name (string)
admin_id (FK → users)
logo_url (string, nullable)
color_palette (enum: azul_serenidade | verde_natureza | roxo_criativo | laranja_energia | personalizada)
custom_color_hex (string, nullable)
lgpd_accepted (boolean)
lgpd_accepted_at (timestamp)
created_at (timestamp)
updated_at (timestamp)
```

#### `users`
Tabela base de usuários (estendida do template).

```
id (PK)
openId (string, unique)
name (string)
email (string)
role (enum: super_admin | admin_school | teacher | student)
school_id (FK → schools, nullable)
group_access (enum: reads_writes | non_reads_writes, nullable)
login_username (string, nullable) — para Grupo 1
login_password_hash (string, nullable) — para Grupo 1
first_name (string, nullable) — para Grupo 2
birth_date (date, nullable) — para Grupo 2
lgpd_accepted (boolean)
lgpd_accepted_at (timestamp)
status (enum: active | blocked | pending_approval)
created_at (timestamp)
updated_at (timestamp)
```

#### `students`
Informações específicas de alunos.

```
id (PK)
user_id (FK → users)
school_id (FK → schools)
series (enum: 1º_ano | 2º_ano | 3º_ano)
teacher_id (FK → users, nullable)
persona_name (string) — Prof. Guilherme | Gui | Tio Gui | Tio Guilherme
avatar_style (enum: manga | pixar | android)
preferred_subjects (array of strings)
enem_enabled (boolean)
moderation_warnings (int, default: 0)
blocked_at (timestamp, nullable)
created_at (timestamp)
updated_at (timestamp)
```

#### `anamnesis`
Dados de anamnese do aluno (4 blocos).

```
id (PK)
student_id (FK → students)
block_1_completed (boolean)
block_2_completed (boolean)
block_3_completed (boolean)
block_4_completed (boolean)

— Bloco 1: Identificação
guardian_name (string)
guardian_contact_whatsapp (string)
guardian_contact_email (string, nullable)

— Bloco 2: Diagnóstico
conditions (array: tea | tdah | di | outro)
reading_level (enum: non_reader | reads_with_difficulty | reads_well)
writing_level (enum: non_writer | writes_with_difficulty | writes_well)
observations (text)

— Bloco 3: Preferências
favorite_movies (text)
favorite_music (text)
favorite_sports (text)
favorite_foods (text)
favorite_animations (text)
other_interests (text)
prohibited_themes (array, max 3) — visível só para escola/responsável

— Bloco 4: Plano de Estudo
subjects (array of strings)

created_at (timestamp)
updated_at (timestamp)
```

#### `chat_messages`
Histórico de mensagens no chat.

```
id (PK)
student_id (FK → students)
message_type (enum: student_input | ai_response)
content_type (enum: text | image | audio)
content (text/url)
image_url (string, nullable)
audio_url (string, nullable)
is_comprehended (boolean, nullable) — null = aguardando resposta
comprehension_score (float, nullable) — 0-1
subject_topic (string) — matéria/assunto
version_number (int) — controle de versão do conteúdo
previous_version_id (FK → chat_messages, nullable)
created_at (timestamp)
updated_at (timestamp)
```

#### `moderation_logs`
Registro de eventos de moderação.

```
id (PK)
student_id (FK → students)
message_id (FK → chat_messages)
violation_type (enum: inappropriate_image | other)
warning_count (int)
action_taken (enum: warning | blocked)
guardian_notified (boolean)
admin_notified (boolean)
admin_action_required (boolean)
admin_action_taken_at (timestamp, nullable)
created_at (timestamp)
```

#### `color_palettes`
Paletas de cores pré-aprovadas.

```
id (PK)
name (string)
primary_color (string, hex)
secondary_color (string, hex)
background_color (string, hex)
text_color (string, hex)
is_default (boolean)
created_at (timestamp)
```

---

## Fluxos Principais

### 1. Autenticação Diferenciada

**Grupo 1 (Lê e Escreve):**
1. Aluno acessa `/login`
2. Insere `nomeSobrenome` (ex: mariaSilva)
3. Insere senha (definida pelo próprio aluno)
4. Sistema valida contra `users.login_username` e `login_password_hash`
5. Se esqueceu: opção de reset via responsável/admin/pergunta de segurança

**Grupo 2 (Não Lê / Não Escreve):**
1. Responsável/tutor acessa `/login`
2. Insere primeiro nome do aluno (ex: Maria)
3. Insere data de nascimento (DD/MM/YYYY)
4. Sistema valida contra `students.first_name` e `students.birth_date`
5. Sem senha, sessão mantida até logout manual com alerta de confirmação

### 2. Cadastro de Anamnese (4 Blocos)

**Bloco 1 (Admin Escola):** Identificação, série, grupo de acesso, contatos
**Bloco 2 (Admin Escola):** Diagnóstico, níveis de leitura/escrita
**Bloco 3 (Responsável):** Preenchido via link de aceite LGPD
**Bloco 4 (Admin/Professor):** Matérias BNCC, flag ENEM

### 3. Fluxo Chat Aluno

1. Aluno faz login
2. Primeiro acesso: escolhe nome da persona + avatar + lê regras
3. Aluno envia foto/texto/áudio
4. Backend envia para Gemini com contexto (preferências, temas proibidos, nível)
5. Gemini retorna resposta estruturada (introdução, resumo, glossário, 3 perguntas)
6. Aluno responde (foto/áudio/botão)
7. Gemini analisa compreensão
8. Se compreendeu: salva e não repete
9. Se não compreendeu: gera nova versão

### 4. Moderação com Content Safety

1. Aluno envia imagem
2. Gemini Content Safety analisa
3. Se inapropriada:
   - 1ª vez: aviso ao aluno + emails + log
   - 2ª vez: bloqueio + emails + aguarda admin
4. Admin libera acesso manualmente

---

## Segurança

### LGPD e Consentimento

- **Escola:** Aceita LGPD ao se cadastrar (obrigatório)
- **Professor:** Aceita LGPD no primeiro login (obrigatório)
- **Responsável:** Recebe link via email/WhatsApp, preenche Bloco 3 e aceita LGPD
- **Aluno (maior):** Aceita LGPD no primeiro acesso

### Proteção de Dados

- **RLS (Row Level Security):** Cada usuário vê apenas seus dados
- **API Key Gemini:** Nunca no frontend, sempre no servidor
- **Temas Proibidos:** Nunca enviados direto para IA, usados como filtro no prompt
- **Imagens Inapropriadas:** Não são salvas, apenas log do evento
- **HTTPS:** Automático via Vercel
- **Rate Limiting:** Implementado em todas as rotas

### Autenticação

- **Super Admin:** Credenciais locais (username/password + role check)
- **Admin Escola:** Credenciais locais (username/password + role check)
- **Professor:** Credenciais locais (username/password + role check)
- **Aluno Grupo 1:** Username/Password (hash bcrypt)
- **Aluno Grupo 2:** First Name + Birth Date (sem senha)

---

## Paletas de Cores Pré-Aprovadas

| Nome | Primária | Secundária | Fundo | Texto |
|------|----------|-----------|-------|-------|
| Azul Serenidade (padrão) | #2563EB | #DBEAFE | #F8FAFC | #1E293B |
| Verde Natureza | #16A34A | #DCFCE7 | #F8FAFC | #1E293B |
| Roxo Criativo | #7C3AED | #EDE9FE | #F8FAFC | #1E293B |
| Laranja Energia | #EA580C | #FFEDD5 | #F8FAFC | #1E293B |
| Personalizada | [HEX do admin] | [Gerada] | #F8FAFC | #1E293B |

---

## Rotas e Páginas

### Públicas
- `/` — Landing page
- `/login` — Login (diferenciado por grupo)
- `/aceite-lgpd/:token` — Formulário de aceite para responsável

### Super Admin
- `/admin/dashboard` — Dashboard
- `/admin/escolas` — Gerenciamento de escolas
- `/admin/avatares` — Configuração de avatares

### Admin Escola
- `/escola/dashboard` — Dashboard
- `/escola/identidade-visual` — Personalização (logo, cores)
- `/escola/professores` — Gerenciamento de professores
- `/escola/alunos` — Gerenciamento de alunos
- `/escola/alunos/:id/anamnese` — Cadastro de anamnese
- `/escola/alertas` — Alertas de moderação

### Professor
- `/professor/dashboard` — Dashboard
- `/professor/alunos` — Lista de alunos
- `/professor/alunos/:id/relatorio` — Relatório do aluno

### Aluno
- `/aluno/chat` — Interface chat com IA
- `/aluno/historico` — Histórico de conversas
- `/aluno/perfil` — Configurações do aluno

---

## Variáveis de Ambiente

```
# Banco de Dados
DATABASE_URL=postgresql://...

# Gemini AI
GEMINI_API_KEY=...

# Email
RESEND_API_KEY=...

# Autenticação
- Senhas hashadas com bcrypt
- Sessions usando cookies HTTP-only
- Role-based access control em todos os endpoints
```

---

## Considerações de Performance

- **Caching:** Preferências do aluno em cache (5 min)
- **Lazy Loading:** Histórico de chat carregado sob demanda
- **Compressão:** Imagens comprimidas antes do upload
- **CDN:** Logos/brasões servidos via CDN
- **Rate Limiting:** 10 requisições/min por aluno para Gemini

---

## Próximos Passos

1. Criar schema SQL no Supabase
2. Implementar autenticação diferenciada
3. Desenvolver painel admin
4. Integrar Gemini 2.0 Flash
5. Implementar moderação
6. Testes e ajustes
7. Deploy em Vercel
