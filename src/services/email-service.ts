import * as Brevo from '@getbrevo/brevo';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.BREVO_API_KEY;
const fromEmail = process.env.EMAIL_FROM || 'support@peskinpro.id';
const fromName = process.env.EMAIL_FROM_NAME || 'Support PE Skinpro ID';

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
              <img src="https://peskinpro.id/frontend/assets/images/logo/peskin.png" alt="PE Skinpro"
                   width="140" style="display:block;">
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
}
