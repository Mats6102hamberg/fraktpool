import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusUpdater from "./StatusUpdater";

const LEAD_STATUS_BADGE: Record<string, string> = {
  new:          "bg-blue-100 text-blue-700",
  contacted:    "bg-yellow-100 text-yellow-700",
  negotiating:  "bg-purple-100 text-purple-700",
  won:          "bg-green-100 text-green-700",
  lost:         "bg-gray-100 text-gray-500",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Ny", contacted: "Kontaktad", negotiating: "Förhandlar", won: "Vunnen", lost: "Förlorad",
};

const ANALYSIS_BADGE: Record<string, string> = {
  rimligt:   "bg-green-100 text-green-700",
  lite_hogt: "bg-yellow-100 text-yellow-700",
  avvikande: "bg-red-100 text-red-700",
};

const ANALYSIS_LABELS: Record<string, string> = {
  rimligt: "Rimligt", lite_hogt: "Lite högt", avvikande: "Avvikande",
};

export const dynamic = "force-dynamic";

export default async function AdminCasesPage() {
  const cookieStore = await cookies();
  const adminAuth = cookieStore.get("admin_auth");

  if (adminAuth?.value !== process.env.ADMIN_PASSWORD) {
    redirect("/admin/login");
  }

  const leads = await prisma.freightLead.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      shipment: {
        select: {
          fromCountry: true, toCountry: true, price: true,
          surcharge: true, carrierName: true, goodsType: true,
          weightKg: true, analysisStatus: true, percentAbove: true, note: true,
        },
      },
    },
  });

  const byStatus = (s: string) => leads.filter(l => l.status === s).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚢</span>
            <span className="font-bold text-gray-900">FraktPool</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-1">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">Publikt dashboard</Link>
            <form action="/api/admin/auth" method="POST">
              <button
                formAction="/api/admin/auth"
                type="button"
                onClick={async () => {
                  await fetch("/api/admin/auth", { method: "DELETE" });
                  window.location.href = "/admin/login";
                }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Logga ut
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Förhandlingsärenden</h1>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {[
            { key: "new",         label: "Nya",         color: "blue"   },
            { key: "contacted",   label: "Kontaktade",  color: "yellow" },
            { key: "negotiating", label: "Förhandlar",  color: "purple" },
            { key: "won",         label: "Vunna",       color: "green"  },
            { key: "lost",        label: "Förlorade",   color: "gray"   },
          ].map(({ key, label, color }) => (
            <div key={key} className={`bg-${color}-50 rounded-2xl border border-${color}-100 p-4 text-center`}>
              <p className={`text-2xl font-extrabold text-${color}-600`}>{byStatus(key)}</p>
              <p className={`text-xs text-${color}-500 mt-1`}>{label}</p>
            </div>
          ))}
        </div>

        {leads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">Inga ärenden ännu.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map(lead => (
              <div key={lead.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-gray-900">{lead.companyName}</span>
                      <span className="text-gray-400 text-sm">·</span>
                      <span className="text-sm text-gray-600">{lead.contactName}</span>
                      <span className="text-gray-400 text-sm">·</span>
                      <a href={`mailto:${lead.email}`} className="text-sm text-blue-600 hover:underline">{lead.email}</a>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                      <span className="font-medium text-gray-900">
                        {lead.shipment.fromCountry} → {lead.shipment.toCountry}
                      </span>
                      {lead.shipment.carrierName && <span>{lead.shipment.carrierName}</span>}
                      {lead.shipment.goodsType && <span>{lead.shipment.goodsType}</span>}
                      {lead.shipment.weightKg && <span>{lead.shipment.weightKg} kg</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">
                        {lead.shipment.price.toLocaleString("sv-SE")} kr
                        {lead.shipment.surcharge > 0 && (
                          <span className="text-gray-400 font-normal text-xs ml-1">
                            + {lead.shipment.surcharge.toLocaleString("sv-SE")} kr tillägg
                          </span>
                        )}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ANALYSIS_BADGE[lead.shipment.analysisStatus] ?? ""}`}>
                        {ANALYSIS_LABELS[lead.shipment.analysisStatus] ?? lead.shipment.analysisStatus}
                        {lead.shipment.percentAbove != null && ` (+${lead.shipment.percentAbove}%)`}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(lead.createdAt).toLocaleDateString("sv-SE")}
                      </span>
                    </div>
                    {lead.shipment.note && (
                      <p className="text-xs text-gray-500 mt-2 italic">"{lead.shipment.note}"</p>
                    )}
                    {lead.internalComment && (
                      <p className="text-xs text-purple-600 mt-1">📝 {lead.internalComment}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${LEAD_STATUS_BADGE[lead.status] ?? ""}`}>
                      {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                    <Link href={`/result/${lead.shipmentId}`}
                      className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                      Visa analys →
                    </Link>
                  </div>
                </div>
                <StatusUpdater leadId={lead.id} currentStatus={lead.status} currentComment={lead.internalComment ?? ""} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
