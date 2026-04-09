// lib/validate.ts — Regelmotor för FraktPool
// AI fattar INGA beslut här. Regelmotorn är deterministisk.

export type ValidationStatus = "rimligt" | "lite_hogt" | "avvikande";

export interface ShipmentInput {
  fromCountry: string;
  toCountry: string;
  weightKg?: number;
  volumeM3?: number;
  goodsType?: string;
  carrierName?: string;
  price: number;
  surcharge?: number;
  deliveryDays?: number;
}

export interface ValidationResult {
  status: ValidationStatus;
  label: string;
  percentAbove: number;
  benchmarkPrice: number;
  benchmarkSource: "historisk" | "marknad";
  sampleSize: number;
  warnings: string[];
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Hårdkodade marknadsriktpriser (EUR/sändning, internationellt)
// Källa: estimat baserat på europeisk marknad
// ---------------------------------------------------------------------------
const MARKET_BASE_EUR: Record<string, number> = {
  Pallar:          850,
  Paket:           120,
  Styckegods:      650,
  Kylvaror:       1200,
  "Farligt gods": 1500,
  Containers:     3000,
  Annat:           900,
};

const MARKET_PER_KG_EUR: Record<string, number> = {
  Pallar:          1.2,
  Paket:           4.5,
  Styckegods:      1.8,
  Kylvaror:        2.8,
  "Farligt gods":  3.5,
  Containers:      0.4,
  Annat:           1.8,
};

// Surcharge-tröskel: om surcharge > 20% av pris → varning
const SURCHARGE_RATIO_THRESHOLD = 0.20;

// Leveranstid-tröskel (dagar): om > detta + pris är högt → varning
const LONG_DELIVERY_DAYS = 7;

function marketBenchmark(input: ShipmentInput): number {
  const goods = input.goodsType ?? "Annat";
  const base = MARKET_BASE_EUR[goods] ?? MARKET_BASE_EUR["Annat"];
  const perKg = MARKET_PER_KG_EUR[goods] ?? MARKET_PER_KG_EUR["Annat"];
  const weightExtra = input.weightKg ? Math.max(0, input.weightKg - 100) * perKg : 0;
  return Math.round(base + weightExtra);
}

function statusFromPercent(pct: number): ValidationStatus {
  if (pct > 25) return "avvikande";
  if (pct > 10) return "lite_hogt";
  return "rimligt";
}

const STATUS_LABELS: Record<ValidationStatus, string> = {
  rimligt:   "Rimligt",
  lite_hogt: "Lite högt",
  avvikande: "Avvikande",
};

function buildWarnings(input: ShipmentInput, status: ValidationStatus): string[] {
  const warnings: string[] = [];

  if (input.surcharge && input.price > 0) {
    const surchargeRatio = input.surcharge / input.price;
    if (surchargeRatio > SURCHARGE_RATIO_THRESHOLD) {
      warnings.push(
        `Tilläggsavgiften (${input.surcharge} kr) är ${Math.round(surchargeRatio * 100)}% av grundpriset — ovanligt hög.`
      );
    }
  }

  if (input.deliveryDays && input.deliveryDays > LONG_DELIVERY_DAYS && status !== "rimligt") {
    warnings.push(
      `Lång leveranstid (${input.deliveryDays} dagar) i kombination med högt pris. Överväg expressleverans från annan speditör.`
    );
  }

  if (input.weightKg && input.weightKg > 5000 && status === "avvikande") {
    warnings.push("Hög vikt — begär volymbaserad offert, det kan ge ett väsentligt lägre pris.");
  }

  return warnings;
}

function buildRecommendation(status: ValidationStatus, input: ShipmentInput): string {
  if (status === "rimligt") {
    return "Priset är i linje med marknaden. Ingen omedelbar åtgärd krävs.";
  }
  if (status === "lite_hogt") {
    const carrier = input.carrierName
      ? `Begär en ny offert från ${input.carrierName} och`
      : "Begär offert från fler speditörer och";
    return `${carrier} jämför med minst ett alternativ för denna korridor.`;
  }
  return (
    "Granska fakturan noggrant. Begär full specifikation av tilläggsavgifter " +
    "och hämta in minst två alternativa offerter. Det kan finnas ett faktureringsfel."
  );
}

// ---------------------------------------------------------------------------
// Huvud-funktion
// historicalPrices = priser från DB för samma korridor + varutyp
// ---------------------------------------------------------------------------
export function validateShipment(
  input: ShipmentInput,
  historicalPrices: number[]
): ValidationResult {
  let benchmarkPrice: number;
  let benchmarkSource: "historisk" | "marknad";
  let sampleSize: number;

  if (historicalPrices.length >= 3) {
    const avg = historicalPrices.reduce((a, b) => a + b, 0) / historicalPrices.length;
    benchmarkPrice = Math.round(avg);
    benchmarkSource = "historisk";
    sampleSize = historicalPrices.length;
  } else {
    benchmarkPrice = marketBenchmark(input);
    benchmarkSource = "marknad";
    sampleSize = 0;
  }

  const percentAbove = Math.round(((input.price - benchmarkPrice) / benchmarkPrice) * 100);
  const status = statusFromPercent(percentAbove);
  const warnings = buildWarnings(input, status);
  const recommendation = buildRecommendation(status, input);

  return {
    status,
    label: STATUS_LABELS[status],
    percentAbove,
    benchmarkPrice,
    benchmarkSource,
    sampleSize,
    warnings,
    recommendation,
  };
}
