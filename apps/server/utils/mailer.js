const nodemailer = require("nodemailer");
const logger = require("./logger");

function makeTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 25),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

const transport = makeTransport();

async function sendMail({ to, subject, text, html }) {
  const from = process.env.ALERT_FROM || "SPD Tracker <no-reply@localhost>";
  const recipients = to || process.env.ALERT_TO || "";
  if (!recipients) {
    logger.info("[mailer] No ALERT_TO configured; skipping send.");
    logger.info(`[mailer] Subject: ${subject}\n${text || html || ""}`);
    return { ok: false, skipped: true };
  }
  if (!transport) {
    logger.info("[mailer] No SMTP configured; logging instead.");
    console.log(
      `[mailer] To: ${recipients}\nSubject: ${subject}\n${text || html || ""}`
    );
    return { ok: false, skipped: true };
  }
  await transport.sendMail({ from, to: recipients, subject, text, html });
  return { ok: true };
}

module.exports = { sendMail };
