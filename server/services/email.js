import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  ...(config.smtp.user && {
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  }),
});

export async function sendLoginCode(email, code) {
  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Your login code',
    text: `Your login code is: ${code}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2>Your login code</h2>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center;
                  padding: 20px; background: #f3f4f6; border-radius: 8px;">
          ${code}
        </p>
        <p style="color: #6b7280;">This code expires in 10 minutes.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email, resetUrl) {
  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Reset your password',
    text: `You requested a password reset. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p style="color: #374151;">You requested a password reset. Click the button below to set a new password.</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #111827; color: #fff;
                    padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Reset Password
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
