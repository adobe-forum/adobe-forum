import nodemailer from 'nodemailer';

/**
 * Shared nodemailer transporter — created once at startup, reused for
 * every outgoing email so we don't open a new SMTP connection per request.
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export default transporter;
