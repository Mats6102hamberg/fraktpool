import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const VALID_STATUSES = ["new", "contacted", "negotiating", "won", "lost"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const adminAuth = cookieStore.get("admin_auth");
    if (adminAuth?.value !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Ej behörig" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Ogiltigt status" }, { status: 400 });
    }

    const lead = await prisma.freightLead.update({
      where: { id },
      data: {
        ...(body.status          ? { status: body.status }                 : {}),
        ...(body.internalComment !== undefined ? { internalComment: body.internalComment } : {}),
      },
    });

    return NextResponse.json(lead);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fel" }, { status: 500 });
  }
}
