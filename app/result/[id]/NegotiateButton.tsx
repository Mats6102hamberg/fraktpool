"use client";

import { useState } from "react";

export default function NegotiateButton({
  shipmentId,
  alreadyLead,
}: {
  shipmentId: string;
  alreadyLead: boolean;
}) {
  const [done, setDone] = useState(alreadyLead);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (done) return;
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId }),
      });
      if (res.ok) setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="w-full bg-white/20 text-white text-center py-3 rounded-xl text-sm font-semibold">
        ✓ Förfrågan skickad
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full bg-white text-blue-600 hover:bg-blue-50 disabled:bg-white/70 py-3 rounded-xl text-sm font-bold transition-colors"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Skickar...
        </span>
      ) : (
        "Förhandla bättre pris åt mig →"
      )}
    </button>
  );
}
