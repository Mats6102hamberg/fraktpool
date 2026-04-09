import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { lead: true },
    });
    if (!shipment) return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
    return NextResponse.json(shipment);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fel" }, { status: 500 });
  }
}
