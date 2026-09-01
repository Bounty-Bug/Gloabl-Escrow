import nodemailer from "nodemailer";
import { logger } from "./logger";
import type { Escrow } from "@workspace/db";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const FROM = `Escrow Global <${process.env.GMAIL_USER}>`;

/** Derive the public frontend URL from environment */
function getAppUrl(): string {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/$/, "");
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return "https://escrowglobal.app";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    funded: "Funded",
    released: "Released",
    disputed: "Disputed",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  return map[status] ?? status;
}

function formatAmount(amount: string): string {
  const n = parseFloat(amount);
  if (isNaN(n)) return amount;
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.001) return n.toFixed(3);
  return n.toFixed(6);
}

function baseTemplate(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f1f5f9; color: #1e293b; }
    .wrapper { max-width: 600px; margin: 32px auto; padding: 0 16px 40px; }
    .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .header { background: #1e40af; padding: 28px 32px; }
    .header-logo { font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; }
    .header-logo span { color: #93c5fd; }
    .header-sub { font-size: 13px; color: #bfdbfe; margin-top: 4px; }
    .body { padding: 28px 32px; }
    .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
    .subtitle { font-size: 14px; color: #475569; margin-bottom: 24px; line-height: 1.5; }
    .field-grid { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
    .field-row { display: flex; padding: 11px 16px; border-bottom: 1px solid #e2e8f0; }
    .field-row:last-child { border-bottom: none; }
    .field-key { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; width: 120px; flex-shrink: 0; padding-top: 1px; }
    .field-val { font-size: 14px; color: #1e293b; flex: 1; word-break: break-all; }
    .field-val.mono { font-family: 'Courier New', monospace; font-size: 13px; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: #dbeafe; color: #1e40af; }
    .address-block { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; }
    .address-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #1e40af; margin-bottom: 8px; }
    .address-val { font-family: 'Courier New', monospace; font-size: 13px; color: #1e293b; word-break: break-all; line-height: 1.5; }
    .warn-block { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
    .warn-text { font-size: 13px; color: #92400e; line-height: 1.5; }
    .cta-btn { display: block; text-align: center; background: #1e40af; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin: 24px 0 0; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
    .footer { padding: 16px 32px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
    .footer a { color: #1e40af; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-logo">Escrow<span>Global</span></div>
        <div class="header-sub">Secure Crypto Escrow Platform</div>
      </div>
      <div class="body">
        ${body}
      </div>
      <div class="footer">
        &copy; Escrow Global &nbsp;&middot;&nbsp; Do not reply to this email
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function escrowFieldGrid(escrow: Escrow): string {
  const rows = [
    ["Title", escrow.title, false],
    ["Amount", `${formatAmount(escrow.amount)} ${escrow.currency}`, false],
    ["Network", escrow.network, false],
    ["Status", `<span class="status-badge">${statusLabel(escrow.status)}</span>`, false],
    ["Buyer", escrow.buyerEmail, false],
    ["Seller", escrow.sellerEmail, false],
    ...(escrow.description ? [["Details", escrow.description, false] as const] : []),
    ...(escrow.notes ? [["Notes", escrow.notes, false] as const] : []),
  ];
  const rowsHtml = rows
    .map(([k, v]) => `<div class="field-row"><span class="field-key">${k}</span><span class="field-val">${v}</span></div>`)
    .join("");
  return `<div class="field-grid">${rowsHtml}</div>`;
}

async function sendMail(to: string[], subject: string, html: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    logger.warn("Gmail credentials not set — skipping email notification");
    return;
  }
  try {
    await transporter.sendMail({ from: FROM, to: to.join(", "), subject, html });
    logger.info({ to, subject }, "Email sent");
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email");
  }
}

// ─── Escrow Created — two separate emails ────────────────────────────────────

/** Sent to the person who created the escrow (confirmation). */
export async function sendEscrowCreatedInitiator(escrow: Escrow, initiatorEmail: string): Promise<void> {
  const html = baseTemplate(
    "Escrow Created",
    `
    <div class="title">Your escrow has been created</div>
    <p class="subtitle">The transaction is now live. Share the details with the other party so they can review and proceed.</p>
    ${escrowFieldGrid(escrow)}
    ${escrow.walletAddress ? `
    <div class="address-block">
      <div class="address-label">Deposit Wallet Address</div>
      <div class="address-val">${escrow.walletAddress}</div>
    </div>
    <div class="warn-block">
      <p class="warn-text"><strong>Important:</strong> Send exactly <strong>${formatAmount(escrow.amount)} ${escrow.currency}</strong> on the <strong>${escrow.network}</strong> network only. Funds sent to the wrong network cannot be recovered.</p>
    </div>` : ""}
    `,
  );
  await sendMail([initiatorEmail], `[Escrow Global] Escrow Created: ${escrow.title}`, html);
}

/** Sent to the counterparty who did NOT create the escrow (invitation). */
export async function sendEscrowCreatedCounterparty(
  escrow: Escrow,
  counterpartyEmail: string,
  role: "buyer" | "seller",
): Promise<void> {
  const appUrl = getAppUrl();
  const signInUrl = `${appUrl}/sign-in`;
  const signUpUrl = `${appUrl}/sign-up`;

  const roleInstructions =
    role === "buyer"
      ? `As the <strong>buyer</strong>, you'll need to send <strong>${formatAmount(escrow.amount)} ${escrow.currency}</strong> to the escrow wallet address. Log in to view the full deposit address and confirm payment once sent.`
      : `As the <strong>seller</strong>, you'll be notified once payment is received in escrow. Log in to monitor the transaction and confirm delivery when ready.`;

  const html = baseTemplate(
    "You've been added to an escrow",
    `
    <div class="title">An escrow has been created for you</div>
    <p class="subtitle">You have been added to a secure escrow transaction. Review the details below and log in to take action.</p>
    ${escrowFieldGrid(escrow)}
    <div class="warn-block">
      <p class="warn-text">${roleInstructions}</p>
    </div>
    <p style="font-size:14px;color:#475569;margin-bottom:8px;">Already have an account? Sign in to access the escrow:</p>
    <a href="${signInUrl}" class="cta-btn">Sign In to View Escrow</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#64748b;text-align:center;">New to Escrow Global? <a href="${signUpUrl}" style="color:#1e40af;font-weight:600;">Create a free account</a> to get started.</p>
    `,
  );
  await sendMail([counterpartyEmail], `[Escrow Global] You've been added to an escrow: ${escrow.title}`, html);
}

// ─── Other lifecycle emails ───────────────────────────────────────────────────

export async function sendEscrowFunded(escrow: Escrow): Promise<void> {
  const txRow = escrow.txHash
    ? `<div class="field-grid"><div class="field-row"><span class="field-key">Tx Hash</span><span class="field-val mono">${escrow.txHash}</span></div></div>`
    : "";
  const html = baseTemplate(
    "Escrow Funded",
    `
    <div class="title">Payment received — awaiting release</div>
    <p class="subtitle">The buyer has confirmed payment. Funds are held in escrow and will be released to the seller once delivery is confirmed.</p>
    ${escrowFieldGrid(escrow)}
    ${txRow}
    `,
  );
  await sendMail([escrow.buyerEmail, escrow.sellerEmail], `[Escrow Global] Escrow Funded: ${escrow.title}`, html);
}

export async function sendEscrowReleased(escrow: Escrow): Promise<void> {
  const html = baseTemplate(
    "Funds Released",
    `
    <div class="title">Funds have been released to the seller</div>
    <p class="subtitle">The escrow has been approved and the transaction is complete. Funds are on their way to the seller.</p>
    ${escrowFieldGrid(escrow)}
    `,
  );
  await sendMail([escrow.buyerEmail, escrow.sellerEmail], `[Escrow Global] Funds Released: ${escrow.title}`, html);
}

export async function sendEscrowDisputed(escrow: Escrow): Promise<void> {
  const html = baseTemplate(
    "Dispute Raised",
    `
    <div class="title">A dispute has been raised</div>
    <p class="subtitle">A dispute has been opened on this escrow. Our team will review the case and reach out to both parties to resolve it.</p>
    ${escrowFieldGrid(escrow)}
    `,
  );
  await sendMail([escrow.buyerEmail, escrow.sellerEmail], `[Escrow Global] Dispute Opened: ${escrow.title}`, html);
}

export async function sendEscrowCancelled(escrow: Escrow): Promise<void> {
  const html = baseTemplate(
    "Escrow Cancelled",
    `
    <div class="title">This escrow has been cancelled</div>
    <p class="subtitle">The escrow transaction was cancelled. If you believe this is an error or funds were already sent, contact support immediately.</p>
    ${escrowFieldGrid(escrow)}
    `,
  );
  await sendMail([escrow.buyerEmail, escrow.sellerEmail], `[Escrow Global] Escrow Cancelled: ${escrow.title}`, html);
}
