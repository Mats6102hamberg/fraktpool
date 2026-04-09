import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to:   process.env.GMAIL_USER,
      subject: "FraktPool — testmail ✓",
      text: "Om du ser detta fungerar e-posten.",
    });

    return NextResponse.json({ ok: true, message: "Mail skickat!" });
  } catch (e: unknown) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
