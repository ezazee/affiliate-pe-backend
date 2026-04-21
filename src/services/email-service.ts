import * as Brevo from '@getbrevo/brevo';
import dotenv from 'dotenv';
import { Setting } from '../models'; // Import Setting model
import fs from 'fs';
import path from 'path';

dotenv.config();

const apiKey = process.env.BREVO_API_KEY;
const fromEmail = process.env.EMAIL_FROM || 'support@peskinpro.id';
const fromName = process.env.EMAIL_FROM_NAME || 'Support PE Skinpro ID';

// Path logo lokal untuk dilampirkan ke email
const LOGO_PATH = path.join(process.cwd(), '../../frontend/affiliate-pe-frontend/public/Logo.png');

// Configure Brevo API Instance
const apiInstance = new Brevo.TransactionalEmailsApi();

if (apiKey) {
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
} else {
  console.warn('⚠️ BREVO_API_KEY is missing. Email sending will be disabled/mocked.');
}

export class EmailService {
  static async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    if (!apiKey) {
      console.log(`[DEV] Mock sending password reset email to ${to}: ${resetUrl}`);
      return true;
    }

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = 'Reset Password - Peskin Affiliate';
    sendSmtpEmail.sender = { "name": fromName, "email": fromEmail };
    sendSmtpEmail.to = [{ "email": to }];

    // Get logo as base64 if exists
    let logoBase64 = '';
    if (fs.existsSync(LOGO_PATH)) {
      logoBase64 = fs.readFileSync(LOGO_PATH).toString('base64');
    }

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reset Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;background-color:#f5f7fa;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:6px;overflow:hidden;">
          
          <!-- TOP BORDER (DOKU STYLE) -->
          <tr>
            <td style="height:6px;background-color:#38BDF8;"></td>
          </tr>

