# HANDOVER — FraktPool

## Projektöversikt
FraktPool = kollektiv förhandlingskraft för fraktkostnader.
Steg 1 (detta): Analysverktyg + leadinsamling.
Vision: Aggregera volym från många företag, förhandla storföretagsavtal, ta mellanskillnaden.

## Tech Stack
| Lager | Teknik |
|-------|--------|
| Frontend | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Databas | Neon PostgreSQL via Prisma 7 + @prisma/adapter-neon |
| AI | Anthropic Claude Haiku (förklaring endast, inga beslut) |
| Deploy | Vercel |

## Sidor
| Sida | Beskrivning |
|------|-------------|
| `/new` | Formulär: mata in frakt + kontaktuppgifter |
| `/result/[id]` | Analysresultat + "Förhandla bättre pris åt mig"-knapp |
| `/dashboard` | Historik över alla frakter |
| `/admin/cases` | Adminvy för förhandlingsärenden (lösenordsskyddad) |
| `/admin/login` | Adminlösenord |

## API-routes
| Route | Metod | Funktion |
|-------|-------|----------|
| `/api/shipments` | POST | Skapa frakt (kör regelmotor + AI) |
| `/api/shipments` | GET | Lista frakter |
| `/api/shipments/[id]` | GET | Hämta enskild frakt |
| `/api/leads` | POST | Skapa förhandlingsärende |
| `/api/leads` | GET | Lista ärenden (admin) |
| `/api/leads/[id]` | PATCH | Uppdatera status/kommentar |
| `/api/admin/auth` | POST | Adminlogin (sätter cookie) |
| `/api/admin/auth` | DELETE | Adminlogout |

## Datamodell (Prisma)
```
Shipment — fraktdata + analysresultat
  id, fromCountry, toCountry, weightKg, volumeM3, goodsType, carrierName
  price, surcharge, deliveryDays
  companyName, contactName, email, note
  analysisStatus (rimligt|lite_hogt|avvikande), analysisReason
  percentAbove, benchmarkPrice, warnings[]

FreightLead — förhandlingsärende
  id, shipmentId (unique), companyName, contactName, email
  status (new|contacted|negotiating|won|lost)
  internalComment, createdAt, updatedAt
```

## Regelmotor (lib/validate.ts)
- AI fattar INGA beslut
- ≥3 historiska frakter för korridoren → genomsnitt som benchmark
- <3 → hårdkodade marknadsriktpriser (EUR/sändning per varutyp)
- >25% över benchmark → Avvikande
- 10–25% → Lite högt
- ≤10% → Rimligt
- Varningar: hög surcharge (>20% av pris), lång leveranstid + högt pris

## Prisma 7 — viktigt
Prisma 7 har breaking change: `url` i schema.prisma är borttagen.
- CLI-config: `prisma.config.ts` (har DATABASE_URL)
- Client: `lib/prisma.ts` använder `PrismaNeon` adapter
- Build: `prisma generate && next build`

## Admin
- Lösenord sätts via `ADMIN_PASSWORD` env var
- Vercel: satt till `FraktPool2026!`
- Cookie `admin_auth` (httpOnly, 7 dagar)
- Ändra via: `vercel env rm ADMIN_PASSWORD && echo "nytt" | vercel env add ADMIN_PASSWORD production`

## Env-variabler
```
DATABASE_URL=postgresql://neondb_owner:npg_sSeVAl0UGx5n@ep-wispy-field-aleydu9f-pooler...
ANTHROPIC_API_KEY=sk-ant-...
ADMIN_PASSWORD=FraktPool2026!
```

## Infrastruktur
- GitHub: https://github.com/Mats6102hamberg/fraktpool
- Vercel: https://fraktpool.vercel.app
- Neon: projekt `cool-term-47920430`, `aws-eu-central-1`

## Produktvision (nästa steg)
1. Testa med riktiga logistikchefer → validera att de klickar "Förhandla"
2. Manuellt kontakta speditörer för de inkomna ärendena
3. Bygg avtalsmodell (bashöjd, viktbrytpunkter, bränselkorrektion)
4. Stripe för betalning (andel av besparing eller månadsavgift)
5. Skaffa fraktpool.se på Loopia → koppla till Vercel

## Senast uppdaterat
2026-04-09 — MVP v2 byggt från scratch
