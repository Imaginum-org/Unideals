/*
 * Branded A4 PDF receipt for a plan payment. jsPDF is loaded on demand so it
 * never ships in the main bundle. Built-in PDF fonts have no ₹ glyph, so
 * amounts are written as "INR".
 */

const BRAND = [56, 56, 236]; // #3838EC
const BRAND_DARK = [36, 17, 110]; // hero banner base
const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const LINE = [226, 232, 240];
const SOFT = [246, 247, 251];
const GREEN = [5, 150, 105];
const GREEN_SOFT = [220, 252, 231];
const AMBER = [180, 83, 9];
const AMBER_SOFT = [254, 243, 199];

const PLAN_NAMES = { pro: "Pro", pro_plus: "Pro Plus", base_user: "Free" };
const PAID = new Set(["paid", "captured", "verified", "success"]);

const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const fmtDateTime = (v) => {
  const d = v ? new Date(v) : new Date();
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const inr = (rupees) => `INR ${Number(rupees || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * @param {object} o
 * @param {object} o.payment   Payment row ({ plan, amount (paise), status, razorpay_order_id, razorpay_payment_id, receipt, createdAt })
 * @param {object} [o.customer] { name, email }
 * @param {string} [o.validity] e.g. "Lifetime" or an expiry date
 */
export async function downloadReceiptPdf({ payment, customer = {}, validity }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48; // page margin

  const planName = PLAN_NAMES[payment?.plan] || String(payment?.plan || "Plan").replace(/_/g, " ");
  const rupees = (Number(payment?.amount) || 0) / 100;
  const status = String(payment?.status || "paid").toLowerCase();
  const isPaid = PAID.has(status);
  const receiptNo = payment?.receipt || payment?.razorpay_payment_id || payment?.razorpay_order_id || "UNIDEALS";

  // ── Header band ──
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, W, 132, "F");
  doc.setFillColor(...BRAND);
  doc.rect(0, 126, W, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("Unideals", M, 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(199, 205, 255);
  doc.text("Campus marketplace for students", M, 80);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PAYMENT RECEIPT", W - M, 58, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(199, 205, 255);
  doc.text(`Receipt no. ${receiptNo}`, W - M, 76, { align: "right" });
  doc.text(`Issued ${fmtDateTime()}`, W - M, 90, { align: "right" });

  // ── Billed to + status ──
  let y = 176;
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("BILLED TO", M, y);
  doc.text("PAYMENT DATE", W / 2, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(customer.name || "Unideals member", M, y + 18);
  doc.text(fmtDate(payment?.verified_at || payment?.createdAt), W / 2, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  if (customer.email) doc.text(customer.email, M, y + 34);

  // Status pill
  const pill = isPaid ? "PAID" : status.toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const pw = doc.getTextWidth(pill) + 22;
  doc.setFillColor(...(isPaid ? GREEN_SOFT : AMBER_SOFT));
  doc.roundedRect(W - M - pw, y + 4, pw, 20, 10, 10, "F");
  doc.setTextColor(...(isPaid ? GREEN : AMBER));
  doc.text(pill, W - M - pw / 2, y + 17.5, { align: "center" });

  // ── Line item table ──
  y = 252;
  doc.setFillColor(...SOFT);
  doc.roundedRect(M, y, W - 2 * M, 30, 6, 6, "F");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("DESCRIPTION", M + 14, y + 19);
  doc.text("VALIDITY", W / 2 + 20, y + 19);
  doc.text("AMOUNT", W - M - 14, y + 19, { align: "right" });

  y += 54;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(`Unideals ${planName} plan`, M + 14, y);
  doc.text(inr(rupees), W - M - 14, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(validity || "As per plan", W / 2 + 20, y);
  doc.setTextColor(...MUTED);
  doc.setFontSize(9.5);
  doc.text("One-time payment. Does not renew automatically.", M + 14, y + 16);

  y += 36;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.8);
  doc.line(M, y, W - M, y);

  // ── Totals ──
  const tx = W - M - 220;
  const row = (label, value, bold = false) => {
    y += 22;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 12 : 10);
    doc.setTextColor(...(bold ? INK : MUTED));
    doc.text(label, tx, y);
    doc.setTextColor(...INK);
    doc.text(value, W - M - 14, y, { align: "right" });
  };
  row("Subtotal", inr(rupees));
  row("Taxes & fees", inr(0));
  y += 10;
  doc.setFillColor(...BRAND);
  doc.roundedRect(tx - 14, y, W - M - tx + 14, 40, 8, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(isPaid ? "Total paid" : "Total", tx, y + 25);
  doc.setFontSize(15);
  doc.text(inr(rupees), W - M - 14, y + 26, { align: "right" });

  // ── Payment details ──
  y += 84;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Payment details", M, y);
  y += 10;
  const details = [
    ["Payment method", "Razorpay (UPI / card / netbanking)"],
    ["Order ID", payment?.razorpay_order_id || "-"],
    ["Payment ID", payment?.razorpay_payment_id || "-"],
    ["Status", isPaid ? "Paid" : status.charAt(0).toUpperCase() + status.slice(1)],
  ];
  doc.setDrawColor(...LINE);
  doc.roundedRect(M, y, W - 2 * M, details.length * 28 + 8, 6, 6, "S");
  details.forEach(([k, v], i) => {
    const ry = y + 22 + i * 28;
    if (i > 0) doc.line(M + 14, ry - 18, W - M - 14, ry - 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(k, M + 14, ry);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.text(String(v), W - M - 14, ry, { align: "right" });
  });

  // ── Footer ──
  doc.setDrawColor(...LINE);
  doc.line(M, H - 92, W - M, H - 92);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("This is a computer-generated receipt and does not need a signature.", M, H - 72);
  doc.text("Payments are processed securely by Razorpay. Unideals never sees your card or UPI details.", M, H - 58);
  doc.text("Questions about this payment? Write to hi@unideals.in", M, H - 44);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND);
  doc.text("unideals", W - M, H - 44, { align: "right" });

  const safe = String(receiptNo).replace(/[^A-Za-z0-9_-]/g, "");
  doc.save(`Unideals-receipt-${safe || "payment"}.pdf`);
}
