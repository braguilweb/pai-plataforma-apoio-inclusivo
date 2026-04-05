# 🚀 COMECE AQUI - Guia Rápido

## 5 Passos para Rodar a PAI

### 1️⃣ Extrair Projeto
```bash
tar -xzf pai-plataforma-inclusiva-completo.tar.gz
cd pai-plataforma-inclusiva
```

### 2️⃣ Instalar Dependências
```bash
npm install
```

### 3️⃣ Configurar Variáveis
Crie arquivo `.env.local` com:
```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=AIzaSyD...
RESEND_API_KEY=re_...
```

### 4️⃣ Executar Migrações
```bash
npm run db:push
```

### 5️⃣ Iniciar Servidor
```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 📚 Documentação Completa

Leia **TUTORIAL_COMPLETO.md** para instruções detalhadas de:
- Setup local passo a passo
- Obter chaves de API
- Deploy no Vercel
- Troubleshooting

---

## 🔗 Links Importantes

- **Supabase:** https://supabase.com
- **Gemini API:** https://aistudio.google.com/apikey
- **Resend:** https://resend.com
- **Vercel:** https://vercel.com

---

**Pronto! Divirta-se! 🎉**
