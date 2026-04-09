import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STATUS_BADGE: Record<string, string> = {
  rimligt:   "bg-green-100 text-green-700",
  lite_hogt: "bg-yellow-100 text-yellow-700",
  avvikande: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  rimligt: "Rimligt", lite_hogt: "Lite högt", avvikande: "Avvikande",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const shipments = await prisma.shipment.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, fromCountry: true, toCountry: true, carrierName: true,
      price: true, goodsType: true, analysisStatus: true,
      companyName: true, createdAt: true,
      lead: { select: { id: true } },
    },
  });

  const total      = shipments.length;
  const avvikande  = shipments.filter(s => s.analysisStatus === "avvikande").length;
  const leads      = shipments.filter(s => s.lead).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/new" className="flex items-center gap-2 text-gray-900 hover:text-blue-600 transition-colors">
            <span className="text-xl">🚢</span>
            <span className="font-bold">FraktPool</span>
          </Link>
          <Link href="/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
            + Ny analys
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Frakthistorik</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <p className="text-2xl font-extrabold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500 mt-1">Analyser totalt</p>
          </div>
          <div className="bg-red-50 rounded-2xl border border-red-100 p-5 text-center">
            <p className="text-2xl font-extrabold text-red-600">{avvikande}</p>
            <p className="text-xs text-red-500 mt-1">Avvikande priser</p>
          </div>
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5 text-center">
            <p className="text-2xl font-extrabold text-blue-600">{leads}</p>
            <p className="text-xs text-blue-500 mt-1">Förhandlingsärenden</p>
          </div>
        </div>

        {shipments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 mb-4">Inga analyser ännu.</p>
            <Link href="/new" className="text-blue-600 font-medium hover:underline">Analysera din första frakt →</Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Korridor</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Företag</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Varutyp</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Pris</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Ärende</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shipments.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/result/${s.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {s.fromCountry} → {s.toCountry}
                      </Link>
                      {s.carrierName && <span className="text-gray-400 text-xs ml-2">{s.carrierName}</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{s.companyName}</td>
                    <td className="px-5 py-3 text-gray-500">{s.goodsType ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      {s.price.toLocaleString("sv-SE")} kr
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[s.analysisStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[s.analysisStatus] ?? s.analysisStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {s.lead ? (
                        <span className="text-xs text-blue-600 font-medium">✓ Skickat</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400 text-xs">
                      {new Date(s.createdAt).toLocaleDateString("sv-SE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
