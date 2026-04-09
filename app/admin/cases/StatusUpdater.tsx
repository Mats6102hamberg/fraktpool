"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "new",         label: "Ny"         },
  { value: "contacted",   label: "Kontaktad"  },
  { value: "negotiating", label: "Förhandlar" },
  { value: "won",         label: "Vunnen"     },
  { value: "lost",        label: "Förlorad"   },
];

export default function StatusUpdater({
  leadId,
  currentStatus,
  currentComment,
}: {
  leadId: string;
  currentStatus: string;
  currentComment: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [comment, setComment] = useState(currentComment);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, internalComment: comment }),
      });
      router.refresh();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-50">
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
          Uppdatera status / lägg till anteckning
        </button>
      ) : (
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="text-xs text-gray-500 block mb-1">Intern anteckning</label>
            <input value={comment} onChange={e => setComment(e.target.value)}
              placeholder="T.ex. kontaktade DHL, väntar svar..."
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
              {saving ? "Sparar..." : "Spara"}
            </button>
            <button onClick={() => setOpen(false)}
              className="text-sm text-gray-400 hover:text-gray-600 px-2">
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
