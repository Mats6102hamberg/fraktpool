"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const GOODS_TYPES = ["Pallar", "Paket", "Styckegods", "Kylvaror", "Farligt gods", "Containers", "Annat"];
const CARRIERS = ["DHL", "UPS", "FedEx/TNT", "PostNord", "Schenker", "Bring", "DSV", "DB Schenker", "Annat"];

export default function NewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fromCountry: "", toCountry: "", weightKg: "", volumeM3: "",
    goodsType: "", carrierName: "", price: "", surcharge: "", deliveryDays: "",
    companyName: "", contactName: "", email: "", note: "",
  });

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price:        form.price       ? Number(form.price)       : undefined,
          surcharge:    form.surcharge   ? Number(form.surcharge)   : undefined,
          weightKg:     form.weightKg    ? Number(form.weightKg)    : undefined,
          volumeM3:     form.volumeM3    ? Number(form.volumeM3)    : undefined,
          deliveryDays: form.deliveryDays ? Number(form.deliveryDays) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/result/${data.shipmentId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Något gick fel");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚢</span>
            <span className="font-bold text-gray-900">FraktPool</span>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Historik →
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Ny fraktanalys</h1>
          <p className="text-gray-500 text-sm">Fyll i fraktuppgifterna så analyserar systemet om priset är rimligt.</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* Fraktdata */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Fraktdata</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Från (land) *</label>
                <input value={form.fromCountry} onChange={e => set("fromCountry", e.target.value)}
                  placeholder="T.ex. Sverige" required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Till (land) *</label>
                <input value={form.toCountry} onChange={e => set("toCountry", e.target.value)}
                  placeholder="T.ex. Tyskland" required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Pris (kr) *</label>
                <input type="number" min="1" value={form.price} onChange={e => set("price", e.target.value)} required
                  placeholder="T.ex. 3 500"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Tilläggsavgift (kr)</label>
                <input type="number" min="0" value={form.surcharge} onChange={e => set("surcharge", e.target.value)}
                  placeholder="T.ex. 400"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Vikt (kg)</label>
                <input type="number" min="0" value={form.weightKg} onChange={e => set("weightKg", e.target.value)}
                  placeholder="T.ex. 500"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Volym (m³)</label>
                <input type="number" min="0" step="0.1" value={form.volumeM3} onChange={e => set("volumeM3", e.target.value)}
                  placeholder="T.ex. 2.5"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Varutyp</label>
                <select value={form.goodsType} onChange={e => set("goodsType", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Välj...</option>
                  {GOODS_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Speditör</label>
                <select value={form.carrierName} onChange={e => set("carrierName", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Välj...</option>
                  {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Leveranstid (dagar)</label>
                <input type="number" min="1" value={form.deliveryDays} onChange={e => set("deliveryDays", e.target.value)}
                  placeholder="T.ex. 3"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
          </div>

          {/* Kontaktdata */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Kontaktuppgifter</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Företag *</label>
                <input value={form.companyName} onChange={e => set("companyName", e.target.value)} required
                  placeholder="T.ex. Andersson Logistik AB"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Kontaktperson *</label>
                <input value={form.contactName} onChange={e => set("contactName", e.target.value)} required
                  placeholder="T.ex. Anna Svensson"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">E-post *</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} required
                  placeholder="anna@andersson.se"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">Kommentar (valfritt)</label>
                <textarea value={form.note} onChange={e => set("note", e.target.value)} rows={2}
                  placeholder="T.ex. vi kör denna rutt 3 gånger i veckan..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3.5 rounded-xl text-base font-semibold transition-colors shadow-lg shadow-blue-100">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyserar...
              </span>
            ) : "Analysera frakt →"}
          </button>
        </form>
      </main>
    </div>
  );
}
