import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { validateShipment } from "@/lib/validate";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  try {
    const shipments = await prisma.shipment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        fromCountry: true,
        toCountry: true,
        carrierName: true,
        price: true,
        goodsType: true,
        analysisStatus: true,
        companyName: true,
        createdAt: true,
        lead: { select: { id: true, status: true } },
      },
    });
    return NextResponse.json(shipments);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fel" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const required = ["fromCountry", "toCountry", "price", "companyName", "contactName", "email"];
    for (const f of required) {
      if (!body[f]) return NextResponse.json({ error: `${f} saknas` }, { status: 400 });
    }

    // Hämta historiska priser för samma korridor + varutyp
    const historical = await prisma.shipment.findMany({
      where: {
        fromCountry: { equals: body.fromCountry, mode: "insensitive" },
        toCountry:   { equals: body.toCountry,   mode: "insensitive" },
        ...(body.goodsType ? { goodsType: body.goodsType } : {}),
      },
      select: { price: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const historicalPrices = historical.map((s) => s.price);

    // Kör regelmotor
    const result = validateShipment(
      {
        fromCountry:  body.fromCountry,
        toCountry:    body.toCountry,
        price:        Number(body.price),
        weightKg:     body.weightKg   ? Number(body.weightKg)   : undefined,
        volumeM3:     body.volumeM3   ? Number(body.volumeM3)   : undefined,
        goodsType:    body.goodsType  ?? undefined,
        carrierName:  body.carrierName ?? undefined,
        surcharge:    body.surcharge  ? Number(body.surcharge)  : undefined,
        deliveryDays: body.deliveryDays ? Number(body.deliveryDays) : undefined,
      },
      historicalPrices
    );

    // AI formulerar förklaring (fattar INGET beslut)
    let analysisReason = "";
    try {
      const benchmarkDesc =
        result.benchmarkSource === "historisk"
          ? `genomsnittet av ${result.sampleSize} liknande frakter (${result.benchmarkPrice.toLocaleString("sv-SE")} kr)`
          : `marknadsriktpriset för ${body.goodsType ?? "gods"} (${result.benchmarkPrice.toLocaleString("sv-SE")} kr)`;

      const prompt = `Du är expert på internationell fraktlogistik. Förklara kortfattat (2–3 meningar, svenska) varför följande frakt bedömts som "${result.label}". Fatta INGA egna beslut — förklara bara det redan fattade beslutet.

Korridor: ${body.fromCountry} → ${body.toCountry}
Varutyp: ${body.goodsType ?? "okänd"}
Pris: ${body.price} kr
Benchmark: ${benchmarkDesc}
Avvikelse: ${result.percentAbove > 0 ? "+" : ""}${result.percentAbove}%
Varningar: ${result.warnings.length > 0 ? result.warnings.join("; ") : "inga"}`;

      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 250,
        messages: [{ role: "user", content: prompt }],
      });
      analysisReason =
        msg.content[0].type === "text" ? msg.content[0].text : "";
    } catch { /* AI är valfritt */ }

    // Spara i DB
    const shipment = await prisma.shipment.create({
      data: {
        fromCountry:    body.fromCountry,
        toCountry:      body.toCountry,
        weightKg:       body.weightKg     ? Number(body.weightKg)     : null,
        volumeM3:       body.volumeM3     ? Number(body.volumeM3)     : null,
        goodsType:      body.goodsType    ?? null,
        carrierName:    body.carrierName  ?? null,
        price:          Number(body.price),
        surcharge:      body.surcharge    ? Number(body.surcharge)    : 0,
        deliveryDays:   body.deliveryDays ? Number(body.deliveryDays) : null,
        companyName:    body.companyName,
        contactName:    body.contactName,
        email:          body.email,
        note:           body.note ?? null,
        analysisStatus: result.status,
        analysisReason,
        percentAbove:   result.percentAbove,
        benchmarkPrice: result.benchmarkPrice,
        warnings:       result.warnings,
      },
    });

    return NextResponse.json({ shipmentId: shipment.id, result, analysisReason });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fel" }, { status: 500 });
  }
}
