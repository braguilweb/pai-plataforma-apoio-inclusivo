import { Resend } from "resend";

// ============================================================================
// CONFIGURAÇÃO BASE
// ============================================================================

/** E-mail remetente padrão de todas as comunicações da plataforma */
const FROM_EMAIL = "onboarding@resend.dev";

/**
 * Retorna uma instância do cliente Resend se a chave de API estiver configurada.
 * Caso contrário, loga um aviso e retorna null (e-mail desabilitado em dev).
 */
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      "[email-helper] RESEND_API_KEY não configurada — envio de e-mail desabilitado."
    );
    return null;
  }

  return new Resend(apiKey);
}

// ============================================================================
// HELPER INTERNO: Layout base do e-mail
// Garante consistência visual em todos os e-mails da plataforma.
// ============================================================================

/**
 * Gera o HTML base para todos os e-mails da plataforma.
 *
 * @param content - Conteúdo interno (corpo do e-mail em HTML)
 * @returns String HTML completa e responsiva
 */
function buildEmailLayout(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Plataforma PAI</title>
    </head>
    <body style="
      margin: 0;
      padding: 0;
      background-color: #F3F4F6;
      font-family: Arial, sans-serif;
    ">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px;">
        <tr>
          <td align="center">

            <!-- Container principal -->
            <table
              width="600"
              cellpadding="0"
              cellspacing="0"
              style="
                background-color: #FFFFFF;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                max-width: 600px;
                width: 100%;
              "
            >
              <!-- Cabeçalho com logo/marca -->
              <tr>
                <td style="
                  background-color: #4F46E5;
                  padding: 28px 32px;
                  text-align: center;
                ">
                  <h1 style="
                    color: #FFFFFF;
                    margin: 0;
                    font-size: 22px;
                    font-weight: bold;
                    letter-spacing: 0.5px;
                  ">
                    📚 Plataforma PAI
                  </h1>
                  <p style="
                    color: #C7D2FE;
                    margin: 6px 0 0;
                    font-size: 13px;
                  ">
                    Plataforma de Apoio Inclusivo
                  </p>
                </td>
              </tr>

              <!-- Conteúdo dinâmico injetado -->
              <tr>
                <td style="padding: 32px;">
                  ${content}
                </td>
              </tr>

              <!-- Rodapé padrão -->
              <tr>
                <td style="
                  background-color: #F9FAFB;
                  padding: 20px 32px;
                  text-align: center;
                  border-top: 1px solid #E5E7EB;
                ">
                  <p style="
                    color: #9CA3AF;
                    font-size: 12px;
                    margin: 0;
                    line-height: 1.6;
                  ">
                    Este é um e-mail automático. Por favor, não responda.<br />
                    © ${new Date().getFullYear()} Plataforma PAI — Todos os direitos reservados.
                  </p>
                </td>
              </tr>

            </table>
            <!-- /Container principal -->

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ============================================================================
// HELPER INTERNO: Botão de ação (CTA)
// Reutilizado em qualquer e-mail que precise de um link destacado.
// ============================================================================

/**
 * Gera HTML de um botão de ação padronizado.
 *
 * @param href  - URL de destino do botão
 * @param label - Texto exibido no botão
 * @param color - Cor de fundo em hex (padrão: indigo)
 */
function buildCtaButton(
  href: string,
  label: string,
  color = "#4F46E5"
): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 24px 0;">
          <a
            href="${href}"
            style="
              background-color: ${color};
              color: #FFFFFF;
              text-decoration: none;
              padding: 14px 36px;
              border-radius: 8px;
              font-size: 15px;
              font-weight: bold;
              display: inline-block;
            "
          >
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

// ============================================================================
// FUNÇÃO 1: sendSchoolCreatedConfirmation
// Enviada ao admin recém-criado com o link para definir sua senha
// e ativar a conta pela primeira vez.
// ============================================================================

/**
 * Envia o e-mail de confirmação de cadastro da escola ao administrador,
 * incluindo o link de ativação para ele definir sua senha e acessar a plataforma.
 *
 * @param schoolName     - Nome da escola recém-cadastrada
 * @param adminName      - Nome do administrador da escola
 * @param adminEmail     - E-mail do administrador (destinatário)
 * @param activationLink - Link gerado com token para definição de senha
 *                         Expira em 24 horas.
 */
export async function sendSchoolCreatedConfirmation({
  schoolName,
  adminName,
  adminEmail,
  activationLink,
}: {
  schoolName: string;
  adminName: string;
  adminEmail: string;
  activationLink: string; // NOVO: link com token de ativação
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();

  if (!resend) {
    return { success: false, error: "Serviço de e-mail não configurado." };
  }

  // Conteúdo específico deste e-mail
  const content = `
    <h2 style="color: #111827; margin-top: 0; font-size: 20px;">
      Bem-vindo(a) à Plataforma PAI! 🎉
    </h2>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 12px;">
      Olá, <strong>${adminName}</strong>!
    </p>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 12px;">
      A escola <strong>${schoolName}</strong> foi cadastrada com sucesso
      na Plataforma de Apoio Inclusivo (PAI).
    </p>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 4px;">
      Para ativar sua conta de administrador e configurar sua senha de acesso,
      clique no botão abaixo:
    </p>

    <!-- Botão de ativação -->
    ${buildCtaButton(activationLink, "✅ Ativar minha conta e definir senha")}

    <!-- Link alternativo (fallback para clientes de e-mail que bloqueiam botões) -->
    <p style="color: #6B7280; font-size: 13px; margin: 0 0 4px;">
      Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
    </p>
    <p style="word-break: break-all; margin: 0 0 20px;">
      <a href="${activationLink}" style="color: #4F46E5; font-size: 13px;">
        ${activationLink}
      </a>
    </p>

    <!-- Aviso de expiração -->
    <div style="
      background-color: #FEF9C3;
      border-left: 4px solid #EAB308;
      border-radius: 6px;
      padding: 12px 16px;
      margin-top: 8px;
    ">
      <p style="margin: 0; color: #713F12; font-size: 13px; line-height: 1.6;">
        ⚠️ <strong>Atenção:</strong> Este link é válido por <strong>24 horas</strong>.
        Após esse período, entre em contato com o suporte para solicitar um novo link.
      </p>
    </div>

    <!-- Aviso de segurança -->
    <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px; line-height: 1.6;">
      Se você não solicitou este acesso ou não reconhece este cadastro,
      por favor ignore este e-mail. Nenhuma ação será tomada automaticamente.
    </p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `✅ Ative sua conta — ${schoolName} está pronta na PAI`,
      html: buildEmailLayout(content),
    });

    console.log(
      `[email-helper] E-mail de ativação enviado para ${adminEmail} (escola: ${schoolName})`
    );

    return { success: true };
  } catch (error) {
    console.error(
      "[email-helper] Falha ao enviar e-mail de confirmação de escola:",
      error
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao enviar e-mail.",
    };
  }
}

// ============================================================================
// FUNÇÃO 2: sendLgpdAcceptanceLink
// Enviada ao responsável para aceite dos termos LGPD do aluno.
// ============================================================================

/**
 * Envia o link de aceite dos termos LGPD ao responsável pelo aluno.
 *
 * @param guardianEmail  - E-mail do responsável (destinatário)
 * @param guardianName   - Nome do responsável
 * @param studentName    - Nome do aluno vinculado ao aceite
 * @param acceptanceLink - Link para a página de aceite (expira em 7 dias)
 */
export async function sendLgpdAcceptanceLink({
  guardianEmail,
  guardianName,
  studentName,
  acceptanceLink,
}: {
  guardianEmail: string;
  guardianName: string;
  studentName: string;
  acceptanceLink: string;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();

  if (!resend) {
    return { success: false, error: "Serviço de e-mail não configurado." };
  }

  const content = `
    <h2 style="color: #111827; margin-top: 0; font-size: 20px;">
      Aceite de Termos LGPD
    </h2>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 12px;">
      Olá, <strong>${guardianName}</strong>!
    </p>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 12px;">
      Recebemos o cadastro de <strong>${studentName}</strong> na
      Plataforma de Apoio Inclusivo (PAI).
    </p>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 4px;">
      Para que <strong>${studentName}</strong> possa começar a usar a plataforma,
      precisamos que você revise e aceite nossos termos de uso e
      política de privacidade (LGPD).
    </p>

    ${buildCtaButton(acceptanceLink, "📋 Revisar e Aceitar Termos", "#2563EB")}

    <div style="
      background-color: #FEF9C3;
      border-left: 4px solid #EAB308;
      border-radius: 6px;
      padding: 12px 16px;
    ">
      <p style="margin: 0; color: #713F12; font-size: 13px; line-height: 1.6;">
        ⚠️ Este link expira em <strong>7 dias</strong>.
      </p>
    </div>

    <p style="color: #374151; line-height: 1.7; margin-top: 20px;">
      Atenciosamente,<br />
      <strong>Equipe PAI</strong>
    </p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: guardianEmail,
      subject: `PAI — Aceite de Termos para ${studentName}`,
      html: buildEmailLayout(content),
    });

    console.log(
      `[email-helper] E-mail LGPD enviado para ${guardianEmail} (aluno: ${studentName})`
    );

    return { success: true };
  } catch (error) {
    console.error(
      "[email-helper] Falha ao enviar e-mail de aceite LGPD:",
      error
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao enviar e-mail.",
    };
  }
}