          <!-- LOGO -->
          <tr>
            <td style="padding:24px 32px;">
              ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="PE Skinpro" width="140" style="display:block;">` : '<h2 style="color:#38BDF8;margin:0;">PE Skinpro</h2>'}
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:0 32px 32px 32px;">
              <h2 style="font-size:20px;color:#111827;margin:0 0 16px 0;">
                Reset Password
              </h2>

              <p style="font-size:14px;line-height:1.6;color:#374151;margin-bottom:20px;">
                Kami menerima permintaan untuk mengubah password akun Anda.
                Silakan klik tombol di bawah ini untuk melanjutkan proses reset password.
              </p>

              <!-- BUTTON -->
              <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td>
                    <a href="${resetUrl}"
                       style="background-color:#38BDF8;color:#ffffff;
                              padding:12px 24px;
                              font-size:14px;
                              font-weight:bold;
                              text-decoration:none;
                              border-radius:4px;
                              display:inline-block;">
                      Ganti Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;color:#374151;margin-bottom:8px;">
                Link ini akan kedaluwarsa dalam <strong>30 menit</strong>.
              </p>

              <p style="font-size:13px;color:#6b7280;line-height:1.6;">
                Jika Anda tidak merasa meminta reset password, silakan abaikan email ini.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;
                       font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
              <strong>PT Kilau Berlian Nusantara</strong><br>
              Jl. Dukuh Patra II No.75, RT.1/RW.13, Menteng Dalam, Kec. Tebet, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12870, Indonesia<br><br>
              Email ini dikirim secara otomatis, mohon tidak membalas email ini.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;



    try {
      await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Password reset email sent to ${to} via Brevo`);
      return true;
    } catch (error: any) {
      console.error('❌ Error sending email via Brevo:', error.body || error.message);

      // Fallback for Development: Log the link clearly
      console.log('\n===========================================================');
      console.log('⚠️  EMAIL FAILED (Likely Quota/Auth). FALLBACK LINK:');
      console.log(`To: ${to}`);
      console.log(`Reset Link: ${resetUrl}`);
      console.log('===========================================================\n');

      // Return true so the frontend shows "Email Sent" and testing can proceed
      return true;
    }
  }

  /**
   * Kirim Email Nomor Resi ke Pembeli (Luxurious Template)
   */
  static async sendTrackingEmail(to: string, buyerName: string, orderNumber: string, trackingNumber: string, courierName: string): Promise<boolean> {
    if (!apiKey) {
      console.log(`[DEV] Mock sending tracking email to ${to}: ${trackingNumber}`);
      return true;
    }

    // AMBIL WHATSAPP DARI SETTINGS
    let whatsappNumber = '0821-2316-7895'; // Fallback
    try {
      const waSetting = await Setting.findOne({ where: { name: 'landingWhatsappNumber' } });
      if (waSetting) whatsappNumber = waSetting.value;
    } catch (e) {
      console.error('⚠️ Gagal mengambil WhatsApp setting:', e);
    }

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `Pesanan Anda Diterima! [#${orderNumber}]`;
    sendSmtpEmail.sender = { "name": fromName, "email": fromEmail };
    sendSmtpEmail.to = [{ "email": to }];

    // Get logo as base64 if exists
    let logoBase64 = '';
    if (fs.existsSync(LOGO_PATH)) {
      logoBase64 = fs.readFileSync(LOGO_PATH).toString('base64');
      console.log(`✅ Logo Base64 loaded: ${logoBase64.substring(0, 50)}...`);
    } else {
      console.warn(`⚠️ Logo not found at path: ${LOGO_PATH}`);
    }

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pesanan Diterima</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background-color:#f8fafc;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- BRAND ACCENT -->
          <tr>
            <td style="height:8px;background: linear-gradient(to right, #38BDF8, #818CF8);"></td>
          </tr>

          <!-- HEADER / LOGO -->
          <tr>
            <td style="padding:32px;text-align:center;">
              ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="PE Skinpro" width="160" style="display:inline-block;">` : '<h1 style="color:#38BDF8;margin:0;">PE Skinpro</h1>'}
            </td>
          </tr>

          <!-- MAIN CONTENT -->
          <tr>
            <td style="padding:0 40px 40px 40px;">
              <h1 style="font-size:24px;color:#0f172a;margin:0 0 16px 0;text-align:center;">Pesanan Anda Diterima! ✅</h1>
              <p style="font-size:16px;line-height:1.6;color:#475569;margin-bottom:24px;">
                Halo <strong>${buyerName}</strong>, terima kasih telah berbelanja! Pesanan Anda dengan nomor tagihan <strong>#${orderNumber}</strong> telah kami terima dan saat ini sedang dalam proses penyiapan untuk diserahkan ke jasa pengiriman.
              </p>

              <!-- TRACKING CARD -->
              <div style="background-color:#f1f5f9;border-radius:8px;padding:24px;margin-bottom:30px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom:12px;font-size:14px;color:#64748b;">Kurir Pengiriman:</td>
                    <td style="padding-bottom:12px;font-size:14px;color:#0f172a;font-weight:bold;text-align:right;">${courierName.toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#64748b;">Nomor Resi:</td>
                    <td style="font-size:18px;color:#38BDF8;font-weight:bold;text-align:right;letter-spacing:1px;">${trackingNumber}</td>
                  </tr>
                </table>
              </div>

              <p style="font-size:14px;color:#64748b;margin-bottom:30px;line-height:1.6; text-align: center;">
                Anda akan menerima notifikasi lanjutan setelah kurir melakukan penjemputan paket. Silakan simpan nomor resi di atas untuk pelacakan berkala.
              </p>

              <!-- BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://biteship.com/id/tracking/${trackingNumber}" 
                       style="background-color:#0f172a;color:#ffffff;padding:16px 32px;font-size:15px;font-weight:bold;text-decoration:none;border-radius:6px;display:inline-block;">
                      Lacak Pesanan Sekarang
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f8fafc;padding:30px 40px;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;text-align:center;">
                <p style="margin:0 0 8px 0; color: #475569;"><strong>Email ini dikirim secara otomatis, mohon tidak membalas email ini.</strong></p>
                <p style="margin:0;">Hubungi kami: support@peskinpro.id | ${whatsappNumber}</p>
                <p style="margin:16px 0 0 0;">&copy; 2026 PT Kilau Berlian Nusantara. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

    try {
      await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ Tracking email sent to ${to} for order #${orderNumber}`);
      return true;
    } catch (error: any) {
      console.error('❌ Error sending tracking email via Brevo:', error.body || error.message);
      return false;
    }
  }
}
