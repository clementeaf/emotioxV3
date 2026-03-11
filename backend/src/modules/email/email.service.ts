import nodemailer from 'nodemailer';

// --- Config ---

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
  tls: {
    // cPanel self-signed certs
    rejectUnauthorized: false,
  },
});

const FROM = process.env.SMTP_FROM || 'EmotioX <noreply@emotio.cx>';

// --- Template ---

const buildInvitationHtml = (params: {
  participantName: string | null;
  participantUrl: string;
  researchName: string;
}): string => {
  const greeting = params.participantName
    ? `Hola ${params.participantName},`
    : 'Hola,';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:100%;">
        <!-- Header -->
        <tr><td style="background:#6366f1;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">EmotioX</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.5;">
            ${greeting}
          </p>
          <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.5;">
            Has sido invitado/a a participar en el estudio <strong>${params.researchName}</strong>.
            Tu opinión es muy importante para nosotros.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td align="center" style="background:#6366f1;border-radius:6px;">
              <a href="${params.participantUrl}"
                 style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
                Participar en el estudio
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.5;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:
          </p>
          <p style="margin:0 0 24px;color:#6366f1;font-size:13px;word-break:break-all;">
            ${params.participantUrl}
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            Este correo fue enviado por EmotioX. Si no esperabas esta invitación, puedes ignorar este mensaje.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// --- Public API ---

export interface SendResult {
  participantId: string;
  email: string;
  success: boolean;
  error?: string;
}

/**
 * Sends a single invitation email. Returns result with success/failure.
 */
export const sendInvitation = async (params: {
  to: string;
  participantName: string | null;
  participantId: string;
  participantUrl: string;
  researchName: string;
}): Promise<SendResult> => {
  try {
    const html = buildInvitationHtml({
      participantName: params.participantName,
      participantUrl: params.participantUrl,
      researchName: params.researchName,
    });

    await transporter.sendMail({
      from: FROM,
      to: params.to,
      subject: `Invitación a estudio: ${params.researchName}`,
      html,
    });

    return { participantId: params.participantId, email: params.to, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';
    console.error(`Email send failed for ${params.to}:`, message);
    return { participantId: params.participantId, email: params.to, success: false, error: message };
  }
};
