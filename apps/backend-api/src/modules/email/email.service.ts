import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'
import type Transporter from 'nodemailer/lib/mailer'

export type SendMailOptions = {
  to: string
  subject: string
  html: string
  text: string
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private transporter: Transporter | null = null

  constructor(private readonly config: ConfigService) {}

  isConfigured = (): boolean => {
    const host = this.config.get<string>('SMTP_HOST')?.trim()
    const user = this.config.get<string>('SMTP_USER')?.trim()
    const pass = this.config.get<string>('SMTP_PASSWORD')?.trim()
    return !!(host && user && pass)
  }

  private getTransporter = (): Transporter => {
    if (this.transporter) return this.transporter

    const host = this.config.get<string>('SMTP_HOST', 'smtp.ionos.com')
    const port = Number(this.config.get<string>('SMTP_PORT', '587'))
    const secure = this.config.get<string>('SMTP_SECURE', 'false') === 'true'
    const user = this.config.get<string>('SMTP_USER')!
    const pass = this.config.get<string>('SMTP_PASSWORD')!

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    })

    return this.transporter
  }

  private fromAddress = (): string =>
    this.config.get<string>('SMTP_FROM') ?? 'Spendlyx <info@spendlyx.com>'

  async sendMail(options: SendMailOptions): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn('SMTP no configurado — correo no enviado')
      throw new Error('SMTP_NOT_CONFIGURED')
    }

    await this.getTransporter().sendMail({
      from: this.fromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
  }

  async sendVerificationEmail(params: {
    to: string
    name: string
    verifyUrl: string
  }): Promise<void> {
    const { to, name, verifyUrl } = params
    const greeting = name?.trim() ? `Hola ${name},` : 'Hola,'

    const html = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.08)">
    <tr><td style="background:linear-gradient(135deg,#0c4a6e,#1e1b4b);padding:28px 24px;color:#fff">
      <h1 style="margin:0;font-size:22px">Spendlyx</h1>
      <p style="margin:8px 0 0;opacity:.9;font-size:14px">Valida tu cuenta</p>
    </td></tr>
    <tr><td style="padding:28px 24px">
      <p style="margin:0 0 16px">${greeting}</p>
      <p style="margin:0 0 16px;line-height:1.6">Gracias por crear tu cuenta en Spendlyx. Para activar el acceso al panel, confirma tu correo electrónico.</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${verifyUrl}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600">Validar mi cuenta</a>
      </p>
      <p style="margin:0 0 12px;font-size:13px;color:#64748b">Este enlace caduca en <strong>24 horas</strong>.</p>
      <p style="margin:0 0 12px;font-size:13px;color:#64748b">Si no has solicitado esta cuenta, ignora este mensaje.</p>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px">
        Spendlyx · <a href="mailto:info@spendlyx.com" style="color:#0284c7">info@spendlyx.com</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`

    const text = `${greeting}

Gracias por crear tu cuenta en Spendlyx. Valida tu correo en 24 horas:
${verifyUrl}

Si no has solicitado esta cuenta, ignora este mensaje.

Spendlyx · info@spendlyx.com`

    await this.sendMail({
      to,
      subject: 'Valida tu cuenta de Spendlyx',
      html,
      text,
    })
  }

  async sendWelcomeEmail(params: { to: string; name: string; loginUrl: string }): Promise<void> {
    const greeting = params.name?.trim() ? `Hola ${params.name},` : 'Hola,'
    const html = `<!DOCTYPE html><html lang="es"><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px">
      <p>${greeting}</p>
      <p>Tu cuenta de Spendlyx ya está activa. Ya puedes iniciar sesión en el panel.</p>
      <p><a href="${params.loginUrl}">Iniciar sesión</a></p>
      <p style="color:#64748b;font-size:12px">Spendlyx · info@spendlyx.com</p>
    </body></html>`
    await this.sendMail({
      to: params.to,
      subject: 'Bienvenido a Spendlyx',
      html,
      text: `${greeting}\n\nTu cuenta está activa. Inicia sesión: ${params.loginUrl}`,
    })
  }

  async sendContactFormEmail(params: {
    name: string
    email: string
    subject: string
    reason: string
    message: string
  }): Promise<void> {
    const inbox = this.config.get<string>('CONTACT_INBOX', 'info@spendlyx.com')
    const html = `<p><strong>Contacto Spendlyx</strong></p>
      <p>Nombre: ${params.name}<br>Email: ${params.email}<br>Motivo: ${params.reason}</p>
      <p>Asunto: ${params.subject}</p>
      <p>${params.message.replace(/\n/g, '<br>')}</p>`
    await this.sendMail({
      to: inbox,
      subject: `[Contacto Spendlyx] ${params.subject}`,
      html,
      text: `Contacto de ${params.name} (${params.email})\nMotivo: ${params.reason}\n\n${params.message}`,
    })
  }
}
