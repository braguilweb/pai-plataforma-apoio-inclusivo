# PAI - Plataforma de Apoio Inclusivo 🌟

Uma plataforma educacional inovadora que utiliza inteligência artificial para adaptar conteúdo escolar a alunos com TEA, TDAH e deficiência intelectual.

## 🎯 Visão Geral

A **PAI** é um MVP em evolução, com boa parte dos fluxos principais já implementados (Fases A e B), conectando alunos, professores, administradores escolares e super admin.

### Status real do projeto (abril/2026)

✅ Já implementado (núcleo):
- Cadastro de aluno com anamnese base e link de aceite LGPD por token
- Fluxo de aceite do responsável sem hardcode, com auditoria de aceite (IP/User-Agent)
- Primeiro acesso do aluno com persistência de persona/avatar
- Painéis de Escola, Professor e Super Admin com dados reais nas telas principais
- Moderação e bloqueio progressivo por conteúdo inadequado

⚠️ O que falta para ficar 100% completo:
- Persistência completa de **modo manutenção** no backend (toggle global + enforcement de bloqueio)
- Fluxos de **upload real** (logo/brasão e mídia) de ponta a ponta em produção
- Políticas **RLS** finais no Supabase revisadas e validadas por role
- Testes E2E dos fluxos críticos (cadastro→aceite→primeiro acesso→estudo→moderação)
- Hardening final de observabilidade e operação (alertas, métricas e playbook)

### Funcionalidades Principais

- **Autenticação Diferenciada:** Dois grupos de acesso com métodos de login adaptados
- **IA Adaptativa:** Gemini 2.0 Flash analisa conteúdo e gera respostas personalizadas
- **Segurança LGPD:** Aceites obrigatórios em múltiplos níveis
- **Moderação Inteligente:** Detecção de conteúdo inapropriado com avisos progressivos
- **Personalização por Escola:** Paletas de cores, logos e identidade visual
- **Chat Inclusivo:** Interface tipo WhatsApp com persona educacional

---

## 🏗️ Arquitetura

### Stack Técnico

| Componente | Tecnologia | Motivo |
|-----------|-----------|--------|
| Frontend | React 19 + Tailwind CSS | Interface responsiva e acessível |
| Backend | Next.js 14 + Express | API segura e type-safe com tRPC |
| Banco de Dados | Supabase (PostgreSQL) | Gratuito, RLS integrado, Auth nativa |
| IA | Gemini 2.0 Flash | Análise de imagem/texto/áudio, Content Safety |
| Email | Resend | Envio confiável de emails |
| Deploy | Vercel | Hospedagem gratuita e rápida |

### Hierarquia de Usuários

```
SUPER ADMIN (você)
├── Gerencia escolas
├── Configura avatares
└── Acessa tudo

ADMIN ESCOLA
├── Personaliza identidade visual
├── Cadastra professores e alunos
└── Libera/bloqueia acesso

PROFESSOR
├── Visualiza alunos vinculados
└── Acompanha evolução

ALUNO
└── Interage com IA (PAI)
```

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- pnpm (ou npm/yarn)
- Chaves de API (Gemini, Resend)

### Instalação Local

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/pai-plataforma-inclusiva.git
cd pai-plataforma-inclusiva

# Instale dependências
pnpm install

# Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves

# Execute migrações do banco
pnpm drizzle-kit migrate

