import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mhg10mhg@gmail.com";
const FROM_EMAIL  = process.env.FROM_EMAIL  ?? "noreply@fraktpool.se";

export async function POST(req: NextRequest) {
  try {
    const { shipmentId } = await req.json();
    if (!shipmentId) return NextResponse.json({ error: "shipmentId saknas" }, { status: 400 });

    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) return NextResponse.json({ error: "Frakt hittades inte" }, { status: 404 });

    // Returnera befintligt lead om det redan finns
    const existing = await prisma.freightLead.findUnique({ where: { shipmentId } });
    if (existing) return NextResponse.json(existing);

    const lead = await prisma.freightLead.create({
      data: {
        shipmentId,
        companyName: shipment.companyName,
        contactName: shipment.contactName,
        email:       shipment.email,
      },
    });

    // E-post till admin
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to:   ADMIN_EMAIL,
        subject: `🚢 Nytt förhandlingsärende — ${shipment.companyName}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
            <h2 style="color:#2563eb">Nytt förhandlingsärende</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#666;width:140px">Företag</td><td style="font-weight:600">${shipment.companyName}</td></tr>
              <tr><td style="padding:6px 0;color:#666">Kontaktperson</td><td>${shipment.contactName}</td></tr>
              <tr><td style="padding:6px 0;color:#666">E-post</td><td><a href="mailto:${shipment.email}">${shipment.email}</a></td></tr>
              <tr><td style="padding:6px 0;color:#666">Korridor</td><td style="font-weight:600">${shipment.fromCountry} → ${shipment.toCountry}</td></tr>
              <tr><td style="padding:6px 0;color:#666">Speditör</td><td>${shipment.carrierName ?? "—"}</td></tr>
              <tr><td style="padding:6px 0;color:#666">Varutyp</td><td>${shipment.goodsType ?? "—"}</td></tr>
              <tr><td style="padding:6px 0;color:#666">Pris</td><td style="font-weight:600">${shipment.price.toLocaleString("sv-SE")} kr</td></tr>
              ${shipment.surcharge > 0 ? `<tr><td style="padding:6px 0;color:#666">Tilläggsavgift</td><td>${shipment.surcharge.toLocaleString("sv-SE")} kr</td></tr>` : ""}
              <tr><td style="padding:6px 0;color:#666">Analys</td><td style="font-weight:600;color:${shipment.analysisStatus === "avvikande" ? "#dc2626" : "#d97706"}">${shipment.analysisStatus === "avvikande" ? "Avvikande" : "Lite högt"} (+${shipment.percentAbove ?? 0}%)</td></tr>
              ${shipment.note ? `<tr><td style="padding:6px 0;color:#666">Kommentar</td><td style="font-style:italic">"${shipment.note}"</td></tr>` : ""}
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
    } catch { /* e-post är valfritt */ }

    // Bekräftelse till användaren
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to:   shipment.email,
        subject: "Vi har mottagit din förfrågan — FraktPool",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
            <h2 style="color:#2563eb">🚢 Tack, ${shipment.contactName}!</h2>
            <p style="color:#444;line-height:1.6">
              Vi har mottagit din förfrågan om frakt <strong>${shipment.fromCountry} → ${shipment.toCountry}</strong>
              för <strong>${shipment.companyName}</strong>.
            </p>
            <p style="color:#444;line-height:1.6">
              Vi återkommer till dig inom <strong>24 timmar</strong> med ett konkret förslag på hur vi kan
              förhandla ett bättre pris för din räkning.
            </p>
            <p style="color:#888;font-size:13px;margin-top:32px">
              FraktPool · <a href="https://fraktpool.se" style="color:#2563eb">fraktpool.se</a>
            </p>
          </div>
        `,
      });
    } catch { /* e-post är valfritt */ }

    return NextResponse.json(lead, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fel" }, { status: 500 });
  }
}

// Admin-skyddad: lista alla leads
export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminAuth = cookieStore.get("admin_auth");
    if (adminAuth?.value !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Ej behörig" }, { status: 401 });
    }

    const leads = await prisma.freightLead.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        shipment: {
          select: {
            fromCountry: true,
            toCountry:   true,
            price:       true,
            carrierName: true,
            analysisStatus: true,
          },
        },
      },
    });
    return NextResponse.json(leads);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fel" }, { status: 500 });
  }
}
