# 🚀 PAI - Tutorial Completo de Setup Local e Deploy

Este tutorial guia você passo a passo para rodar a PAI na sua máquina e fazer deploy em produção.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Setup Local](#setup-local)
3. [Configurar Variáveis de Ambiente](#configurar-variáveis-de-ambiente)
4. [Executar Localmente](#executar-localmente)
5. [Deploy em Produção](#deploy-em-produção)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

Antes de começar, você precisa ter instalado:

### 1. Node.js 18+ e pnpm

```bash
# Verificar se Node.js está instalado
node -v
# Deve retornar v18.0.0 ou superior

# Verificar se pnpm está instalado
pnpm -v
# Se não tiver, instale:
npm install -g pnpm
```

**Se não tiver Node.js:**
- **Windows/macOS:** Baixe em https://nodejs.org (versão LTS)
- **Linux:** `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs`

### 2. Git

```bash
git --version
# Se não tiver, instale:
# Windows: https://git-scm.com/download/win
# macOS: brew install git
# Linux: sudo apt-get install git
```

### 3. Contas Online (Gratuitas)

Você precisará criar contas em:

- **Supabase** (banco de dados): https://supabase.com
- **Resend** (emails): https://resend.com
- **Google Cloud** (Gemini AI): https://aistudio.google.com/apikey
- **Vercel** (deploy): https://vercel.com

---

## 📁 Setup Local

### Passo 1: Extrair o Projeto

```bash
# Extraia o arquivo pai-plataforma-inclusiva-completo.tar.gz
tar -xzf pai-plataforma-inclusiva-completo.tar.gz

# Ou no Windows, use 7-Zip ou WinRAR

cd pai-plataforma-inclusiva
```

### Passo 2: Instalar Dependências

```bash
# Instale todas as dependências com npm
npm install

# Isso pode levar 2-5 minutos na primeira vez
```

### Passo 3: Criar Arquivo de Configuração

```bash
# Crie um arquivo .env.local na raiz do projeto
# Windows (PowerShell):
New-Item -Path ".env.local" -ItemType File

# macOS/Linux:
touch .env.local
```

---

## 🔐 Configurar Variáveis de Ambiente

### Passo 1: Obter Chaves de API

#### 1.1 Database URL (Supabase)

1. Acesse https://supabase.com e faça login
2. Clique em "New Project"
3. Preencha:
   - **Project name:** `pai-plataforma-inclusiva`
   - **Database password:** Salve em local seguro
   - **Region:** Escolha a mais próxima
4. Aguarde criação (5-10 minutos)
5. Vá para **Settings → Database**
6. Copie a **Connection string** (URI)
7. Salve como `DATABASE_URL`

#### 1.2 Gemini API Key

1. Acesse https://aistudio.google.com/apikey
2. Clique em "Create API key"
3. Copie a chave
4. Salve como `GEMINI_API_KEY`

#### 1.3 Resend API Key

1. Acesse https://resend.com
2. Faça login/cadastro
3. Vá para **API Keys**
4. Clique em "Create API Key"
5. Copie a chave (começa com `re_`)
6. Salve como `RESEND_API_KEY`

### Passo 2: Editar .env.local

Abra o arquivo `.env.local` e adicione:

```env
# Database (do Supabase)
DATABASE_URL=postgresql://user:password@host:5432/database

# Gemini AI
GEMINI_API_KEY=AIzaSyD...

# Resend Email
RESEND_API_KEY=re_SQAD28Ea_...
```

**⚠️ IMPORTANTE:** Nunca compartilhe este arquivo! Adicione `.env.local` ao `.gitignore`

---

## 🏃 Executar Localmente

### Passo 1: Executar Migrações do Banco

```bash
# Isso cria as tabelas no Supabase
npm run db:push
```

### Passo 2: Iniciar Servidor de Desenvolvimento

```bash
# Inicia o servidor em http://localhost:3000
npm run dev
```

Você verá:
```
Server running on http://localhost:3000/
```

### Passo 3: Acessar a Aplicação

1. Abra o navegador em http://localhost:3000
2. Você verá a página inicial da PAI
3. Faça login (use suas credenciais ou crie uma conta)

### Passo 4: Testar Funcionalidades

- ✅ Teste o login
- ✅ Teste o chat com IA
- ✅ Verifique os emails (Resend)
- ✅ Teste a moderação de imagens

---

## 🚀 Deploy em Produção

### Passo 1: Criar Repositório GitHub

```bash
# Inicialize o Git (se não estiver)
git init

# Adicione todos os arquivos
git add .

# Faça o primeiro commit
git commit -m "Initial commit: PAI - Plataforma de Apoio Inclusivo"

# Crie um repositório no GitHub: https://github.com/new
# Depois execute:
git remote add origin https://github.com/seu-usuario/pai-plataforma-inclusiva.git
git branch -M main
git push -u origin main
```

### Passo 2: Deploy no Vercel

#### Opção A: Via Interface Web (Recomendado)

1. Acesse https://vercel.com/dashboard
2. Clique em **"Add New..." → "Project"**
3. Selecione seu repositório GitHub
4. Configure:
   - **Framework:** Next.js
   - **Root Directory:** `.`
5. Clique em **"Environment Variables"**
6. Adicione as mesmas variáveis do `.env.local`:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `RESEND_API_KEY`
7. Clique em **"Deploy"**

#### Opção B: Via CLI

```bash
# Instale Vercel CLI
npm install -g vercel

# Faça login
vercel login

# Deploy
vercel

# Para production:
vercel --prod
```

### Passo 3: Configurar Domínio (Opcional)

1. No Vercel Dashboard, vá para seu projeto
2. **Settings → Domains**
3. Adicione seu domínio customizado
4. Configure os DNS records conforme instruções

### Passo 4: Validar Deploy

Após o deploy:

1. Acesse a URL fornecida pelo Vercel
2. Teste o login
3. Teste o chat com IA
4. Verifique os logs em **Vercel Dashboard → Logs**

---

## 🐛 Troubleshooting

### Erro: "Cannot find module '@google/generative-ai'"

```bash
pnpm install @google/generative-ai
```

### Erro: "DATABASE_URL is not defined"

```bash
# Verifique se o arquivo .env.local existe
ls -la .env.local

# Verifique se DATABASE_URL está definida
echo $DATABASE_URL

# Se vazio, edite .env.local novamente
```

### Erro: "GEMINI_API_KEY not found"

```bash
# Verifique se a chave foi adicionada ao .env.local
cat .env.local | grep GEMINI_API_KEY

# Se vazio, adicione a chave
```

### Porta 3000 já em uso

```bash
# Use outra porta
PORT=3001 pnpm dev
```

### Erro de conexão com Supabase

```bash
# Teste a conexão
psql "sua_connection_string_aqui" -c "SELECT 1"

# Se não funcionar, verifique:
# 1. DATABASE_URL está correta?
# 2. Supabase está rodando?
# 3. Firewall permite conexão?
```

### Emails não chegam

1. Verifique se `RESEND_API_KEY` está correta
2. Confirme se o email de destino é válido
3. Consulte logs do Resend: https://resend.com/logs

### Build lento ou falha

```bash
# Limpe cache e reinstale
rm -rf node_modules package-lock.json
npm install

# Tente novamente
npm run build
```

---

## 📊 Estrutura do Projeto

```
pai-plataforma-inclusiva/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/            # Páginas
│   │   ├── components/       # Componentes
│   │   └── lib/trpc.ts       # Cliente tRPC
│   └── public/               # Assets
├── server/                    # Backend Node.js
│   ├── routers/              # tRPC routers
│   ├── gemini.ts             # Integração Gemini
│   ├── auth-helper.ts        # Autenticação
│   ├── email-helper.ts       # Emails
│   └── _core/                # Framework core
├── drizzle/                   # Banco de dados
│   └── schema.ts             # Tabelas
├── shared/                    # Código compartilhado
├── .env.local                # Variáveis de ambiente (NÃO COMPARTILHE!)
├── README.md                 # Visão geral
├── ARCHITECTURE.md           # Arquitetura técnica
└── DEPLOYMENT_GUIDE.md       # Guia de deployment
```

---

## 📝 Comandos Úteis

```bash
# Desenvolvimento
npm run dev                      # Inicia servidor de desenvolvimento
npm run build                    # Build para produção
npm start                        # Inicia servidor de produção

# Testes
npm test                         # Executa testes
npm run check                    # Verifica TypeScript

# Banco de dados
npm run db:push                  # Executa migrações

# Limpeza
rm -rf node_modules              # Remove dependências
```

---

## 🔐 Segurança

### Boas Práticas

1. **Nunca compartilhe `.env.local`**
   - Adicione ao `.gitignore`
   - Não faça commit deste arquivo

2. **Proteja suas chaves de API**
   - Use variáveis de ambiente
   - Rotacione chaves regularmente

3. **Use HTTPS em produção**
   - Vercel fornece HTTPS automaticamente
   - Configure domínio customizado com SSL

4. **Monitore logs**
   - Verifique logs do Vercel regularmente
   - Procure por erros de autenticação

---

## 📞 Suporte

Se encontrar problemas:

1. Consulte [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. Consulte [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)
3. Verifique documentação das APIs:
   - [Supabase Docs](https://supabase.com/docs)
   - [Gemini Docs](https://ai.google.dev/docs)
   - [Resend Docs](https://resend.com/docs)
   - [Vercel Docs](https://vercel.com/docs)

---

## ✅ Checklist de Deploy

Antes de colocar em produção:

- [ ] Todas as variáveis de ambiente configuradas
- [ ] Banco de dados migrado
- [ ] Testes passando (`pnpm test`)
- [ ] Build sem erros (`pnpm build`)
- [ ] Repositório GitHub criado e sincronizado
- [ ] Projeto Vercel criado
- [ ] Variáveis de ambiente adicionadas no Vercel
- [ ] Deploy realizado com sucesso
- [ ] Aplicação testada em produção
- [ ] Domínio customizado configurado (opcional)

---

## 🎉 Pronto!

Sua PAI está pronta para uso! 

**Próximos passos:**

1. Criar primeira escola no painel Super Admin
2. Cadastrar admin da escola
3. Cadastrar professores
4. Cadastrar alunos
5. Testar fluxo completo de aceite LGPD
6. Validar chat com IA
7. Monitorar performance

---

**Desenvolvido com ❤️ para tornar a educação mais inclusiva**

Versão: 1.0.0  
Data: Março 2026  
Status: MVP Pronto para Produção
