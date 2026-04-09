import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { sendAdminNotification, sendUserConfirmation } from "@/lib/mailer";

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

    // E-post — båda är valfria, fel blockerar inte svaret
    try {
      await sendAdminNotification({
        companyName:    shipment.companyName,
        contactName:    shipment.contactName,
        email:          shipment.email,
        fromCountry:    shipment.fromCountry,
        toCountry:      shipment.toCountry,
        carrierName:    shipment.carrierName,
        goodsType:      shipment.goodsType,
        price:          shipment.price,
        surcharge:      shipment.surcharge,
        analysisStatus: shipment.analysisStatus,
        percentAbove:   shipment.percentAbove,
        note:           shipment.note,
      });
    } catch { /* e-post är valfritt */ }

    try {
      await sendUserConfirmation({
        to:          shipment.email,
        contactName: shipment.contactName,
        companyName: shipment.companyName,
        fromCountry: shipment.fromCountry,
        toCountry:   shipment.toCountry,
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
