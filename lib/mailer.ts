import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendAdminNotification(params: {
  companyName: string;
  contactName: string;
  email: string;
  fromCountry: string;
  toCountry: string;
  carrierName: string | null;
  goodsType: string | null;
  price: number;
  surcharge: number;
  analysisStatus: string;
  percentAbove: number | null;
  note: string | null;
}) {
  const statusLabel = params.analysisStatus === "avvikande" ? "Avvikande" : "Lite högt";
  const statusColor = params.analysisStatus === "avvikande" ? "#dc2626" : "#d97706";

  await transporter.sendMail({
    from: `FraktPool <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: `🚢 Nytt ärende — ${params.companyName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#2563eb">Nytt förhandlingsärende</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#666;width:140px">Företag</td><td style="font-weight:600">${params.companyName}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Kontaktperson</td><td>${params.contactName}</td></tr>
          <tr><td style="padding:6px 0;color:#666">E-post</td><td><a href="mailto:${params.email}">${params.email}</a></td></tr>
          <tr><td style="padding:6px 0;color:#666">Korridor</td><td style="font-weight:600">${params.fromCountry} → ${params.toCountry}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Speditör</td><td>${params.carrierName ?? "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Varutyp</td><td>${params.goodsType ?? "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Pris</td><td style="font-weight:600">${params.price.toLocaleString("sv-SE")} kr</td></tr>
          ${params.surcharge > 0 ? `<tr><td style="padding:6px 0;color:#666">Tillägg</td><td>${params.surcharge.toLocaleString("sv-SE")} kr</td></tr>` : ""}
          <tr><td style="padding:6px 0;color:#666">Analys</td><td style="font-weight:600;color:${statusColor}">${statusLabel} (+${params.percentAbove ?? 0}%)</td></tr>
          ${params.note ? `<tr><td style="padding:6px 0;color:#666">Kommentar</td><td style="font-style:italic">"${params.note}"</td></tr>` : ""}
        </table>
        <div style="margin-top:24px">
          <a href="https://fraktpool.se/admin/cases"
            style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            Öppna adminvyn →
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendUserConfirmation(params: {
  to: string;
  contactName: string;
  companyName: string;
  fromCountry: string;
  toCountry: string;
}) {
  await transporter.sendMail({
    from: `FraktPool <${process.env.GMAIL_USER}>`,
    to: params.to,
    subject: "Vi har mottagit din förfrågan — FraktPool",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#2563eb">🚢 Tack, ${params.contactName}!</h2>
        <p style="color:#444;line-height:1.6">
          Vi har mottagit din förfrågan om frakt
          <strong>${params.fromCountry} → ${params.toCountry}</strong>
          för <strong>${params.companyName}</strong>.
        </p>
        <p style="color:#444;line-height:1.6">
          Vi återkommer inom <strong>24 timmar</strong> med ett konkret förslag
          på hur vi kan förhandla ett bättre pris för din räkning.
        </p>
        <p style="color:#888;font-size:13px;margin-top:32px">
          FraktPool · <a href="https://fraktpool.se" style="color:#2563eb">fraktpool.se</a>
        </p>
      </div>
    `,
  });
}