# Inicie o servidor de desenvolvimento
pnpm dev
```

Acesse http://localhost:3000

---

## 📋 Estrutura do Projeto

```
pai-plataforma-inclusiva/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/            # Páginas por feature
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   └── lib/trpc.ts       # Cliente tRPC
│   └── public/               # Assets estáticos
├── server/                    # Backend Node.js
│   ├── routers/              # tRPC routers
│   ├── gemini.ts             # Integração Gemini
│   ├── auth-helper.ts        # Autenticação
│   ├── email-helper.ts       # Emails
│   ├── db.ts                 # Query helpers
│   └── _core/                # Framework core
├── drizzle/                   # Schema e migrações
│   └── schema.ts             # Definição de tabelas
├── shared/                    # Código compartilhado
└── ARCHITECTURE.md           # Documentação técnica
```

---

## 🔐 Segurança

### LGPD e Privacidade

- ✅ Aceites obrigatórios em múltiplos níveis
- ✅ Row Level Security (RLS) no banco
- ✅ Chaves de API protegidas no servidor
- ✅ Temas proibidos nunca enviados para IA
- ✅ Imagens inapropriadas não são salvas

### Autenticação

- **Grupo 1:** Username + Senha (bcrypt)
- **Grupo 2:** Primeiro Nome + Data Nascimento (sem senha)
- **Admin/Professor:** Credenciais locais (username/password)

### Moderação

- Detecção automática de conteúdo inapropriado
- 1ª violação: Aviso ao aluno e responsável
- 2ª violação: Bloqueio até liberação manual

---

## 📚 Documentação

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Arquitetura detalhada do sistema
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** — Guia passo a passo para deploy
- **[todo.md](./todo.md)** — Checklist de features implementadas

---

## 🧪 Testes

```bash
# Executar todos os testes
pnpm test

# Testes específicos
pnpm test server/secrets.test.ts

# Watch mode
pnpm test --watch
```

---

## 🎨 Paletas de Cores Pré-Aprovadas

| Nome | Primária | Secundária | Uso |
|------|----------|-----------|-----|
| Azul Serenidade | #2563EB | #DBEAFE | Padrão, calmo |
| Verde Natureza | #16A34A | #DCFCE7 | Esperança, crescimento |
| Roxo Criativo | #7C3AED | #EDE9FE | Criatividade, inovação |
| Laranja Energia | #EA580C | #FFEDD5 | Energia, motivação |
| Personalizada | [HEX] | [Gerada] | Identidade da escola |

---

## 🌐 Deployment

### Vercel (Recomendado)

```bash
# Deploy automático via GitHub
# Veja DEPLOYMENT_GUIDE.md para instruções detalhadas
```

### Variáveis de Ambiente Necessárias

```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
RESEND_API_KEY=re_...
RESEND_API_KEY=...
```

---

## 📱 Responsividade

- ✅ Mobile-first design
- ✅ Tablet otimizado
- ✅ Desktop completo
- ✅ Acessibilidade WCAG AA

---

## 🔄 Fluxos Principais

### 1. Cadastro de Aluno

1. Admin Escola cadastra aluno (Bloco 1 + 2)
2. Sistema gera link de aceite
3. Responsável recebe email/WhatsApp
4. Responsável preenche Bloco 3 + aceita LGPD
5. Aluno recebe acesso

### 2. Interação com IA

1. Aluno envia foto/texto/áudio
2. Gemini analisa conteúdo
3. Gera resposta estruturada (intro, resumo, glossário, 3 perguntas)
4. Aluno responde
5. IA avalia compreensão
6. Histórico inteligente (não repete conteúdo compreendido)

### 3. Moderação

1. Aluno envia imagem
2. Gemini Content Safety analisa
3. Se inapropriada: 1ª aviso, 2ª bloqueio
4. Admin libera manualmente se necessário

---

## 🐛 Troubleshooting

### Erro de Conexão com Banco

```bash
# Verifique DATABASE_URL
echo $DATABASE_URL

# Teste a conexão
psql $DATABASE_URL -c "SELECT 1"
```

### Gemini não responde

- Verifique `GEMINI_API_KEY`
- Confirme limite de requisições
- Consulte logs do Vercel

### Emails não chegam

- Verifique `RESEND_API_KEY`
- Confirme email de destino
- Consulte logs do Resend

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte a [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Verifique os [logs do Vercel](https://vercel.com)
3. Consulte documentação das APIs:
   - [Gemini](https://ai.google.dev/docs)
   - [Resend](https://resend.com/docs)
   - [Supabase](https://supabase.com/docs)

---

## 📄 Licença

Copyright (c) 2026 
Todos os direitos reservados.

Este código-fonte é de propriedade exclusiva de Guilherme Braga.
É estritamente proibida a cópia, distribuição, modificação, uso comercial ou não comercial deste código, no todo ou em parte, sem a permissão prévia, expressa e por escrito do autor.

---

## 🙏 Agradecimentos

Desenvolvido com ❤️ para tornar a educação mais inclusiva.

**Versão:** 1.0.0  
**Data:** Março 2026  
**Status:** MVP funcional (em evolução para conclusão 100%)
