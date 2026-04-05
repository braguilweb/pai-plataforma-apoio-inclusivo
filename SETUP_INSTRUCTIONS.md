# PAI - Instruções de Setup 📋

Este documento fornece instruções detalhadas para configurar a PAI localmente ou em produção.

## 1. Variáveis de Ambiente Necessárias

Você precisará das seguintes chaves de API:

### 1.1 Database (Supabase)
- **O quê:** Connection string PostgreSQL
- **Onde obter:** https://supabase.com
- **Variável:** `DATABASE_URL`
- **Formato:** `postgresql://user:password@host:5432/database`

### 1.2 Gemini AI
- **O quê:** Chave de API do Google Gemini 2.0 Flash
- **Onde obter:** https://aistudio.google.com/apikey
- **Variável:** `GEMINI_API_KEY`
- **Gratuito:** Sim, com limite de requisições

### 1.3 Resend Email
- **O quê:** Chave de API para envio de emails
- **Onde obter:** https://resend.com
- **Variável:** `RESEND_API_KEY`
- **Formato:** Começa com `re_`
- **Gratuito:** Sim, com limite de emails

### 1.4 OAuth Manus (Automático)
- **O quê:** Credenciais de autenticação
- **Variáveis:** `VITE_APP_ID`, `OAUTH_SERVER_URL`, `JWT_SECRET`, etc.
- **Nota:** Preenchidas automaticamente pelo Vercel

## 2. Setup Local

### 2.1 Clonar Repositório

```bash
git clone https://github.com/seu-usuario/pai-plataforma-inclusiva.git
cd pai-plataforma-inclusiva
```

### 2.2 Instalar Dependências

```bash
pnpm install
# ou
npm install
```

### 2.3 Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Gemini AI
GEMINI_API_KEY=AIzaSyD...

# Resend Email
RESEND_API_KEY=re_SQAD28Ea_...

# OAuth (será preenchido pelo Vercel em produção)
VITE_APP_ID=seu_app_id
OAUTH_SERVER_URL=https://api.manus.im
JWT_SECRET=seu_jwt_secret

# URLs
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=sua_chave
```

### 2.4 Executar Migrações do Banco

```bash
pnpm drizzle-kit migrate
```

### 2.5 Iniciar Servidor de Desenvolvimento

```bash
pnpm dev
```

Acesse http://localhost:3000

## 3. Setup em Produção (Vercel)

Veja o arquivo [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) para instruções completas.

## 4. Verificar Instalação

### 4.1 Testes

```bash
# Executar testes
pnpm test

# Verificar TypeScript
pnpm check
```

### 4.2 Build

```bash
# Build para produção
pnpm build

# Iniciar servidor de produção
pnpm start
```

## 5. Primeiro Acesso

### 5.1 Criar Super Admin

```bash
# Conecte ao banco Supabase
psql "sua_connection_string_aqui"

# Encontre seu usuário
SELECT id, openId, role FROM users LIMIT 1;

# Atualize para super_admin
UPDATE users SET role = 'super_admin' WHERE openId = 'seu_open_id';
```

### 5.2 Acessar a Plataforma

1. Acesse http://localhost:3000 (local) ou sua URL do Vercel (produção)
2. Faça login com suas credenciais
3. Você terá acesso ao painel Super Admin

## 6. Estrutura de Pastas

```
pai-plataforma-inclusiva/
├── client/                    # Frontend
├── server/                    # Backend
├── drizzle/                   # Banco de dados
├── shared/                    # Código compartilhado
├── README.md                  # Visão geral
├── ARCHITECTURE.md            # Arquitetura técnica
├── DEPLOYMENT_GUIDE.md        # Guia de deployment
└── SETUP_INSTRUCTIONS.md      # Este arquivo
```

## 7. Troubleshooting

### Erro: "Cannot find module '@google/generative-ai'"

```bash
pnpm install @google/generative-ai
```

### Erro: "DATABASE_URL is not defined"

```bash
# Verifique se .env.local existe
ls -la .env.local

# Verifique se DATABASE_URL está definida
echo $DATABASE_URL
```

### Erro: "GEMINI_API_KEY not found"

```bash
# Verifique se a chave foi adicionada
echo $GEMINI_API_KEY

# Se vazio, adicione ao .env.local
```

### Porta 3000 já em uso

```bash
# Use outra porta
PORT=3001 pnpm dev
```

## 8. Próximos Passos

1. ✅ Completar setup local/produção
2. ✅ Criar primeira escola
3. ✅ Cadastrar admin da escola
4. ✅ Cadastrar professores
5. ✅ Cadastrar alunos
6. ✅ Testar fluxo completo
7. ✅ Monitorar performance

## 9. Documentação Adicional

- [README.md](./README.md) — Visão geral do projeto
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Arquitetura detalhada
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) — Deployment passo a passo

## 10. Suporte

Para dúvidas:

1. Consulte a documentação dos serviços:
   - [Supabase Docs](https://supabase.com/docs)
   - [Gemini Docs](https://ai.google.dev/docs)
   - [Resend Docs](https://resend.com/docs)
   - [Vercel Docs](https://vercel.com/docs)

2. Verifique os logs:
   - Local: Console do seu terminal
   - Produção: Vercel Dashboard → Logs

---

**Pronto! Sua PAI está configurada e pronta para uso! 🚀**