// ============================================================================
// FUNÇÃO 3: sendModerationWarning
// Enviada ao responsável e ao admin quando um aluno envia conteúdo inapropriado.
// ============================================================================

/**
 * Notifica o responsável e o administrador da escola sobre uma ocorrência
 * de moderação envolvendo um aluno.
 *
 * @param guardianEmail  - E-mail do responsável pelo aluno
 * @param adminEmail     - E-mail do administrador da escola
 * @param studentName    - Nome do aluno envolvido
 * @param warningNumber  - Número do aviso (1 = alerta, 2 = bloqueio)
 * @param schoolName     - Nome da escola do aluno
 */
export async function sendModerationWarning({
  guardianEmail,
  adminEmail,
  studentName,
  warningNumber,
  schoolName,
}: {
  guardianEmail: string;
  adminEmail: string;
  studentName: string;
  warningNumber: number;
  schoolName: string;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();

  if (!resend) {
    return { success: false, error: "Serviço de e-mail não configurado." };
  }

  // Assunto e mensagem variam conforme o número de avisos
  const isBlocked = warningNumber >= 2;

  const subject = isBlocked
    ? `🚫 PAI — BLOQUEIO: Conteúdo Inapropriado — ${studentName}`
    : `⚠️ PAI — Aviso de Conteúdo Inapropriado — ${studentName}`;

  const message = isBlocked
    ? `O aluno <strong>${studentName}</strong> foi <strong>bloqueado</strong> após
       enviar conteúdo inapropriado pela segunda vez.
       O acesso será restaurado apenas após revisão do administrador da escola.`
    : `O aluno <strong>${studentName}</strong> enviou conteúdo inapropriado
       (imagem com nudez, pornografia ou violência).
       Este é um <strong>aviso</strong>. Na próxima ocorrência, o acesso será bloqueado.`;

  // ── E-mail para o Responsável ─────────────────────────────────────────────
  const guardianContent = `
    <h2 style="color: ${isBlocked ? "#DC2626" : "#D97706"}; margin-top: 0; font-size: 20px;">
      ${isBlocked ? "🚫 Aluno Bloqueado" : "⚠️ Aviso de Segurança"}
    </h2>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 12px;">
      Prezado(a) responsável,
    </p>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 12px;">
      ${message}
    </p>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 12px;">
      A PAI possui rigorosos controles de segurança para proteger todos os alunos.
    </p>

    <p style="color: #374151; line-height: 1.7;">
      Em caso de dúvidas, entre em contato com a escola:
      <strong>${schoolName}</strong>.
    </p>

    <p style="color: #374151; line-height: 1.7; margin-top: 20px;">
      Atenciosamente,<br />
      <strong>Equipe PAI</strong>
    </p>
  `;

  // ── E-mail para o Admin ───────────────────────────────────────────────────
  const adminContent = `
    <h2 style="color: ${isBlocked ? "#DC2626" : "#D97706"}; margin-top: 0; font-size: 20px;">
      [ADMIN] ${isBlocked ? "🚫 Aluno Bloqueado" : "⚠️ Alerta de Moderação"} — Aviso #${warningNumber}
    </h2>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 12px;">
      <strong>Aluno:</strong> ${studentName}<br />
      <strong>Escola:</strong> ${schoolName}<br />
      <strong>Número do aviso:</strong> ${warningNumber}
    </p>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 12px;">
      ${message}
    </p>

    ${
      isBlocked
        ? `
      <div style="
        background-color: #FEE2E2;
        border-left: 4px solid #DC2626;
        border-radius: 6px;
        padding: 12px 16px;
        margin-top: 8px;
      ">
        <p style="margin: 0; color: #7F1D1D; font-size: 13px; line-height: 1.6;">
          🔴 <strong>AÇÃO NECESSÁRIA:</strong> O acesso do aluno foi bloqueado automaticamente.
          Revise o incidente no painel administrativo e libere manualmente se apropriado.
        </p>
      </div>
    `
        : ""
    }

    <p style="color: #374151; line-height: 1.7; margin-top: 20px;">
      Atenciosamente,<br />
      <strong>Sistema PAI</strong>
    </p>
  `;

  try {
    // Envia para o responsável e para o admin em paralelo
    await Promise.all([
      resend.emails.send({
        from: FROM_EMAIL,
        to: guardianEmail,
        subject,
        html: buildEmailLayout(guardianContent),
      }),
      resend.emails.send({
        from: FROM_EMAIL,
        to: adminEmail,
        subject: `[ADMIN] ${subject}`,
        html: buildEmailLayout(adminContent),
      }),
    ]);

    console.log(
      `[email-helper] E-mail de moderação (aviso #${warningNumber}) ` +
        `enviado para ${guardianEmail} e ${adminEmail} (aluno: ${studentName})`
    );

    return { success: true };
  } catch (error) {
    console.error(
      "[email-helper] Falha ao enviar e-mail de moderação:",
      error
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao enviar e-mail.",
    };
  }
}

// ============================================================================
// FUNÇÃO 4: sendPasswordResetLink
// Enviada quando um usuário solicita redefinição de senha.
// ============================================================================

/**
 * Envia o link de redefinição de senha ao usuário solicitante.
 *
 * @param email      - E-mail do destinatário
 * @param resetLink  - Link com token para redefinição de senha
 * @param personName - Nome do usuário (para personalização)
 */
export async function sendPasswordResetLink({
  email,
  resetLink,
  personName,
}: {
  email: string;
  resetLink: string;
  personName: string;
}): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();

  if (!resend) {
    return { success: false, error: "Serviço de e-mail não configurado." };
  }

  const content = `
    <h2 style="color: #111827; margin-top: 0; font-size: 20px;">
      🔑 Redefinição de Senha
    </h2>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 12px;">
      Olá, <strong>${personName}</strong>!
    </p>

    <p style="color: #374151; line-height: 1.7; margin: 0 0 4px;">
      Recebemos uma solicitação para redefinir a senha da sua conta na PAI.
      Clique no botão abaixo para continuar:
    </p>

    ${buildCtaButton(resetLink, "🔑 Redefinir minha senha", "#2563EB")}

    <!-- Link alternativo -->
    <p style="color: #6B7280; font-size: 13px; margin: 0 0 4px;">
      Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
    </p>
    <p style="word-break: break-all; margin: 0 0 20px;">
      <a href="${resetLink}" style="color: #2563EB; font-size: 13px;">
        ${resetLink}
      </a>
    </p>

    <div style="
      background-color: #F0FDF4;
      border-left: 4px solid #22C55E;
      border-radius: 6px;
      padding: 12px 16px;
    ">
      <p style="margin: 0; color: #14532D; font-size: 13px; line-height: 1.6;">
        ✅ Se você não solicitou a redefinição de senha, ignore este e-mail.
        Sua senha permanece a mesma e nenhuma ação será tomada.
      </p>
    </div>

    <p style="color: #374151; line-height: 1.7; margin-top: 20px;">
      Atenciosamente,<br />
      <strong>Equipe PAI</strong>
    </p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "PAI — Redefinição de Senha",
      html: buildEmailLayout(content),
    });

    console.log(
      `[email-helper] E-mail de redefinição de senha enviado para ${email}`
    );

    return { success: true };
  } catch (error) {
    console.error(
      "[email-helper] Falha ao enviar e-mail de redefinição de senha:",
      error
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao enviar e-mail.",
    };
  }
}