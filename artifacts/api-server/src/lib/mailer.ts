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

const FROM = `VaultBridge Escrow <${process.env.GMAIL_USER}>`;

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

function baseTemplate(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #0f1117; color: #e2e8f0; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #1a1d27; border: 1px solid #2d3148; border-radius: 8px; overflow: hidden; }
    .header { background: #1e3a5f; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 22px; color: #60a5fa; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; color: #94a3b8; font-size: 14px; }
    .body { padding: 28px 32px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
    .field value { display: block; font-size: 15px; color: #e2e8f0; }
    .address-box { background: #0f1117; border: 1px solid #2d3148; border-radius: 6px; padding: 14px 16px; font-family: monospace; font-size: 13px; color: #60a5fa; word-break: break-all; margin: 20px 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-pending { background: #1e3a5f; color: #60a5fa; }
    .badge-funded { background: #14532d; color: #4ade80; }
    .badge-released { background: #14532d; color: #4ade80; }
    .badge-disputed { background: #451a03; color: #fb923c; }
    .badge-cancelled { background: #1f1f1f; color: #94a3b8; }
    .divider { border: none; border-top: 1px solid #2d3148; margin: 24px 0; }
    .footer { padding: 20px 32px; background: #0f1117; font-size: 12px; color: #475569; text-align: center; }
    .footer a { color: #60a5fa; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>VaultBridge</h1>
      <p>Secure Crypto Escrow Platform</p>
    </div>
    <div class="body">
      <h2 style="margin-top:0;font-size:18px;color:#f1f5f9;">${title}</h2>
      ${body}
    </div>
    <div class="footer">
      VaultBridge — Trusted Crypto Escrow &nbsp;|&nbsp; Do not reply to this email
    </div>
  </div>
</body>
</html>
  `.trim();
}

function escrowFields(escrow: Escrow): string {
  return `
    <div class="field"><label>Escrow Title</label><value>${escrow.title}</value></div>
    <div class="field"><label>Amount</label><value>${escrow.amount} ${escrow.currency}</value></div>
    <div class="field"><label>Network</label><value>${escrow.network}</value></div>
    <div class="field"><label>Status</label><span class="badge badge-${escrow.status}">${statusLabel(escrow.status)}</span></div>
    <div class="field"><label>Buyer</label><value>${escrow.buyerEmail}</value></div>
    <div class="field"><label>Seller</label><value>${escrow.sellerEmail}</value></div>
    ${escrow.description ? `<div class="field"><label>Description</label><value>${escrow.description}</value></div>` : ""}
    ${escrow.notes ? `<div class="field"><label>Notes</label><value>${escrow.notes}</value></div>` : ""}
  `;
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

export async function sendEscrowCreated(escrow: Escrow): Promise<void> {
  const walletSection = escrow.walletAddress
    ? `<hr class="divider" /><p style="color:#94a3b8;font-size:14px;">Send exactly <strong>${escrow.amount} ${escrow.currency}</strong> on the <strong>${escrow.network}</strong> network to the wallet address below:</p><div class="address-box">${escrow.walletAddress}</div><p style="color:#64748b;font-size:12px;">Important: Only send the exact amount specified. Funds sent to the wrong network cannot be recovered.</p>`
    : "";

  const html = baseTemplate(
    "New Escrow Transaction Created",
    `<p style="color:#94a3b8;font-size:14px;">A new escrow transaction has been created. Please review the details below.</p>${escrowFields(escrow)}${walletSection}`,
  );

  await sendMail(
    [escrow.buyerEmail, escrow.sellerEmail],
    `[VaultBridge] Escrow Created: ${escrow.title}`,
    html,
  );
}

export async function sendEscrowFunded(escrow: Escrow): Promise<void> {
  const txSection = escrow.txHash
    ? `<div class="field"><label>Transaction Hash</label><value style="font-family:monospace;font-size:12px;">${escrow.txHash}</value></div>`
    : "";

  const html = baseTemplate(
    "Escrow Funded — Awaiting Release",
    `<p style="color:#94a3b8;font-size:14px;">The buyer has confirmed payment. The escrow is now funded and awaiting release approval.</p>${escrowFields(escrow)}${txSection}`,
  );

  await sendMail(
    [escrow.buyerEmail, escrow.sellerEmail],
    `[VaultBridge] Escrow Funded: ${escrow.title}`,
    html,
  );
}

export async function sendEscrowReleased(escrow: Escrow): Promise<void> {
  const html = baseTemplate(
    "Funds Released to Seller",
    `<p style="color:#94a3b8;font-size:14px;">The escrow has been approved and funds have been released to the seller. The transaction is now complete.</p>${escrowFields(escrow)}`,
  );

  await sendMail(
    [escrow.buyerEmail, escrow.sellerEmail],
    `[VaultBridge] Funds Released: ${escrow.title}`,
    html,
  );
}

export async function sendEscrowDisputed(escrow: Escrow): Promise<void> {
  const html = baseTemplate(
    "Dispute Raised on Escrow",
    `<p style="color:#fb923c;font-size:14px;">A dispute has been raised on this escrow transaction. Our team will review the case and contact both parties.</p>${escrowFields(escrow)}`,
  );

  await sendMail(
    [escrow.buyerEmail, escrow.sellerEmail],
    `[VaultBridge] Dispute Opened: ${escrow.title}`,
    html,
  );
}

export async function sendEscrowCancelled(escrow: Escrow): Promise<void> {
  const html = baseTemplate(
    "Escrow Cancelled",
    `<p style="color:#94a3b8;font-size:14px;">This escrow transaction has been cancelled. If funds were already sent, please contact support immediately.</p>${escrowFields(escrow)}`,
  );

  await sendMail(
    [escrow.buyerEmail, escrow.sellerEmail],
    `[VaultBridge] Escrow Cancelled: ${escrow.title}`,
    html,
  );
}
