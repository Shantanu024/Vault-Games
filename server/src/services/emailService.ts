import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOTPEmail(email: string, otp: string, username?: string): Promise<void> {
  const displayName = username || email.split('@')[0];
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>VaultGames - Verification Code</title>
    </head>
    <body style="margin:0;padding:0;background:#080614;font-family:'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#080614;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#120D2A;border-radius:16px;border:1px solid #2A1F5A;overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1E1545,#2D1A6E);padding:32px 40px;text-align:center;">
                  <h1 style="margin:0;color:#E8E4FF;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                    🎮 VaultGames
                  </h1>
                  <p style="margin:8px 0 0;color:#A06EFF;font-size:14px;">Your verification code</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="color:#C4BFEF;font-size:16px;margin:0 0 24px;">
                    Hey <strong style="color:#E8E4FF;">${displayName}</strong>,
                  </p>
                  <p style="color:#C4BFEF;font-size:15px;margin:0 0 32px;line-height:1.6;">
                    Here's your one-time verification code to sign in to VaultGames.
                    This code expires in <strong style="color:#A06EFF;">10 minutes</strong>.
                  </p>
                  <!-- OTP Box -->
                  <div style="text-align:center;margin:0 0 32px;">
                    <div style="display:inline-block;background:#1E1545;border:2px solid #7B3FE4;border-radius:12px;padding:20px 40px;">
                      <span style="font-size:42px;font-weight:700;color:#A06EFF;letter-spacing:12px;font-family:monospace;">${otp}</span>
                    </div>
                  </div>
                  <p style="color:#7B7499;font-size:13px;margin:0;line-height:1.6;">
                    If you didn't request this code, you can safely ignore this email.
                    Never share this code with anyone.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#0D0B1E;padding:20px 40px;border-top:1px solid #1E1545;">
                  <p style="color:#4A4468;font-size:12px;margin:0;text-align:center;">
                    © ${new Date().getFullYear()} VaultGames. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'VaultGames <noreply@vaultgames.gg>',
    to: email,
    subject: `${otp} — Your VaultGames verification code`,
    html,
    text: `Your VaultGames verification code is: ${otp}. It expires in 10 minutes.`,
  });
}

export async function sendWelcomeEmail(email: string, username: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to VaultGames! 🎮',
    html: `
      <div style="background:#080614;color:#E8E4FF;padding:40px;font-family:sans-serif;text-align:center;">
        <h1 style="color:#A06EFF;">Welcome to VaultGames, ${username}!</h1>
        <p style="color:#C4BFEF;">Your account is ready. Start playing and climb the leaderboards.</p>
        <a href="${process.env.CLIENT_URL}" style="background:#7B3FE4;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">
          Play Now
        </a>
      </div>
    `,
  });
}
