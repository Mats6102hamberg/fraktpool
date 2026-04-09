import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NegotiateButton from "./NegotiateButton";

const STATUS_CONFIG = {
  rimligt:   { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  badge: "bg-green-100 text-green-700",  icon: "✓" },
  lite_hogt: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700", icon: "△" },
  avvikande: { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    badge: "bg-red-100 text-red-700",       icon: "⚠" },
};

const STATUS_LABELS: Record<string, string> = {
  rimligt: "Rimligt", lite_hogt: "Lite högt", avvikande: "Avvikande",
};

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: { lead: true },
  });

  if (!shipment) notFound();

  const cfg = STATUS_CONFIG[shipment.analysisStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.rimligt;
  const label = STATUS_LABELS[shipment.analysisStatus] ?? shipment.analysisStatus;
  const alreadyLead = !!shipment.lead;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/new" className="flex items-center gap-2 text-gray-900 hover:text-blue-600 transition-colors">
            <span className="text-xl">🚢</span>
            <span className="font-bold">FraktPool</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">Historik →</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Analysresultat</h1>
          <p className="text-sm text-gray-500">
            {shipment.fromCountry} → {shipment.toCountry} · {shipment.companyName}
          </p>
        </div>

        {/* Status-kort */}
        <div className={`rounded-2xl border p-6 ${cfg.bg} ${cfg.border}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`inline-flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full ${cfg.badge}`}>
              <span>{cfg.icon}</span> {label}
            </span>
            <span className={`text-xs font-medium ${cfg.text}`}>
              {(shipment.percentAbove ?? 0) > 0 ? `+${shipment.percentAbove}%` : `${shipment.percentAbove}%`} mot riktpris
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Ditt pris</p>
              <p className="text-xl font-extrabold text-gray-900">{shipment.price.toLocaleString("sv-SE")} kr</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Riktpris</p>
              <p className="text-xl font-extrabold text-gray-700">{(shipment.benchmarkPrice ?? 0).toLocaleString("sv-SE")} kr</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Avvikelse</p>
              <p className={`text-xl font-extrabold ${cfg.text}`}>
                {(shipment.percentAbove ?? 0) > 0 ? "+" : ""}{shipment.percentAbove}%
              </p>
            </div>
          </div>
          {shipment.surcharge > 0 && (
            <p className="text-xs text-gray-500 mt-3 text-center">
              Varav tilläggsavgift: {shipment.surcharge.toLocaleString("sv-SE")} kr
            </p>
          )}
        </div>

        {/* AI-förklaring */}
        {shipment.analysisReason && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span>🤖</span>
              <h2 className="text-sm font-semibold text-gray-700">Förklaring</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{shipment.analysisReason}</p>
          </div>
        )}

        {/* Varningar */}
        {shipment.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-amber-700 mb-2">⚠ Varningar</h2>
            <ul className="space-y-1">
              {shipment.warnings.map((w, i) => (
                <li key={i} className="text-sm text-amber-700">• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA — Förhandla */}
        {shipment.analysisStatus !== "rimligt" && (
          <div className="bg-blue-600 rounded-2xl p-6 text-white">
            <h2 className="text-lg font-bold mb-2">
              {alreadyLead ? "✓ Din förfrågan är mottagen" : "Vill du ha ett bättre pris?"}
            </h2>
            <p className="text-sm text-blue-100 mb-4">
              {alreadyLead
                ? "Vi återkommer till dig inom 24 timmar med ett konkret förslag."
                : "FraktPool förhandlar direkt med speditörerna åt dig. Du betalar ingenting förrän vi lyckats."}
            </p>
            <NegotiateButton shipmentId={shipment.id} alreadyLead={alreadyLead} />
          </div>
        )}

        {/* Fraktdetaljer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Analyserad frakt</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-gray-500">Korridor</span>
            <span className="font-medium">{shipment.fromCountry} → {shipment.toCountry}</span>
            {shipment.goodsType && <><span className="text-gray-500">Varutyp</span><span>{shipment.goodsType}</span></>}
            {shipment.carrierName && <><span className="text-gray-500">Speditör</span><span>{shipment.carrierName}</span></>}
            {shipment.weightKg && <><span className="text-gray-500">Vikt</span><span>{shipment.weightKg} kg</span></>}
            {shipment.volumeM3 && <><span className="text-gray-500">Volym</span><span>{shipment.volumeM3} m³</span></>}
            {shipment.deliveryDays && <><span className="text-gray-500">Leveranstid</span><span>{shipment.deliveryDays} dagar</span></>}
            <span className="text-gray-500">Företag</span><span>{shipment.companyName}</span>
          </div>
        </div>

        <Link href="/new"
          className="block w-full text-center border border-gray-200 hover:border-gray-300 text-gray-600 py-3 rounded-xl text-sm font-medium transition-colors">
          ← Analysera en annan frakt
        </Link>
      </main>
    </div>
  );
}
