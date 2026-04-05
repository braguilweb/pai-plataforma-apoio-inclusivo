# PAI - Guia de Deployment 🚀

Este guia fornece instruções passo a passo para fazer o deploy da PAI - Plataforma de Apoio Inclusivo em um ambiente de produção.

---

## Pré-requisitos

Antes de começar, você precisará de:

1. **Conta no Vercel** (https://vercel.com) — para hospedar a aplicação
2. **Conta no Supabase** (https://supabase.com) — para banco de dados PostgreSQL
3. **Chave de API do Gemini** (https://aistudio.google.com/apikey) — para IA
4. **Chave de API do Resend** (https://resend.com) — para emails
5. **Git instalado** no seu computador
6. **Node.js 18+** instalado

---

## Passo 1: Preparar o Repositório Git

```bash
# Clone ou crie um novo repositório
git init pai-plataforma-inclusiva
cd pai-plataforma-inclusiva

# Copie todos os arquivos do projeto para este diretório
# (Você receberá um arquivo ZIP com o projeto completo)

# Adicione ao Git
git add .
git commit -m "Initial commit: PAI - Plataforma de Apoio Inclusivo"

# Crie um repositório no GitHub (https://github.com/new)
# Depois execute:
git remote add origin https://github.com/seu-usuario/pai-plataforma-inclusiva.git
git branch -M main
git push -u origin main
```

---

## Passo 2: Configurar Banco de Dados no Supabase

1. **Acesse** https://supabase.com e faça login
2. **Clique em "New Project"**
3. **Preencha os dados:**
   - Organization: Crie uma nova ou selecione existente
   - Project name: `pai-plataforma-inclusiva`
   - Database password: Salve em local seguro
   - Region: Escolha a mais próxima de você
4. **Aguarde a criação** (leva alguns minutos)
5. **Copie a connection string:**
   - Vá para Settings → Database
   - Copie o "Connection string" (URI)
   - Salve como `DATABASE_URL`

### Executar Migrações

```bash
# No seu computador, na pasta do projeto:
export DATABASE_URL="sua_connection_string_aqui"

# Execute as migrações
pnpm drizzle-kit migrate
```

---

## Passo 3: Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Gemini AI
GEMINI_API_KEY=sua_chave_gemini_aqui

# Email
RESEND_API_KEY=re_sua_chave_resend_aqui


```

---

## Passo 4: Deploy no Vercel

### Opção A: Via Interface Web (Recomendado)

1. **Acesse** https://vercel.com/dashboard
2. **Clique em "Add New..."** → **"Project"**
3. **Selecione seu repositório GitHub** (você precisará autorizar o Vercel)
4. **Configure o projeto:**
   - Framework: Next.js
   - Root Directory: `.` (raiz)
5. **Adicione variáveis de ambiente:**
   - Vá para "Environment Variables"
   - Adicione todas as variáveis do `.env.local`
6. **Clique em "Deploy"**

### Opção B: Via CLI

```bash
# Instale o Vercel CLI
npm i -g vercel

# Faça login
vercel login

# Deploy
vercel

# Para production:
vercel --prod
```

---

## Passo 5: Configurar Domínio Customizado (Opcional)

1. **No Vercel Dashboard**, vá para seu projeto
2. **Settings** → **Domains**
3. **Adicione seu domínio**
4. **Configure os DNS records** conforme instruções do Vercel
5. **Aguarde propagação DNS** (até 48 horas)

---

## Passo 6: Validar Deployment

Após o deployment, teste:

1. **Acesse a URL** fornecida pelo Vercel (ex: `https://pai-plataforma-inclusiva.vercel.app`)
2. **Teste o login:**
   - Grupo 1: username + senha
   - Grupo 2: primeiro nome + data nascimento
3. **Teste o chat com IA**
4. **Verifique os emails** (aceites LGPD)

---

## Passo 7: Configurar Super Admin

Para criar o primeiro Super Admin:

```bash
# Conecte ao banco Supabase
psql "sua_connection_string_aqui"

# Execute:
UPDATE users SET role = 'super_admin' WHERE openId = 'seu_open_id';
```

---

## Troubleshooting

### Erro: "Database connection failed"
- Verifique se a `DATABASE_URL` está correta
- Confirme se o Supabase está rodando
- Teste a conexão localmente

### Erro: "GEMINI_API_KEY not found"
- Verifique se a chave foi adicionada nas variáveis de ambiente do Vercel
- Redeploy após adicionar a variável

### Erro: "Email not sent"
- Confirme se a `RESEND_API_KEY` está correta
- Verifique se o email de destino é válido
- Consulte logs do Resend

### Aplicação lenta
- Verifique se o banco está otimizado
- Adicione índices nas tabelas frequentemente consultadas
- Implemente caching

---

## Monitoramento em Produção

### Logs
- **Vercel:** Dashboard → Deployments → Logs
- **Supabase:** Database → Logs

### Métricas
- **Vercel Analytics:** Vá para Analytics no dashboard
- **Performance:** Monitore latência e uptime

### Alertas
- Configure alertas no Vercel para falhas de deployment
- Monitore taxa de erro de API

---

## Backup e Recuperação

### Backup do Banco

```bash
# Backup manual
pg_dump "sua_connection_string_aqui" > backup.sql

# Restaurar
psql "sua_connection_string_aqui" < backup.sql
```

Supabase realiza backups automáticos diariamente.

---

## Escalabilidade Futura

Quando a plataforma crescer:

1. **Aumentar limite de conexões** no Supabase
2. **Implementar caching** com Redis
3. **Usar CDN** para servir assets
4. **Separar workers** para processamento de IA
5. **Implementar rate limiting** mais agressivo

---

## Suporte

Para dúvidas ou problemas:

1. Consulte a documentação do Vercel: https://vercel.com/docs
2. Consulte a documentação do Supabase: https://supabase.com/docs
3. Consulte a documentação do Gemini: https://ai.google.dev/docs
4. Consulte a documentação do Resend: https://resend.com/docs

---

## Próximos Passos

Após o deployment bem-sucedido:

1. **Criar primeira escola** no painel Super Admin
2. **Cadastrar admin da escola**
3. **Cadastrar professores**
4. **Cadastrar alunos**
5. **Testar fluxo completo** de aceite LGPD
6. **Validar chat com IA**
7. **Monitorar performance** e fazer ajustes

---

**Parabéns! Sua plataforma PAI está no ar! 🎉**
