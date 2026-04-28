/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Users,
  Eye,
  Gavel,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  ExternalLink,
  Calendar,
  X,
  Search,
  MessageSquare,
  Copy,
  UserCheck,
  RefreshCw,
  UserPlus,
  ClipboardList,
  Trash2,
  Mail,
  Pencil,
  FileText,
  PenTool,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type View = 'nieuwste' | 'vorige' | 'matches' | 'manager' | 'klanten' | 'blog-post-maker';

// Types for our data
interface Viewing {
  address: string;
  dateTime: string;
}

interface Offer {
  amount: string;
  address: string;
  status: 'Groen' | 'Afgewezen' | 'Rood' | 'Geaccepteerd';
}

interface Customer {
  id: string;
  name: string;
  profile: {
    regio: string;
    bijzonderhedenRegio?: string;
    prijsklasse: string;
    woningtype: string;
    bijzondereKenmerken?: string;
  };
  viewings: Viewing[];
  totalViewings: number;
  offers: Offer[];
  structuralInspection?: {
    status: 'Nee' | 'Ingepland' | 'Gereed';
    date?: string;
    inspectorName?: string;
  };
  contract: {
    status: 'Nee' | 'afgewezen' | 'Ja Getekend';
    date?: string;
  };
}

interface HouseScan {
  row_number: number;
  ID: string;
  Datum: string;
  Makelaar: string;
  adres: string;
  Plaats: string;
  Wijk?: string;
  Prijs: string;
  m2: string;
  "m2 perseel": string;
  status: string;
  satus?: string; // Voor compatibiliteit met oude data
  link: string;
}

interface Match {
  id: number;
  clientName: string;
  address: string;
  matchPercentage: number;
  reason: string;
  shortSummary: string;
  features: string[];
  link: string;
  makelaar: string;
  matchCriteria?: { label: string; client: string; house: string; match: boolean }[];
}

// N8N Webhook URL's (Rechtstreekse verbinding)
const N8N_SCANS_URL = 'https://woonwensmakelaar.app.n8n.cloud/webhook/d20bd156-86c9-40ea-86aa-f92949d207e7';
const N8N_MATCHES_URL = 'https://woonwensmakelaar.app.n8n.cloud/webhook/d20bd156-86c9-40ea-86aa-f92949d207e7match';
const N8N_KLANTEN_URL = 'https://woonwensmakelaar.app.n8n.cloud/webhook/69dda1df-46e0-4fc4-bcb8-cade9d33f5a8';
const N8N_ADD_KLANT_URL = 'https://woonwensmakelaar.app.n8n.cloud/webhook/e4488576-ecab-4b82-8196-b3922eba62de';
const N8N_DELETE_KLANT_URL = 'https://woonwensmakelaar.app.n8n.cloud/webhook/8bf75a4c-2771-4d38-ad29-c5682e74bdfd';
const N8N_UPDATE_KLANT_URL = 'https://woonwensmakelaar.app.n8n.cloud/webhook/05d8cc66-ac17-4118-b160-c1a845116743';
const N8N_PREVIOUS_SCANS_URL = 'https://woonwensmakelaar.app.n8n.cloud/webhook/8a1ca729-88f1-4635-994b-169f8f1274cb';

const getRegion = (plaats: string): string => {
  if (!plaats) return 'overige';
  const p = plaats.toLowerCase();
  
  if (p.includes('maastricht')) return 'Maastricht';
  
  const heuvelland = ['gulpen', 'wittem', 'vaals', 'eijsden', 'margraten', 'meerssen', 'valkenburg', 'bemelen', 'cadier', 'mheer', 'noorbeek', 'slenaken', 'banholt', 'reijmerstok', 'terlinden', 'eys', 'wylre', 'nijs', 'geulle', 'bunde', 'ulestraten', 'berg', 'terblijt', 'vilt', 'sibbe', 'ijzeren', 'scheulder', 'wijlre'];
  if (heuvelland.some(city => p.includes(city))) return 'heuvelland';
  
  const parkstad = ['heerlen', 'kerkrade', 'landgraaf', 'brunssum', 'simpelveld', 'voerendaal', 'nuth', 'schinnen', 'onderbanken', 'beekdaelen', 'hulsberg', 'schimmert', 'wynandsrade', 'hoensbroek', 'eygelshoven', 'nieuwenhagen', 'uubachsberg', 'bocholtz'];
  if (parkstad.some(city => p.includes(city))) return 'parkstad';
  
  const westelijkeMijnstreek = ['sittard', 'geleen', 'beek', 'stein', 'elsloo', 'spaubeek', 'born', 'munstergeleen', 'puth', 'sweikhuizen', 'urmond', 'berg aan de maas', 'neerbeek', 'genhout', 'groot genhout'];
  if (westelijkeMijnstreek.some(city => p.includes(city))) return 'westelijke mijnstreek';
  
  const echtRoermond = ['echt', 'susteren', 'roermond', 'roerdalen', 'maasgouw', 'leudal', 'itternoorbeek', 'wessem', 'heel', 'thorn', 'linne', 'herten', 'swalmen', 'montfort', 'sint odilienberg', 'vlodrop', 'herkenbosch', 'posterholt', 'melick', 'vlodrop', 'sint joost', 'koningsbosch', 'mariahop', 'peij', 'nieuwstadt'];
  if (echtRoermond.some(city => p.includes(city))) return 'Echt Roermond';
  
  return 'overige';
};


// --- Direct N8N Parsing Helpers ---

// Helper voor PDOK Wijk Lookup (nu in de frontend)
async function getOfficialWijk(adres: string, plaats: string): Promise<string> {
  try {
    const rawQuery = `${adres}, ${plaats}`;
    const suggestUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(rawQuery)}&rows=1`;
    const suggestRes = await fetch(suggestUrl);
    const suggestData: any = await suggestRes.json();

    if (suggestData?.response?.docs?.length > 0) {
      const doc = suggestData.response.docs[0];
      const lookupUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?id=${doc.id}`;
      const lookupRes = await fetch(lookupUrl);
      const lookupData: any = await lookupRes.json();
      
      if (lookupData?.response?.docs?.length > 0) {
        const wijkRaw = lookupData.response.docs[0].wijknaam || 'Onbekend';
        return wijkRaw.replace(/^Wijk \d+ /i, ''); 
      }
    }
  } catch (error) {
    console.error('PDOK Fetch Error:', error);
  }
  return 'Wijk onbekend';
}

function parseStructuredN8nMatches(sourceArray: any[], datum: string): any[] {
  return sourceArray.map((item: any, index: number) => {
    let percentage = 0;
    const rawPct = item["match %"];
    if (typeof rawPct === 'number') {
      percentage = rawPct <= 1 && rawPct > 0 ? Math.round(rawPct * 100) : Math.round(rawPct);
    } else {
      const pctStr = String(rawPct || "0%");
      let parsed = parseInt(pctStr.replace(/\D/g, '')) || 0;
      if (pctStr.includes('.') && parsed < 10) parsed *= 10;
      percentage = parsed <= 1 && parsed > 0 ? Math.round(parsed * 100) : Math.round(parsed);
      if (percentage > 100) percentage = Math.floor(percentage / 10);
    }
    
    let isRegionMatch = (item["afstand zoekgebied"] || '').toLowerCase().trim() === "ja" || (item["afstand zoekgebied"] || '').toLowerCase().includes("exact") || (item["afstand zoekgebied"] || '').toLowerCase().includes("binnen");
    let isBudgetMatch = (item["prijs binnen budget"] || '').toLowerCase().includes("ja");
    let isSpecialMatch = true;

    // --- Verbeterde Woningtype & Woningsoort Check ---
    const checkSpecificMatch = (clientVal: string, houseVal: string) => {
      const c = (clientVal || '').toLowerCase().trim();
      const h = (houseVal || '').toLowerCase().trim();
      
      if (!c || c === 'alle woningtypes' || c.includes('n.v.t.') || c === 'nvt' || c === 'geen') return true;
      if (!h || h === 'n.v.t.' || h === 'nvt') return false;

      const clientWords = c.split(/[, \/]+/).filter((w: string) => w.length > 3);
      const synonyms: Record<string, string[]> = {
        'tweekapper': ['twee-onder-een', '2-onder-1', 'halfvrijstaand', 'geschakeld'],
        'halfvrijstaand': ['2-onder-1', 'tweekapper', 'twee-onder-een', 'geschakeld'],
        'bungalow': ['levensloopbestendig', 'gelijkvloers'],
        'levensloopbestendig': ['bungalow', 'gelijkvloers', 'semi-bungalow'],
        'vrijstaand': ['vrijstaande'],
        'eengezinswoning': ['tussenwoning', 'hoekwoning', 'rijtjeshuis']
      };

      for (const cw of clientWords) {
        if (h.includes(cw)) return true;
        if (synonyms[cw]) {
          for (const syn of synonyms[cw]) {
            if (h.includes(syn)) return true;
          }
        }
      }
      return false;
    };

    const clientType = item["woning type klnt prof"];
    const houseType = item["woning type adres"] || item["woning type"]; // fallback naar oude naam
    const clientSoort = item["woning soort klnt prof"];
    const houseSoort = item["woning soort adres"];

    let isTypeMatch = checkSpecificMatch(clientType, houseType);
    let isSoortMatch = checkSpecificMatch(clientSoort, houseSoort);


    // Use match_percentage_opbouw if provided by N8N
    const opbouw = item["match_percentage_opbouw"];
    const checkOpbouw = (val: any, fallback: boolean) => {
      if (val === undefined || val === null) return fallback;
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val > 0;
      if (typeof val === 'string') return val.includes('25') || val.toLowerCase().includes('true') || val.toLowerCase().includes('ja');
      return fallback;
    };

    if (opbouw && typeof opbouw === 'object') {
      isRegionMatch = checkOpbouw(opbouw.locatie, isRegionMatch);
      isBudgetMatch = checkOpbouw(opbouw.prijs, isBudgetMatch);
      const groupTypeMatch = checkOpbouw(opbouw["woning type"] || opbouw.woningtype || opbouw.woning_type, isTypeMatch && isSoortMatch);
      // Als de opbouw zegt dat het een match is, forceren we beide naar true als ze individueel ook ok lijken, 
      // of we volgen de opbouw strikt voor beide.
      isTypeMatch = groupTypeMatch;
      isSoortMatch = groupTypeMatch;
      isSpecialMatch = checkOpbouw(opbouw.bijzonderheden, isSpecialMatch);
    } else if (typeof opbouw === 'string') {
       try {
         const parsedOpbouw = JSON.parse(opbouw);
         isRegionMatch = checkOpbouw(parsedOpbouw.locatie, isRegionMatch);
         isBudgetMatch = checkOpbouw(parsedOpbouw.prijs, isBudgetMatch);
         const groupTypeMatch = checkOpbouw(parsedOpbouw["woning type"] || parsedOpbouw.woningtype || parsedOpbouw.woning_type, isTypeMatch && isSoortMatch);
         isTypeMatch = groupTypeMatch;
         isSoortMatch = groupTypeMatch;
         isSpecialMatch = checkOpbouw(parsedOpbouw.bijzonderheden, isSpecialMatch);
       } catch (e) {
          // If it is a comma-separated string like "locatie: 25%, prijs: 0%, woning type: 0%, bijzonderheden: 25%"
          const lowerStr = opbouw.toLowerCase();
          const extractPct = (keywords: string[]) => {
            for (const kw of keywords) {
               const idx = lowerStr.indexOf(kw);
               if (idx !== -1) {
                  const snippet = lowerStr.substring(idx, idx + 40); // larger lookahead for text in parentheses
                  const match = snippet.match(/:\s*(\d+)%/);
                  if (match) {
                     return parseInt(match[1], 10) > 0;
                  }
               }
            }
            return null;
          };

          const rRegion = extractPct(['locatie', 'regio', 'afstand']);
          if (rRegion !== null) isRegionMatch = rRegion;

          const rBudget = extractPct(['prijs', 'budget']);
          if (rBudget !== null) isBudgetMatch = rBudget;

          const rType = extractPct(['woning type', 'woningtype', 'type']);
          if (rType !== null) {
            isTypeMatch = rType;
            isSoortMatch = rType;
          }

          const rSpecial = extractPct(['bijzonderheden', 'kenmerken', 'eisen']);
          if (rSpecial !== null) isSpecialMatch = rSpecial;
       }
    }

    const noBijzonderheden = (item["bijzondere kenmerken klnt prof"] || '').toLowerCase().trim();
    if (noBijzonderheden === 'geen' || noBijzonderheden === 'n.v.t.' || noBijzonderheden === 'nvt') {
       isSpecialMatch = true;
    }

    // STRICT SANITY CHECK: Ensure the number of green checks mathematically matches the percentage.
    // e.g., 75% means exactly 3 greens. 50% means exactly 2 greens.
    // We only run this fallback if N8N did NOT provide the opbouw string.
    if (!opbouw) {
       const expectedGreens = Math.round((percentage / 100) * 5);
       const checks = [
         // We order them by "most likely to be the subjective mismatch" first, so if we HAVE to guess, we guess smart.
         { name: 'special', get: () => isSpecialMatch, set: (v: boolean) => isSpecialMatch = v },
         { name: 'soort', get: () => isSoortMatch, set: (v: boolean) => isSoortMatch = v },
         { name: 'type', get: () => isTypeMatch, set: (v: boolean) => isTypeMatch = v },
         { name: 'region', get: () => isRegionMatch, set: (v: boolean) => isRegionMatch = v },
         { name: 'budget', get: () => isBudgetMatch, set: (v: boolean) => isBudgetMatch = v }
       ];


       let currentGreens = checks.filter(c => c.get()).length;

       // If we have TOO MANY greens for the percentage (e.g. 4 greens on 75%), force the most subjective ones to red.
       while (currentGreens > expectedGreens) {
         const activeCheck = checks.find(c => c.get());
         if (activeCheck) {
            // Only set to false if it's not the forced 'geen' bijzonderheden
            if (activeCheck.name === 'special' && (noBijzonderheden === 'geen' || noBijzonderheden === 'n.v.t.' || noBijzonderheden === 'nvt')) {
               // Skip forcing this to red. Find the next one.
               const nextCheck = checks.find(c => c.get() && c.name !== 'special');
               if (nextCheck) {
                  nextCheck.set(false);
                  currentGreens--;
               } else break;
            } else {
               activeCheck.set(false);
               currentGreens--;
            }
         } else {
            break;
         }
       }

       // If we have TOO FEW greens (e.g. 2 greens on 75%), force some to green.
       while (currentGreens < expectedGreens) {
         const inactiveCheck = [...checks].reverse().find(c => !c.get());
         if (inactiveCheck) {
            inactiveCheck.set(true);
            currentGreens++;
         } else {
            break;
         }
       }
    }

    return {
      id: `n8n-${Date.now()}-${index}`,
      clientName: item["naam klant"] || "Onbekende Klant",
      address: item["adres"] || "Onbekend Adres",
      matchPercentage: percentage,
      reason: item["analyse"] || "Geen analyse beschikbaar.",
      link: item["link woning"] || "#",
      makelaar: "Zie link",
      shortSummary: `Vraagprijs: ${item["prijs"] || 'Onbekend'}`,
      features: [],
      matchCriteria: [
        { label: "📍 Regio", client: item["zk geb. klant"] || "Volgens profiel", house: `${item["afstand zoekgebied"] || 'ja'}`, match: isRegionMatch },
        { label: "💰 Budget", client: item["budget range"] || "Volgens profiel", house: `${item["prijs"] || 'n.v.t.'} · ${item["prijs binnen budget"] || ''}`, match: isBudgetMatch },
        { label: "🏠 Woningtype", client: item["woning type klnt prof"] || "n.v.t.", house: item["woning type adres"] || item["woning type"] || "n.v.t.", match: isTypeMatch },
        { label: "🏘️ Woningsoort", client: item["woning soort klnt prof"] || "n.v.t.", house: item["woning soort adres"] || "n.v.t.", match: isSoortMatch },
        { label: "✨ Bijzonderheden", client: item["bijzondere kenmerken klnt prof"] || "Volgens profiel", house: item["bijzondere kenmerken"] || "n.v.t.", match: isSpecialMatch }
      ],

      datum: datum
    };
  });
}

const parseN8nScans = async (houses: any[]) => {
  const processed = [];
  console.log(`📦 Verwerken van ${houses.length} ruwe scans...`);
  for (const house of houses) {
    // Normaliseer keys (sommige webhooks gebruiken 'address', 'Adres', etc.)
    Object.keys(house).forEach(k => {
      const lowerK = k.toLowerCase();
      // Adres
      if ((lowerK === 'address' || lowerK === 'adres') && !house.adres) house.adres = house[k];
      // Plaats
      if (lowerK === 'plaats' && !house.Plaats) house.Plaats = house[k];
      // Wijk
      if (lowerK === 'wijk' && !house.Wijk) house.Wijk = house[k];
      // Status
      if (lowerK === 'status' || lowerK === 'satus') house.status = house[k];
      // Datum
      if (lowerK === 'datum') house.Datum = house[k];
      // Link
      if (lowerK === 'link') house.link = house[k];
      // m2
      if (lowerK === 'm2' || lowerK === 'oppervlakte') house.m2 = house[k];
      if (lowerK === 'm2 perseel' || lowerK === 'm2 perceel' || lowerK === 'perceel') house["m2 perseel"] = house[k];
      // Makelaar / Prijs are handled below but we can do them here too
      if (lowerK.includes('prijs')) house.Prijs = house[k];
      if (lowerK.includes('makelaar') || lowerK.includes('verkoper')) house.Makelaar = house[k];
    });

    if (!house.adres || !house.Plaats) {
      console.warn('⚠️ Scan overgeslagen: mist adres of plaats', house);
      continue;
    }
    
    // Optioneel: wijk opzoeken als deze ontbreekt
    if (!house.Wijk || house.Wijk === 'Onbekend') {
      house.Wijk = await getOfficialWijk(house.adres, house.Plaats);
    }
    
    house.status = house.status || house.satus || 'Beschikbaar';
    house.m2 = (house.m2 || '--').toString().replace(/&#178;/g, '²');
    house["m2 perseel"] = (house["m2 perseel"] || '--').toString().replace(/&#178;/g, '²');

    if (typeof house.Prijs === 'number') {
      house.Prijs = '€ ' + house.Prijs.toLocaleString('nl-NL');
    } else if (typeof house.Prijs === 'string' && !house.Prijs.includes('€') && !isNaN(Number(house.Prijs))) {
      house.Prijs = '€ ' + Number(house.Prijs).toLocaleString('nl-NL');
    } else if (typeof house.Prijs === 'string' && !house.Prijs.includes('€')) {
      house.Prijs = '€ ' + house.Prijs;
    }
    
    house.Prijs = house.Prijs || 'Prijs op aanvraag';
    house.Makelaar = house.Makelaar || 'Onbekende Makelaar';
    if (house.Makelaar === 'Zie link') house.Makelaar = 'Onbekende Makelaar';
    if (!house.Datum) house.Datum = new Date().toLocaleDateString('nl-NL');
    processed.push(house);
  }
  return processed;
};

// --- Einde N8N Helpers ---

const MatchIcon = ({ size = 24, strokeWidth = 1.5, className = "" }: any) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    width={size}
    height={size}
  >
    {/* Left overlapping circle */}
    <circle cx="8" cy="12" r="6" />
    {/* Right overlapping circle */}
    <circle cx="16" cy="12" r="6" />
    {/* Middle spark/star */}
    <path d="M12 9s0 3 3 3-3 3-3 3 0-3-3-3 3-3 3-3z" fill="currentColor" />
  </svg>
);

const HouseScanCard: React.FC<{ scan: HouseScan, matches: any[] }> = ({ scan, matches }) => {
  const relevantMatches = matches.filter(m => 
    m.address && m.address.includes(scan.adres) && m.matchPercentage >= 50
  );

  const mapQuery = `${scan.adres}, ${scan.Plaats}`;
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card shadow-2xl border-none overflow-hidden hover:shadow-[#141e2b]/10 transition-all duration-500"
    >
      <div className="flex flex-col lg:flex-row min-h-[360px]">
        {/* Left Side: Info */}
        <div className="flex-1 p-8 flex flex-col gap-6 min-w-0">
          {/* Header with Address and Price */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-2xl font-bold text-[#2d3e50]">{scan.adres}</h3>
                <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-black shadow-sm ${
                    (scan.status || scan.satus) === 'Nieuw in verkoop' ? 'bg-red-500 text-white' :
                    (scan.status || scan.satus) === 'Onder bod' ? 'bg-amber-500 text-white' :
                    'bg-blue-600 text-white'
                  }`}>
                  {(scan.status || scan.satus || '--') === '--' ? 'Beschikbaar' : (scan.status || scan.satus)}
                </span>
              </div>
              <p className="text-slate-500 font-medium text-lg">
                {scan.Plaats}{scan.Wijk ? ` • ${scan.Wijk}` : ''}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-3xl font-black text-blue-600">{scan.Prijs}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Scan: {scan.Datum}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-y border-slate-100">
            <div className="flex items-center gap-4 text-slate-600">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-sm border border-slate-100">🏢</div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold leading-none mb-1.5">Makelaar</p>
                <p className="text-sm font-bold text-[#2d3e50]">{scan.Makelaar || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-sm border border-slate-100">📏</div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold leading-none mb-1.5">Oppervlakte</p>
                <p className="text-sm font-bold text-[#2d3e50]">
                  {scan.m2 && scan.m2 !== '--' ? scan.m2 : 'N/A'}
                  {scan.m2 && scan.m2 !== '--' && scan.m2.replace ? (
                    parseInt(scan.m2.replace(/[^0-9]/g, '')) > 350 && (
                      <span className="text-amber-600 ml-1 text-[10px] font-medium">(waarschijnlijk perceel)</span>
                    )
                  ) : null}
                  {scan["m2 perseel"] && scan["m2 perseel"] !== '--' ? ` (Perceel: ${scan["m2 perseel"]})` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Match Notes */}
          {relevantMatches.length > 0 && (
            <div className="flex flex-col gap-2">
              {relevantMatches.map(match => (
                <div key={match.id} className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-4">
                  <div className="mt-1 text-emerald-500">
                    <MatchIcon size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">
                      Top Match met {match.clientName} ({match.matchPercentage}%)
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5 line-clamp-1">{match.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Link Section */}
          <div className="mt-auto pt-4 flex flex-col sm:flex-row gap-3 min-w-0">
            <button 
              onClick={() => window.open(scan.link, '_blank')}
              className="flex-1 py-4 bg-[#141e2b] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg group"
            >
              <span>Woning bekijken</span>
              <ExternalLink size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
            <div className="hidden sm:flex items-center px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl min-w-0 flex-1 text-center overflow-hidden">
               <p className="text-xs text-slate-400 font-medium truncate">{scan.link}</p>
            </div>
          </div>
        </div>

        {/* Right Side: Map */}
        <div className="w-full lg:w-[450px] h-[400px] relative bg-slate-50 border-l border-slate-100 group">
          <div className="absolute inset-0 grayscale-[0.2] contrast-[1.1] transition-all duration-700 group-hover:grayscale-0">
            <iframe 
              width="100%" 
              height="100%" 
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              title={`Map for ${scan.adres}`}
              src={mapUrl}
            />
          </div>
          {/* Subtle overlay to make it fit with the design */}
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5" />
        </div>
      </div>
    </motion.div>
  );
};

const MatchCard: React.FC<{ match: Match, klanten?: any[], scans?: any[] }> = ({ match, klanten = [], scans = [] }) => {
  let klant = klanten.find((k: any) => k.Naam && match.clientName && (k.Naam.includes(match.clientName) || match.clientName.includes(k.Naam.split(' ')[0])));
  if (!klant && klanten.length > 0) klant = klanten[0]; // Fallback voor huidige testdata (bijv. "Renaldo1")

  const matchHouse = scans.find((h: any) => match.address.startsWith(h.adres) || match.address.includes(h.adres) || (h.Plaats && match.address.includes(h.Plaats)));

  const [messageModal, setMessageModal] = useState<{ title: string; message: string; type: 'makelaar' | 'klant' } | null>(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const openMakelaarMessage = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const realMakelaar = matchHouse?.Makelaar || matchHouse?.makelaar || match.makelaar;
    const cleanMakelaar = realMakelaar === 'Zie link' ? 'Makelaar' : realMakelaar;
    
    const message = `Beste ${cleanMakelaar},\n\nIk zou graag een bezichtiging willen inplannen voor de ${match.address} op ${dateStr}. Laat me weten of dat mogelijk is.\n\nVriendelijke groet,\nRenaldo`;
    setMessageModal({ title: `Bericht voor ${cleanMakelaar}`, message, type: 'makelaar' });
    setEditedMessage(message);
    setCopied(false);
  };

  const openKlantMessage = () => {
    const houseLink = match.link || matchHouse?.link;
    const linkPart = houseLink ? `\n\nBekijk de woning hier: ${houseLink}` : '';
    const message = `Beste ${match.clientName},\n\nIk heb een interessante woning voor u gevonden: ${match.address}.${linkPart}\n\nDeze woning past goed bij uw zoekprofiel. Graag zou ik een bezichtiging voor u willen inplannen. Laat mij weten wanneer het u uitkomt.\n\nMet vriendelijke groet,\nRenaldo`;
    setMessageModal({ title: `Bericht voor ${match.clientName}`, message, type: 'klant' });
    setEditedMessage(message);
    setCopied(false);
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(editedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      {/* Message Modal */}
      <AnimatePresence>
        {messageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMessageModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${messageModal.type === 'makelaar'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-orange-100 text-[#e67e22]'
                    }`}>
                    {messageModal.type === 'makelaar' ? <MessageSquare size={20} /> : <UserCheck size={20} />}
                  </div>
                  <h3 className="text-lg font-bold text-[#2d3e50]">{messageModal.title}</h3>
                </div>
                <button
                  onClick={() => setMessageModal(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <textarea
                  value={editedMessage}
                  onChange={(e) => { setEditedMessage(e.target.value); setCopied(false); }}
                  className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-200 text-[#2d3e50] leading-relaxed text-[15px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  rows={8}
                />
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setMessageModal(null)}
                  className="px-5 py-2.5 border-2 border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-white transition-colors"
                >
                  Sluiten
                </button>
                <button
                  onClick={copyMessage}
                  className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#141e2b] text-white hover:bg-slate-800'
                    }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Gekopieerd!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      <span>Kopieer bericht</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-card overflow-hidden border border-slate-300 p-6 hover:shadow-xl transition-all group"
      >
        <div className="flex flex-col gap-6">
          {/* Header: Client & Score */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-2xl font-bold text-[#2d3e50]">{match.clientName}</h3>
                <div className={`px-4 py-1 rounded-full text-sm font-black border ${getScoreColor(match.matchPercentage)}`}>
                  {match.matchPercentage}% Match
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <MapPin size={16} />
                <span>{match.address}</span>
              </div>
            </div>

            <div className="w-full md:w-48">
              <div className="flex justify-between text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
                <span>Match Score</span>
                <span>{match.matchPercentage}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${match.matchPercentage}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className={`h-full ${getProgressColor(match.matchPercentage)}`}
                />
              </div>
            </div>
          </div>

          {/* Match Criteria Comparison */}
          {match.matchCriteria && match.matchCriteria.length > 0 && (
            <div className="bg-white/50 rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-5 pt-4 pb-2">
                <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Match Vergelijking</h4>
              </div>
              <div className="divide-y divide-slate-100">
                {/* Header */}
                <div className="grid grid-cols-[1fr_1fr_1fr] px-5 py-2 bg-slate-50">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Criterium</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Klant wil</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Woning biedt</span>
                </div>
                {match.matchCriteria.map((c, i) => {
                  // Slim: overschrijf de match-boolean op basis van tekst-inhoud
                  let effectiveMatch = c.match;

                  // "dichtbij zoekgebied" in de woning-tekst = GEEN exacte match → rood
                  const houseLower = (c.house || '').toLowerCase();
                  if (houseLower.includes('dichtbij zoekgebied') || houseLower.includes('dicht bij zoekgebied') || houseLower.includes('nabij zoekgebied') || houseLower.includes('buiten zoekgebied')) {
                    effectiveMatch = false;
                  }

                  // Slaapkamers: klant wil minimaal X, woning heeft maar Y → rood
                  const clientLower = (c.client || '').toLowerCase();
                  const minBedMatch = clientLower.match(/minimaal\s+(\d+)\s*slaapkamer/);
                  if (minBedMatch) {
                    const wanted = parseInt(minBedMatch[1]);
                    const houseNumMatch = houseLower.match(/(\d+)\s*slaapkamer/);
                    if (houseNumMatch) {
                      const has = parseInt(houseNumMatch[1]);
                      if (has < wanted) effectiveMatch = false;
                    }
                  }

                  return (
                    <div key={i} className={`grid grid-cols-[1fr_1fr_1fr] items-center px-5 py-3 transition-colors ${effectiveMatch ? 'hover:bg-slate-50/50' : 'bg-red-50/50'}`}>
                      <span className={`text-sm font-semibold ${effectiveMatch ? 'text-slate-600' : 'text-red-700'}`}>{c.label}</span>
                      <span className={`text-sm font-medium ${effectiveMatch ? 'text-slate-700' : 'text-red-800'}`}>{c.client}</span>
                      <div className="flex items-center gap-2">
                        {effectiveMatch ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
                            <CheckCircle2 size={12} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
                             <XCircle size={12} />
                          </div>
                        )}
                        <span className={`text-sm font-bold ${effectiveMatch ? 'text-emerald-700' : 'text-red-700'}`}>{c.house}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right Side / Map (Minimal) */}
          <div className="pt-4 mt-2">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-3">Woning Locatie</h4>
            <div className="w-full h-[200px] sm:h-[250px] relative bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden group">
              <div className="absolute inset-0 grayscale-[0.2] contrast-[1.1] transition-all duration-700 group-hover:grayscale-0">
                <iframe 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  title={`Map for ${match.address}`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(match.address)}&output=embed`}
                />
              </div>
              <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5" />
            </div>
          </div>
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => window.open(match.link, '_blank')}
              className="w-full py-4 bg-[#141e2b] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg group"
            >
              <span>Woning bekijken</span>
              <ExternalLink size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={openMakelaarMessage}
              className="w-full py-4 border-2 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-md group bg-white border-[#141e2b] text-[#141e2b] hover:bg-slate-50"
            >
              <span className="text-sm">Bericht makelaar</span>
              <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={openKlantMessage}
              className="w-full py-4 border-2 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-md group bg-white border-[#e67e22] text-[#e67e22] hover:bg-orange-50"
            >
              <span className="text-sm">Bericht klant</span>
              <UserCheck size={18} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

const KlantenView = ({ 
  klanten, 
  onAddKlant, 
  refreshing, 
  onRefresh,
  onDeleteKlant,
  onEditKlant,
  deletingRow 
}: { 
  klanten: any[], 
  onAddKlant: () => void, 
  refreshing: boolean, 
  onRefresh: () => void,
  onDeleteKlant: (row: number, name: string) => void,
  onEditKlant: (klant: any) => void,
  deletingRow: number | null
}) => {
  return (
    <motion.div
      key="klanten-overzicht"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 text-[#2d3e50]">
            <Users className="text-[#e67e22]" size={30} />
            Klanten Profielen
          </h2>
          <p className="text-slate-500 text-sm mt-1">Beheer actieve zoekprofielen via de Google Sheet verbinding.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            Data Verversen
          </button>
          <button
            onClick={onAddKlant}
            className="flex items-center gap-2 bg-[#000000] hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
          >
            <UserPlus size={20} />
            Nieuw Profiel Toevoegen
          </button>
        </div>
      </div>

      {klanten.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
          <Users size={64} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">Geen klanten gevonden</h3>
          <p>Druk op de knop 'Data verversen' om de Google Sheet synchronisatie op te halen of voeg direct een nieuw profiel toe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {klanten.map((klant, idx) => {
            const rowNo = klant.row_number || klant.rowNumber;
            const isDeleting = deletingRow === rowNo;

            return (
              <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative group">
                {/* Delete Button */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => onEditKlant(klant)}
                      className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                      title="Profiel bewerken"
                    >
                      <Pencil size={18} />
                    </button>
                    {rowNo && (
                      <button
                        onClick={() => onDeleteKlant(rowNo, klant.Naam)}
                        disabled={isDeleting}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                        title="Profiel verwijderen"
                      >
                        {isDeleting ? <RefreshCw size={18} className="animate-spin text-red-500" /> : <Trash2 size={18} />}
                      </button>
                    )}
                  </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e67e22] to-orange-400 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {klant.Naam ? klant.Naam.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#2d3e50]">{klant.Naam || 'Naamloos Profiel'}</h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold ring-1 ring-inset ring-emerald-600/20">
                      Actief Profiel
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <dt className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Budget</dt>
                    <dd className="font-semibold text-slate-700">{klant.Prijsklasse || 'Niet ingevuld'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Regio</dt>
                    <dd className="text-sm font-medium text-slate-600 leading-relaxed">
                      {klant.Regio || 'Niet ingevuld'}
                      {klant['Bijzonderheden Regio'] && <span className="block text-slate-400 italic text-xs mt-0.5">{klant['Bijzonderheden Regio']}</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Woningtype & Wensen</dt>
                    <dd className="text-sm font-medium text-slate-600 leading-relaxed">
                      {klant.Woningtype || 'Geen woningtype'} • {klant['Bijzondere Kenmerken'] || 'Geen bijzondere kenmerken'}
                    </dd>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};


// ── Helper componenten voor specifieke wensen ──────────────────────────────
function CheckboxGroup({ title, items, selected, onChange }: {
  title: string; items: string[]; selected: string[];
  onChange: (vals: string[]) => void;
}) {
  const col1 = items.filter((_, i) => i % 3 === 0);
  const col2 = items.filter((_, i) => i % 3 === 1);
  const col3 = items.filter((_, i) => i % 3 === 2);
  return (
    <div className="border-t border-slate-100 pt-3">
      <p className="text-xs font-semibold text-slate-700 mb-2">{title}</p>
      <div className="grid grid-cols-3 gap-x-6">
        {[col1, col2, col3].map((col, ci) => (
          <div key={ci}>
            {col.map(item => (
              <label key={item} className="flex items-center gap-1.5 text-xs mb-1.5 cursor-pointer hover:text-blue-600">
                <input
                  type="checkbox"
                  checked={selected.includes(item)}
                  onChange={e => onChange(e.target.checked ? [...selected, item] : selected.filter(v => v !== item))}
                  className="accent-blue-500 w-3.5 h-3.5"
                />
                {item}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function OnderhoudGroup({ title, fieldName, value, onChange }: {
  title: string; fieldName: string; value: string; onChange: (v: string) => void;
}) {
  const opts = ['Slecht','Slecht tot matig','Matig','Matig tot redelijk','Redelijk','Redelijk tot goed','Goed','Goed tot uitstekend','Uitstekend'];
  return (
    <div className="border-t border-slate-100 pt-3">
      <p className="text-xs font-semibold text-slate-700 mb-2">{title}</p>
      <div className="grid grid-cols-3 gap-x-6">
        {[opts.slice(0,3), opts.slice(3,6), opts.slice(6)].map((col, ci) => (
          <div key={ci}>
            {col.map(opt => (
              <label key={opt} className="flex items-center gap-1.5 text-xs mb-1.5 cursor-pointer hover:text-blue-600">
                <input type="radio" name={fieldName} value={opt} checked={value === opt}
                  onChange={() => onChange(opt)} className="accent-blue-500 w-3.5 h-3.5" />
                {opt}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
// ── Map Selector Component ────────────────────────────────────────────────
const MapSelector = ({ selectedLocations, selectedCoords, onSelect }: { 
  selectedLocations: string[], 
  selectedCoords: Record<string, [number, number]>,
  onSelect: (loc: string, coords: [number, number]) => void 
}) => {
  const mapRef = React.useRef<any>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const markersGroupRef = React.useRef<any>(null);
  const lastHoverTime = React.useRef<number>(0);
  const hoverTooltipRef = React.useRef<any>(null);

  // Initialization
  React.useEffect(() => {
    if (!containerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    mapRef.current = L.map(containerRef.current, {
      center: [51.2, 5.9],
      zoom: 9,
      scrollWheelZoom: true,
      zoomControl: false // Custom placement later
    });

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap ©CartoDB'
    }).addTo(mapRef.current);

    markersGroupRef.current = L.layerGroup().addTo(mapRef.current);
    
    // Create a hidden tooltip that we move around
    hoverTooltipRef.current = L.tooltip({
      sticky: true,
      direction: 'top',
      offset: [0, -10],
      opacity: 0.9,
      className: 'map-hover-tooltip'
    });

    // Hover handler with throttling (600ms)
    const handleMouseMove = async (e: any) => {
       const now = Date.now();
       if (now - lastHoverTime.current < 600) return;
       lastHoverTime.current = now;

       const { lat, lng } = e.latlng;
       try {
         const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1`);
         const data = await res.json();
         const name = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.neighbourhood || (data.display_name && data.display_name.split(',')[0]);
         
         if (name && mapRef.current) {
            hoverTooltipRef.current
              .setLatLng(e.latlng)
              .setContent(`<div class="px-2 py-1 flex items-center gap-2"><span class="text-blue-500">📍</span> <span class="font-bold">${name}</span></div>`)
              .addTo(mapRef.current);
         }
       } catch (err) {}
    };

    mapRef.current.on('mousemove', handleMouseMove);

    // Click handler
    mapRef.current.on('click', async (e: any) => {
      const { lat, lng } = e.latlng;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1`);
        const data = await res.json();
        const name = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.neighbourhood || (data.display_name && data.display_name.split(',')[0]);
        
        if (name) {
          onSelect(name, [lat, lng]);
        }
      } catch (err) {}
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.off('mousemove', handleMouseMove);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers
  React.useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;
    const L = (window as any).L;
    markersGroupRef.current.clearLayers();

    selectedLocations.forEach(name => {
      const coords = selectedCoords[name];
      if (coords) {
        const marker = L.marker(coords, {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })
        }).addTo(markersGroupRef.current);
        marker.bindTooltip(name, { permanent: false, direction: 'top' });
      } else {
        // Optionale Geocoding für Namen die per Text eingegeben wurden
        // Hier für Performance weggelassen, oder man macht es einmalig
      }
    });
  }, [selectedLocations, selectedCoords]);

  return (
    <>
      <style>{`
        .map-hover-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
          color: #1e293b !important;
          font-size: 12px !important;
          padding: 0 !important;
        }
        .map-hover-tooltip::before { border-top-color: #e2e8f0 !important; }
        .leaflet-container { cursor: crosshair !important; }
      `}</style>
      <div ref={containerRef} className="w-full h-full min-h-[360px] rounded border border-slate-300" />
    </>
  );
};
// ───────────────────────────────────────────────────────────────────────────



const MOCK_EUROPEAN_INTERIOR_IMAGES = [
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1495474472207-464a4f15d862?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1499916078039-922301b0eb9b?auto=format&fit=crop&q=80&w=800'
];

const getRandomImage = () => MOCK_EUROPEAN_INTERIOR_IMAGES[Math.floor(Math.random() * MOCK_EUROPEAN_INTERIOR_IMAGES.length)];

const BlogPostMakerView = () => {
  const [topic, setTopic] = useState('');
  const [step, setStep] = useState<'input' | 'titles' | 'content'>('input');
  const [isGenerating, setIsGenerating] = useState(false);
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState('');

  const generateTitles = () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    // Simulate AI title generation
    setTimeout(() => {
      setTitles([
        `10 Essentiële Tips voor: ${topic}`,
        `Alles wat je moet weten over ${topic} in 2026`,
        `De Ultieme Gids voor ${topic}`
      ]);
      setStep('titles');
      setIsGenerating(false);
    }, 1500);
  };

  const generateContent = () => {
    if (!selectedTitle) return;
    setIsGenerating(true);
    // Simulate AI content & image generation
    setTimeout(() => {
      setPostContent(`Welkom bij onze nieuwste update over "${selectedTitle}".\n\nAls makelaar merken we dagelijks hoe belangrijk het is om onze klanten goed en tijdig te informeren over de nieuwste ontwikkelingen op de woningmarkt. Of je nu een starter bent die zijn eerste droomhuis zoekt, of je bent op zoek naar een ruime eengezinswoning in een rustige wijk, de markt is constant in beweging.\n\nWaarom is dit op dit moment zo relevant?\nDe afgelopen maanden zien we een duidelijke verschuiving in de wensen van kopers. Met deze blogpost willen we je graag meenemen in de belangrijkste trends en je voorzien van handige, direct toepasbare tips rondom "${topic}".\n\nBelangrijkste punten om rekening mee te houden:\n1. Wees altijd goed voorbereid op de bezichtiging. Een eerste indruk telt niet alleen voor de koper, maar ook voor de verkoper. Neem de tijd om alles rustig op je in te laten werken.\n2. Zorg dat je financiële plaatje vooraf glashelder is. Dit geeft je een enorme voorsprong bij het uitbrengen van een bod in de huidige competitieve markt.\n3. Schakel tijdig een ervaren aankoopmakelaar in. Wij kennen de lokale markt als geen ander en begeleiden je stap voor stap.\n\nWe hopen dat deze inzichten je helpen bij je zoektocht. Heb je nog vragen of wil je eens vrijblijvend praten over jouw persoonlijke woonwensen? Neem dan gerust contact met ons op. Ons team staat altijd voor je klaar met een verse kop koffie en een goed advies!\n\n(Let op: Deze tekst is gegenereerd door onze tijdelijke gratis AI-module. Binnenkort koppelen we Gemini en Nano Banana voor nog betere, gepersonaliseerde teksten!)`);
      setPostImage(getRandomImage());
      setStep('content');
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <motion.div
      key="blog-post-maker"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mt-8"
    >
      <div className="bg-white rounded-3xl shadow-xl p-8 lg:p-12 border border-slate-100 min-h-[600px] flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#e8f4fb] to-[#cfe2f3] rounded-2xl flex items-center justify-center text-[#5b9bd5] shadow-sm border border-[#cfe2f3]">
            <PenTool size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-[#141e2b]">Blog Post Maker</h2>
            <p className="text-slate-500 font-medium">Genereer razendsnel content met AI</p>
          </div>
        </div>

        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <div className="text-amber-600 mt-0.5">⚠️</div>
          <div>
            <p className="text-amber-800 font-bold text-sm">Let op: Demo Versie</p>
            <p className="text-amber-700 text-sm mt-1">
              Er is nog geen echte AI gekoppeld en gemaakte blog posts worden momenteel <strong>niet opgeslagen</strong>. 
              Dit is een preview versie. Binnenkort koppelen we Gemini en Nano Banana voor het genereren en opslaan van échte content.
            </p>
          </div>
        </div>

        {step === 'input' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col justify-center max-w-2xl w-full mx-auto">
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
              <label className="block text-sm font-bold text-slate-700 mb-3">Waar wil je over schrijven?</label>
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Bijv. Een huis kopen in 2026, tips voor bezichtigingen..."
                className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5b9bd5] text-lg mb-6 shadow-sm"
                onKeyDown={(e) => e.key === 'Enter' && generateTitles()}
              />
              <button 
                onClick={generateTitles}
                disabled={!topic.trim() || isGenerating}
                className="w-full py-4 bg-[#5b9bd5] hover:bg-[#4a8ac4] disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {isGenerating ? 'AI is aan het nadenken...' : 'Genereer Titels'}
              </button>
            </div>
            <p className="text-center mt-6 text-sm text-slate-400">Gebruikt momenteel een gratis simulatie-AI. Binnenkort gekoppeld aan Gemini & Nano Banana.</p>
          </motion.div>
        )}

        {step === 'titles' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 max-w-3xl w-full mx-auto">
            <h3 className="text-xl font-bold text-[#141e2b] mb-6 flex items-center gap-2">
              <Check className="text-emerald-500" /> Kies een pakkende titel:
            </h3>
            <div className="space-y-4 mb-8">
              {titles.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTitle(t)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all ${selectedTitle === t ? 'border-[#5b9bd5] bg-[#e8f4fb] shadow-md' : 'border-slate-100 hover:border-[#cfe2f3] hover:bg-slate-50'}`}
                >
                  <p className={`text-lg font-semibold ${selectedTitle === t ? 'text-[#1a5c8a]' : 'text-slate-700'}`}>{t}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setStep('input')}
                className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
              >
                Terug
              </button>
              <button 
                onClick={generateContent}
                disabled={!selectedTitle || isGenerating}
                className="flex-1 py-4 bg-[#5b9bd5] hover:bg-[#4a8ac4] disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <FileText />}
                {isGenerating ? 'Content genereren...' : 'Genereer Tekst & Afbeelding'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'content' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-[#141e2b]">{selectedTitle}</h3>
              <button onClick={() => { setStep('input'); setTopic(''); setSelectedTitle(null); }} className="text-[#5b9bd5] hover:text-[#4a8ac4] text-sm font-bold flex items-center gap-1">
                <RefreshCw size={14} /> Nieuwe Post
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
                  <ImageIcon size={14} /> Gegenereerde Afbeelding
                </div>
                <img src={postImage} alt={selectedTitle || 'Blog afbeelding'} className="w-full h-64 object-cover rounded-xl shadow-sm mb-4" />
                <button onClick={() => setPostImage(getRandomImage())} className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                  <ImageIcon size={18} /> Andere Afbeelding Genereren
                </button>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
                  <FileText size={14} /> Gegenereerde Tekst
                </div>
                <textarea 
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5b9bd5] bg-white leading-relaxed text-slate-700 resize-none mb-4"
                />
                <button onClick={() => navigator.clipboard.writeText(postContent)} className="w-full py-3 bg-[#5b9bd5] hover:bg-[#4a8ac4] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
                  <Copy size={18} /> Kopieer Content
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default function App() {
  const [activeView, setActiveView] = useState<View>(() => {
    const saved = localStorage.getItem('woonwensActiveView');
    return (saved as View) || 'nieuwste';
  });
  const [houseScans, setHouseScans] = useState<HouseScan[]>([]);
  const [previousHouseScans, setPreviousHouseScans] = useState<HouseScan[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [klantenLijst, setKlantenLijst] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const groupedScans = useMemo(() => {
    const grouped = houseScans.reduce((acc, scan) => {
      const region = getRegion(scan.Plaats || '');
      if (!acc[region]) acc[region] = [];
      acc[region].push(scan);
      return acc;
    }, {} as Record<string, HouseScan[]>);
    return grouped;
  }, [houseScans]);

  const groupedPreviousScans = useMemo(() => {
    const grouped = previousHouseScans.reduce((acc, scan) => {
      const region = getRegion(scan.Plaats || '');
      if (!acc[region]) acc[region] = [];
      acc[region].push(scan);
      return acc;
    }, {} as Record<string, HouseScan[]>);
    return grouped;
  }, [previousHouseScans]);

  const regionOrder = ['Maastricht', 'heuvelland', 'parkstad', 'westelijke mijnstreek', 'Echt Roermond', 'overige'];
  
  useEffect(() => {
    localStorage.setItem('woonwensActiveView', activeView);
  }, [activeView]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Scans ophalen
        const scansRes = await fetch(N8N_SCANS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger: 'fetch_latest', source: 'WoonWensManager' })
        });
        const scansRaw = await scansRes.json();
        const scansProcessed = await parseN8nScans(Array.isArray(scansRaw) ? scansRaw : (scansRaw.data || []));
        setHouseScans(scansProcessed);

        // 1b. Vorige scans ophalen
        try {
          const prevScansRes = await fetch(N8N_PREVIOUS_SCANS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trigger: 'fetch_latest', source: 'WoonWensManager' })
          });
          const prevScansRaw = await prevScansRes.json();
          const prevScansProcessed = await parseN8nScans(Array.isArray(prevScansRaw) ? prevScansRaw : (prevScansRaw.data || []));
          setPreviousHouseScans(prevScansProcessed);
        } catch (e) {
          console.error('Error fetching previous scans:', e);
        }

        // 2. Matches ophalen
        const matchesRes = await fetch(N8N_MATCHES_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger: 'fetch_latest', source: 'WoonWensManager' })
        });
        const matchesRaw = await matchesRes.json();
        const datum = new Date().toISOString();
        const matchesProcessed = parseStructuredN8nMatches(Array.isArray(matchesRaw) ? matchesRaw : [], datum);
        setMatches(matchesProcessed);

        // 3. Klanten ophalen
        const klantenRes = await fetch(N8N_KLANTEN_URL).catch(() => null);
        if (klantenRes) {
          const klantenData = await klantenRes.json();
          setKlantenLijst(Array.isArray(klantenData) ? klantenData : (klantenData.klanten || []));
        }
      } catch (error) {
        console.error('Error fetching data from n8n:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();

  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const refreshMatches = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(N8N_MATCHES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'fetch_latest', source: 'WoonWensManager' })
      });
      const data = await res.json();
      const datum = new Date().toISOString();
      const processed = parseStructuredN8nMatches(Array.isArray(data) ? data : [], datum);
      setMatches(processed);
      alert(`Succesvol ${processed.length} matches opgehaald!`);
    } catch (error) {
      console.error('Error refreshing matches:', error);
      alert('Fout bij verversen matches via n8n.');
    } finally {
      setRefreshing(false);
    }
  };

  const [refreshingScans, setRefreshingScans] = useState(false);
  const [showAddKlantModal, setShowAddKlantModal] = useState(false);
  const [addKlantStep, setAddKlantStep] = useState(1);
  const [locatieError, setLocatieError] = useState(false);
  const [showSpecifiekeWensen, setShowSpecifiekeWensen] = useState(false);
  const [refreshingKlanten, setRefreshingKlanten] = useState(false);
  const [deletingKlantRow, setDeletingKlantRow] = useState<number | null>(null);
  const [newKlant, setNewKlant] = useState({
    Naam: '', Regio: '', BijzonderhedenRegio: '',
    GeselecteerdeLocaties: [] as string[], GeselecteerdeCoords: {} as Record<string, [number, number]>, LocatieZoekterm: '', LocatieFilter: 'Alles',
    Soort: 'koop', Prijsklasse: '', PrijsMax: '', Bouwvorm: 'beide',
    Objectsoort: 'woonhuis_appartement', Woonoppervlakte: '', Perceeloppervlakte: '',
    AantalKamers: '', AantalSlaapkamers: '', Bestemming: ['permanente_bewoning'] as string[],
    DubbeleBewoning: [] as string[], Energielabel: '', Buitenruimte: [] as string[],
    TypeWoning: [] as string[], SoortWoning: [] as string[], SoortAppartement: [] as string[],
    Ligging: [] as string[], Bijzonderheden: [] as string[], Toegankelijkheid: [] as string[],
    OnderhoudBinnen: '', OnderhoudBuiten: '',
    Parkeren: [] as string[], Voorzieningen: [] as string[], Eigendom: [] as string[],
    BouwjaarVan: '', BouwjaarTm: '', MinMatchPercentage: '80', Prioriteiten: [] as string[],
    Email: '', Notificatie: 'direct', BijzondereKenmerken: '', Woningtype: '',
  });
  const [submittingKlant, setSubmittingKlant] = useState(false);
  const [editingKlantRow, setEditingKlantRow] = useState<number | null>(null);

  const refreshKlanten = async () => {
    setRefreshingKlanten(true);
    try {
      const res = await fetch(N8N_KLANTEN_URL);
      const data = await res.json();
      setKlantenLijst(Array.isArray(data) ? data : (data.klanten || []));
    } catch (e) {
      alert('Fout bij ophalen klanten profielen van n8n.');
    } finally {
      setRefreshingKlanten(false);
    }
  };

  const handleDeleteKlant = async (rowNumber: number, name: string) => {
    if (!window.confirm(`Weet je zeker dat je het profiel van "${name}" wilt verwijderen?`)) return;
    
    setDeletingKlantRow(rowNumber);
    try {
      const res = await fetch(N8N_DELETE_KLANT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row_number: rowNumber })
      });
      
      if (res.ok) {
        // Optimistic update
        setKlantenLijst(prev => prev.filter(k => (k.row_number || k.rowNumber) !== rowNumber));
        alert(`Profiel van ${name} succesvol verwijderd.`);
      } else {
        alert('Er is iets misgegaan bij het verwijderen in Google Sheets.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Fout bij verbinding met de delete-webhook.');
    } finally {
      setDeletingKlantRow(null);
    }
  };

  const resetAddKlantForm = () => {
    setAddKlantStep(1);
    setLocatieError(false);
    setShowSpecifiekeWensen(false);
    setNewKlant({
      Naam: '', Regio: '', BijzonderhedenRegio: '',
      GeselecteerdeLocaties: [], GeselecteerdeCoords: {}, LocatieZoekterm: '', LocatieFilter: 'Alles',
      Soort: 'koop', Prijsklasse: '', PrijsMax: '', Bouwvorm: 'beide',
      Objectsoort: 'woonhuis_appartement', Woonoppervlakte: '', Perceeloppervlakte: '',
      AantalKamers: '', AantalSlaapkamers: '', Bestemming: ['permanente_bewoning'],
      DubbeleBewoning: [], Energielabel: '', Buitenruimte: [],
      TypeWoning: [], SoortWoning: [], SoortAppartement: [], Ligging: [],
      Bijzonderheden: [], Toegankelijkheid: [], OnderhoudBinnen: '', OnderhoudBuiten: '',
      Parkeren: [], Voorzieningen: [], Eigendom: [],
      BouwjaarVan: '', BouwjaarTm: '', MinMatchPercentage: '80', Prioriteiten: [],
      Email: '', Notificatie: 'direct', BijzondereKenmerken: '', Woningtype: '',
    });
  };

  const handleAddKlant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingKlant(true);
    try {
      const payload = {
        Naam: newKlant.Naam,
        Regio: newKlant.GeselecteerdeLocaties.length > 0 ? newKlant.GeselecteerdeLocaties.join(', ') : newKlant.Regio,
        BijzonderhedenRegio: newKlant.BijzonderhedenRegio,
        Prijsklasse: (newKlant.Prijsklasse || newKlant.PrijsMax)
          ? `€ ${newKlant.Prijsklasse || 0} – € ${newKlant.PrijsMax || newKlant.Prijsklasse}`
          : '',
        Woningtype: [...newKlant.TypeWoning, ...newKlant.SoortWoning, ...newKlant.SoortAppartement].join(', ') || newKlant.Objectsoort,
        BijzondereKenmerken: [
          ...newKlant.Ligging, ...newKlant.Bijzonderheden, ...newKlant.Toegankelijkheid,
          ...newKlant.Buitenruimte, ...newKlant.Parkeren, ...newKlant.Voorzieningen, ...newKlant.Eigendom,
          newKlant.OnderhoudBinnen ? `Onderhoud binnen: ${newKlant.OnderhoudBinnen}` : '',
          newKlant.OnderhoudBuiten ? `Onderhoud buiten: ${newKlant.OnderhoudBuiten}` : '',
          newKlant.BouwjaarVan ? `Bouwjaar v.a. ${newKlant.BouwjaarVan}` : '',
          newKlant.BouwjaarTm ? `t/m ${newKlant.BouwjaarTm}` : '',
          newKlant.AantalKamers ? `Min. ${newKlant.AantalKamers} kamers` : '',
          newKlant.AantalSlaapkamers ? `Min. ${newKlant.AantalSlaapkamers} slaapkamers` : '',
          newKlant.BijzondereKenmerken,
        ].filter(Boolean).join(', '),
        Soort: newKlant.Soort,
        Bouwvorm: newKlant.Bouwvorm,
        Objectsoort: newKlant.Objectsoort,
        Woonoppervlakte: newKlant.Woonoppervlakte,
        Perceeloppervlakte: newKlant.Perceeloppervlakte,
        AantalKamers: newKlant.AantalKamers,
        AantalSlaapkamers: newKlant.AantalSlaapkamers,
        Bestemming: newKlant.Bestemming.join(', '),
        DubbeleBewoning: newKlant.DubbeleBewoning.join(', '),
        Energielabel: newKlant.Energielabel,
        MinMatchPercentage: newKlant.MinMatchPercentage,
        Prioriteiten: newKlant.Prioriteiten.join(', '),
        Email: newKlant.Email,
        Notificatie: newKlant.Notificatie,
      };

      let res;
      if (editingKlantRow) {
        // Gebruik de nieuwe update-webhook die het rijnummer meeneemt
        res = await fetch(N8N_UPDATE_KLANT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, row_number: editingKlantRow })
        });
      } else {
        // Gebruik de bestaande add-webhook voor nieuwe profielen
        res = await fetch(N8N_ADD_KLANT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (res.ok) {
        alert(editingKlantRow ? 'Profiel succesvol bijgewerkt!' : 'Klant succesvol toegestuurd naar N8N!');
        setShowAddKlantModal(false);
        resetAddKlantForm();
        setEditingKlantRow(null);
        refreshKlanten();
      } else {
        alert('Er is iets misgegaan bij het versturen naar N8N.');
      }
    } catch (e) {
      alert('Fout bij verbinding met N8N Webhook.');
    } finally {
      setSubmittingKlant(false);
    }
  };

  const handleEditKlant = (klant: any) => {
    // Parseren van bestaande data
    let prijsVan = '';
    let prijsTot = '';
    if (klant.Prijsklasse) {
      const parts = klant.Prijsklasse.replace(/€/g, '').split(/[–-]/);
      if (parts.length >= 2) {
        prijsVan = parts[0].trim().replace(/\./g, '');
        prijsTot = parts[1].trim().replace(/\./g, '');
      } else {
        prijsVan = parts[0].trim().replace(/\./g, '');
      }
    }

    setNewKlant({
      ...newKlant,
      Naam: klant.Naam || '',
      Regio: klant.Regio || '',
      BijzonderhedenRegio: klant['Bijzonderheden Regio'] || '',
      Prijsklasse: prijsVan,
      PrijsMax: prijsTot,
      Objectsoort: klant.Objectsoort || 'woonhuis_appartement',
      Soort: klant.Soort?.toLowerCase() || 'koop',
      Bouwvorm: klant.Bouwvorm?.toLowerCase() || 'beide',
      Woonoppervlakte: klant.Woonoppervlakte || '',
      Perceeloppervlakte: klant.Perceeloppervlakte || '',
      AantalKamers: klant.AantalKamers || '',
      AantalSlaapkamers: klant.AantalSlaapkamers || '',
      Energielabel: klant.Energielabel || '',
      Email: klant.Email || '',
      Notificatie: klant.Notificatie || 'direct',
      MinMatchPercentage: klant.MinMatchPercentage || '80',
      GeselecteerdeLocaties: klant.Regio ? klant.Regio.split(',').map((s: string) => s.trim()) : [],
      // Hulpvelden die gecombineerd waren
      BijzondereKenmerken: klant['Bijzondere Kenmerken'] || '',
    });

    setEditingKlantRow(klant.row_number || klant.rowNumber);
    setAddKlantStep(1);
    setShowAddKlantModal(true);
  };

  const refreshScans = async () => {
    setRefreshingScans(true);
    try {
      const res = await fetch(N8N_SCANS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'fetch_latest', source: 'WoonWensManager' })
      });
      const data = await res.json();
      const processed = await parseN8nScans(Array.isArray(data) ? data : (data.data || []));
      setHouseScans(processed);
      alert(`Succesvol ${processed.length} scans opgehaald!`);
    } catch (error) {
      console.error('Error refreshing scans:', error);
      alert('Fout bij verversen scans via n8n.');
    } finally {
      setRefreshingScans(false);
    }
  };

  const SidebarIcon = ({ view, icon: Icon, label }: { view: View, icon: any, label: string }) => (
    <button
      onClick={() => setActiveView(view)}
      title={label}
      className={`p-3 rounded-lg transition-all duration-200 relative group ${activeView === view
          ? 'bg-[#34495e] text-[#e74c3c]'
          : 'text-[#4db6ac] hover:bg-slate-800'
        }`}
    >
      <Icon size={32} strokeWidth={1.5} />
      {activeView === view && (
        <div className="absolute left-[-12px] top-0 bottom-0 w-1.5 bg-[#e74c3c] rounded-r-full" />
      )}
      {/* Tooltip on hover */}
      <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {label}
      </div>
    </button>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 flex flex-col items-center py-8 bg-[#141e2b] gap-8 border-r border-slate-800">
        <SidebarIcon view="nieuwste" icon={Home} label="Nieuwste huizen" />
        <SidebarIcon 
          view="vorige" 
          icon={(props: any) => (
            <div className="relative">
              <Home {...props} />
              <div className="absolute -bottom-1 -right-1 bg-[#e74c3c] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#141e2b]">
                2
              </div>
            </div>
          )} 
          label="Huizen van gisteren" 
        />
        <SidebarIcon view="matches" icon={MatchIcon} label="Matches" />
        <SidebarIcon view="manager" icon={ClipboardList} label="Manager" />
        <SidebarIcon view="klanten" icon={UserPlus} label="Klanten Profielen" />
        <SidebarIcon view="blog-post-maker" icon={PenTool} label="Blog Post Maker" />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex flex-col items-center justify-center py-3 bg-white/40 backdrop-blur-md border-b border-slate-100">
          <h1 className="text-base sm:text-lg font-bold flex items-center tracking-tight">
            <span className="text-[#e67e22]">W</span>
            <span className="text-[#2d3e50]">oon</span>
            <span className="text-[#e74c3c]">W</span>
            <span className="text-[#2d3e50]">ens</span>
            <span className="text-[#2d3e50] ml-1.5">Client</span>
            <span className="text-[#d3b8ae] ml-1.5">M</span>
            <span className="text-[#2d3e50]">anagement</span>
          </h1>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto px-12 py-4">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              {activeView === 'manager' ? (
                <motion.div
                  key="manager"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h2 className="text-3xl font-bold text-[#2d3e50] mb-6">
                    Klantoverzicht - <span className="text-[#2d3e50]">Woningaanbod & Bezichtgingen</span>
                  </h2>

                  {klantenLijst.length === 0 ? (
                    <div className="glass-card p-16 text-center text-slate-400">
                      <Users size={48} className="mx-auto mb-4 text-slate-300" />
                      <p className="font-semibold text-lg">Geen klanten gevonden</p>
                      <p className="text-sm mt-1">Ga naar Klanten Profielen en verversen de data om klanten te laden.</p>
                    </div>
                  ) : (
                  <div className="glass-card overflow-x-auto border border-slate-300 custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                      <thead>
                        <tr className="table-header">
                          <th className="px-6 py-4 border-b border-slate-300">Klant</th>
                          <th className="px-6 py-4 border-b border-l border-slate-300">Bezichtigingen</th>
                          <th className="px-6 py-4 border-b border-l border-slate-300">Biedingen</th>
                          <th className="px-6 py-4 border-b border-l border-slate-300">Bouwkundige Keuring</th>
                          <th className="px-6 py-4 border-b border-l border-slate-300 text-center">Concept Koopcontract</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {klantenLijst.map((klant, idx) => (
                          <tr key={idx} className="bg-white/40 hover:bg-white/60 transition-colors">

                            {/* Klant Column */}
                            <td className="px-6 py-5 align-top min-w-[260px]">
                              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                                {/* Avatar + naam */}
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e67e22] to-orange-400 flex items-center justify-center text-white font-bold text-base shadow-sm flex-shrink-0">
                                    {klant.Naam ? klant.Naam.charAt(0).toUpperCase() : '?'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-[#2d3e50] text-base leading-tight">{klant.Naam || 'Naamloos'}</p>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold ring-1 ring-inset ring-emerald-600/20">Actief</span>
                                  </div>
                                </div>

                                {/* Profiel details */}
                                <div className="space-y-1.5">
                                  <div className="flex items-start gap-2">
                                    <MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-slate-600">
                                      <p className="font-bold text-slate-400 uppercase tracking-tighter text-[9px]">Regio</p>
                                      <p className="leading-snug">{klant.Regio || '—'}</p>
                                      {klant['Bijzonderheden Regio'] && klant['Bijzonderheden Regio'] !== 'n.v.t.' && klant['Bijzonderheden Regio'] !== 'geen' && (
                                        <p className="italic text-slate-400 text-[10px] mt-0.5">{klant['Bijzonderheden Regio']}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-start gap-2">
                                    <span className="text-slate-400 font-bold text-[11px] mt-0.5 flex-shrink-0">€</span>
                                    <div className="text-xs text-slate-600">
                                      <p className="font-bold text-slate-400 uppercase tracking-tighter text-[9px]">Budget</p>
                                      <p>{klant.Prijsklasse || '—'}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-start gap-2">
                                    <Home size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-slate-600">
                                      <p className="font-bold text-slate-400 uppercase tracking-tighter text-[9px]">Woningtype</p>
                                      <p className="leading-snug">{klant.Woningtype || '—'}</p>
                                    </div>
                                  </div>

                                  {klant['Bijzondere Kenmerken'] && klant['Bijzondere Kenmerken'] !== 'geen' && klant['Bijzondere Kenmerken'] !== 'n.v.t.' && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-amber-400 font-bold text-[11px] mt-0.5 flex-shrink-0">★</span>
                                      <div className="text-xs text-slate-600">
                                        <p className="font-bold text-slate-400 uppercase tracking-tighter text-[9px]">Bijzonderheden</p>
                                        <p className="leading-snug">{klant['Bijzondere Kenmerken']}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Bezichtigingen Column */}
                            <td className="px-6 py-5 border-l border-slate-300 align-top min-w-[260px]">
                              <div className="flex flex-col gap-2">
                                <button
                                  className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl px-3 py-2 transition-all border border-dashed border-emerald-300 hover:border-emerald-500 w-full justify-center font-semibold text-sm"
                                  title="Bezichtiging toevoegen"
                                >
                                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg leading-none">+</span>
                                  Bezichtiging toevoegen
                                </button>
                              </div>
                            </td>

                            {/* Biedingen Column */}
                            <td className="px-6 py-5 border-l border-slate-300 align-top min-w-[220px]">
                              <div className="flex flex-col gap-2">
                                <button
                                  className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl px-3 py-2 transition-all border border-dashed border-emerald-300 hover:border-emerald-500 w-full justify-center font-semibold text-sm"
                                  title="Bieding toevoegen"
                                >
                                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg leading-none">+</span>
                                  Bieding toevoegen
                                </button>
                              </div>
                            </td>

                            {/* Bouwkundige Keuring Column */}
                            <td className="px-6 py-5 border-l border-slate-300 align-top min-w-[220px]">
                              <div className="flex flex-col gap-2">
                                <button
                                  className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl px-3 py-2 transition-all border border-dashed border-emerald-300 hover:border-emerald-500 w-full justify-center font-semibold text-sm"
                                  title="Bouwkundige keuring toevoegen"
                                >
                                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg leading-none">+</span>
                                  Keuring toevoegen
                                </button>
                              </div>
                            </td>

                            {/* Concept Koopcontract Column */}
                            <td className="px-6 py-5 border-l border-slate-300 align-top text-center min-w-[220px]">
                              <div className="flex flex-col gap-2">
                                <button
                                  className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl px-3 py-2 transition-all border border-dashed border-emerald-300 hover:border-emerald-500 w-full justify-center font-semibold text-sm"
                                  title="Concept koopcontract toevoegen"
                                >
                                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg leading-none">+</span>
                                  Contract toevoegen
                                </button>
                              </div>
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                </motion.div>
              ) : activeView === 'nieuwste' ? (
                <motion.div
                  key="nieuwste"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h2 className="text-4xl font-bold text-[#2d3e50] mb-2">Nieuwste Huizen Scans</h2>
                      <p className="text-slate-500 text-lg">Overzicht van de nieuwste woningen uit onze scans</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={refreshScans}
                        disabled={refreshingScans}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-sm border transition-all ${
                          refreshingScans 
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 active:scale-95'
                        }`}
                      >
                        <RefreshCw size={18} className={refreshingScans ? 'animate-spin' : ''} />
                        {refreshingScans ? 'Verversen...' : 'Scans verversen'}
                      </button>
                      <div className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-sm border border-slate-200">
                        <Clock size={18} />
                        Laatste update: {new Date().toLocaleDateString('nl-NL')}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-12 pb-12">
                    {loading ? (
                      <div className="flex justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      </div>
                    ) : houseScans.length > 0 ? (
                      regionOrder.map(region => (
                        groupedScans[region] && groupedScans[region].length > 0 && (
                          <div key={region} className="space-y-6">
                            <div className="flex items-baseline gap-4 mb-8">
                              <h3 className="text-6xl font-black text-[#2d3e50] capitalize tracking-tighter">
                                {region}
                              </h3>
                              <span className="text-2xl font-bold text-slate-300">
                                — {groupedScans[region].length} woningen
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-8">
                              {groupedScans[region].map((scan) => (
                                <HouseScanCard key={`${scan.ID}-${scan.adres}`} scan={scan} matches={matches} />
                              ))}
                            </div>
                          </div>
                        )
                      ))
                    ) : (
                      <div className="text-center p-20 text-slate-400 font-medium">
                        Geen scans gevonden. Nieuwe huizen verschijnen hier zodra de scraper draait.
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : activeView === 'vorige' ? (
                <motion.div
                  key="vorige"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h2 className="text-4xl font-bold text-[#2d3e50] mb-2">Huizen van gisteren</h2>
                      <p className="text-slate-500 text-lg">Overzicht van woningen uit de 1 na laatste scan</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={async () => {
                          setRefreshingScans(true);
                          try {
                            const res = await fetch(N8N_PREVIOUS_SCANS_URL, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ trigger: 'fetch_latest', source: 'WoonWensManager' })
                            });
                            const data = await res.json();
                            const processed = await parseN8nScans(Array.isArray(data) ? data : (data.data || []));
                            setPreviousHouseScans(processed);
                            alert(`Succesvol ${processed.length} scans van gisteren opgehaald!`);
                          } catch (error) {
                            alert('Fout bij verversen scans van gisteren.');
                          } finally {
                            setRefreshingScans(false);
                          }
                        }}
                        disabled={refreshingScans}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 transition-all shadow-lg ${
                          refreshingScans 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                        }`}
                      >
                        <RefreshCw size={18} className={refreshingScans ? 'animate-spin' : ''} />
                        {refreshingScans ? 'Verversen...' : 'Scans gisteren verversen'}
                      </button>
                      <div className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-sm border border-slate-200">
                        <Clock size={18} />
                        Scan van gisteren
                      </div>
                    </div>
                  </div>

                  <div className="space-y-12 pb-12">
                    {loading ? (
                      <div className="flex justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      </div>
                    ) : previousHouseScans.length > 0 ? (
                      regionOrder.map(region => (
                        groupedPreviousScans[region] && groupedPreviousScans[region].length > 0 && (
                          <div key={region} className="space-y-6">
                            <div className="flex items-baseline gap-4 mb-8">
                              <h3 className="text-6xl font-black text-[#2d3e50] capitalize tracking-tighter">
                                {region}
                              </h3>
                              <span className="text-2xl font-bold text-slate-300">
                                — {groupedPreviousScans[region].length} woningen
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-8">
                              {groupedPreviousScans[region].map((scan) => (
                                <HouseScanCard key={`${scan.ID}-${scan.adres}`} scan={scan} matches={matches} />
                              ))}
                            </div>
                          </div>
                        )
                      ))
                    ) : (
                      <div className="text-center p-20 text-slate-400 font-medium">
                        Geen data beschikbaar voor de gisteren-scan.
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : activeView === 'matches' ? (
                <motion.div
                  key="matches"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h2 className="text-4xl font-bold text-[#2d3e50] mb-2">Klant Matches</h2>
                      <p className="text-slate-500 text-lg">AI-geanalyseerde matches op basis van klantprofielen</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={refreshMatches}
                        disabled={refreshing}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-sm border transition-all ${
                          refreshing 
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 active:scale-95'
                        }`}
                      >
                        <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                        {refreshing ? 'Verversen...' : 'Matches verversen'}
                      </button>
                      <div className="bg-amber-100 text-amber-700 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-sm border border-amber-200">
                        <Clock size={18} />
                        Laatste update: {new Date().toLocaleDateString('nl-NL')} {new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-8 pb-12">
                    {loading ? (
                      <div className="flex justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      </div>
                    ) : matches.length > 0 ? (
                      [...matches]
                        .sort((a, b) => b.matchPercentage - a.matchPercentage)
                        .map((match: any) => (
                          <MatchCard key={match.id} match={match} klanten={klantenLijst} scans={houseScans} />
                        ))
                    ) : (
                      <div className="text-center p-20 text-slate-400 font-medium">
                        Geen matches gevonden. Zodra de analyzer draait verschijnen de matches hier.
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : activeView === 'klanten' ? (
                <KlantenView 
                   klanten={klantenLijst} 
                   refreshing={refreshingKlanten} 
                   onRefresh={refreshKlanten} 
                   onAddKlant={() => { setEditingKlantRow(null); resetAddKlantForm(); setShowAddKlantModal(true); }} 
                   onDeleteKlant={handleDeleteKlant}
                   onEditKlant={handleEditKlant}
                   deletingRow={deletingKlantRow}
                />
              ) : activeView === 'blog-post-maker' ? (
                <BlogPostMakerView key="blog-post-maker" />
              ) : null}
            </AnimatePresence>
            
            {/* Add Klant Wizard - multi-step accordion */}
            <AnimatePresence>
              {showAddKlantModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => { setShowAddKlantModal(false); resetAddKlantForm(); }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 20 }}
                    className="relative w-full bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
                    style={{ maxWidth: 980, maxHeight: '92vh', borderRadius: 6 }}
                  >
                    {/* Modal header */}
                    <div className="px-5 py-3 border-b border-slate-200 flex justify-between items-center bg-white flex-shrink-0">
                      <h3 className="text-sm font-semibold text-[#2d3e50] flex items-center gap-2">
                        <UserPlus className="text-[#e67e22]" size={17} />
                        {editingKlantRow ? 'Zoekprofiel bewerken' : 'Nieuw zoekprofiel toevoegen'}
                      </h3>
                      <button type="button" onClick={() => { setShowAddKlantModal(false); resetAddKlantForm(); }}
                        className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
                        <X size={17} />
                      </button>
                    </div>

                    {/* Scrollable accordion body */}
                    <div className="overflow-y-auto flex-1">

                      {/* ── Stap 1: Relatie ── */}
                      <div className="border-b border-slate-200">
                        <button type="button" onClick={() => setAddKlantStep(addKlantStep === 1 ? 0 : 1)}
                          className={`w-full flex items-center gap-2 px-5 py-3 text-left text-sm font-semibold transition-colors
                            ${addKlantStep === 1 ? 'bg-[#cfe2f3] text-[#1a5c8a]' : 'bg-[#e8f4fb] text-[#2d3e50] hover:bg-[#daeaf7]'}`}>
                          <span className="text-xs">{addKlantStep === 1 ? '▾' : '▸'}</span>
                          Stap 1. Relatie
                        </button>
                        {addKlantStep === 1 && (
                          <div className="px-8 py-5 bg-white">
                            <div className="max-w-xs">
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Naam klant *</label>
                              <input required type="text" value={newKlant.Naam}
                                onChange={e => setNewKlant({ ...newKlant, Naam: e.target.value })}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                                placeholder="Bijv. Familie de Vries" />
                            </div>
                            <div className="mt-5 flex justify-center">
                              <button type="button" disabled={!newKlant.Naam.trim()}
                                onClick={() => setAddKlantStep(2)}
                                className="px-10 py-1.5 bg-[#5b9bd5] hover:bg-[#4a8ac4] disabled:opacity-40 text-white text-sm font-medium rounded border border-[#3a7ab4] transition-colors">
                                Volgende stap
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Stap 2: Locatie ── */}
                      <div className="border-b border-slate-200">
                        <button type="button" onClick={() => setAddKlantStep(addKlantStep === 2 ? 0 : 2)}
                          className={`w-full flex items-center gap-2 px-5 py-3 text-left text-sm font-semibold transition-colors
                            ${addKlantStep === 2 ? 'bg-[#cfe2f3] text-[#1a5c8a]' : 'bg-[#e8f4fb] text-[#2d3e50] hover:bg-[#daeaf7]'}`}>
                          <span className="text-xs">{addKlantStep === 2 ? '▾' : '▸'}</span>
                          Stap 2. Locatie
                        </button>
                        {addKlantStep === 2 && (
                          <div className="px-8 py-5 bg-white">
                            <div className="flex gap-5">
                              {/* Left: search */}
                              <div className="w-64 flex-shrink-0">
                                <p className="text-xs text-slate-600 mb-1.5">Selecteer een locatie</p>
                                <div className="flex gap-1 mb-1.5">
                                  <select value={newKlant.LocatieFilter}
                                    onChange={e => setNewKlant({ ...newKlant, LocatieFilter: e.target.value })}
                                    className="px-1.5 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none">
                                    {['Alles','Provincie','Gemeente','Wijk','Postcodegebied'].map(f => <option key={f}>{f}</option>)}
                                  </select>
                                  <div className="flex-1 flex items-center border border-slate-300 rounded bg-white px-2 gap-1">
                                    <input type="text" value={newKlant.LocatieZoekterm}
                                      onChange={e => setNewKlant({ ...newKlant, LocatieZoekterm: e.target.value })}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const loc = newKlant.LocatieZoekterm.trim();
                                          if (loc && !newKlant.GeselecteerdeLocaties.includes(loc)) {
                                            setNewKlant({ ...newKlant, GeselecteerdeLocaties: [...newKlant.GeselecteerdeLocaties, loc], LocatieZoekterm: '' });
                                            setLocatieError(false);
                                          }
                                        }
                                      }}
                                      className="flex-1 py-1 text-xs outline-none bg-transparent"
                                      placeholder="Typ uw locatie" />
                                    <button type="button" onClick={() => {
                                      const loc = newKlant.LocatieZoekterm.trim();
                                      if (loc && !newKlant.GeselecteerdeLocaties.includes(loc)) {
                                        setNewKlant({ ...newKlant, GeselecteerdeLocaties: [...newKlant.GeselecteerdeLocaties, loc], LocatieZoekterm: '' });
                                        setLocatieError(false);
                                      }
                                    }} className="text-slate-400 hover:text-blue-500">
                                      <Search size={13} />
                                    </button>
                                  </div>
                                </div>
                                {newKlant.GeselecteerdeLocaties.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">U heeft nog geen nieuwe locaties toegevoegd.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {newKlant.GeselecteerdeLocaties.map((loc, i) => (
                                      <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded border border-blue-200">
                                        {loc}
                                        <button type="button"
                                          onClick={() => {
                                            setNewKlant(prev => {
                                              const removedLoc = prev.GeselecteerdeLocaties[i];
                                              if (!removedLoc) return prev;
                                              const newCoords = { ...prev.GeselecteerdeCoords };
                                              delete newCoords[removedLoc];
                                              return { 
                                                ...prev, 
                                                GeselecteerdeLocaties: prev.GeselecteerdeLocaties.filter((_, idx) => idx !== i),
                                                GeselecteerdeCoords: newCoords
                                              };
                                            });
                                          }}
                                          className="hover:text-red-600 leading-none ml-0.5">×</button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* Right: map */}
                              <div className="flex-1 overflow-hidden" style={{ minHeight: 360 }}>
                                <MapSelector 
                                  selectedLocations={newKlant.GeselecteerdeLocaties}
                                  selectedCoords={newKlant.GeselecteerdeCoords}
                                  onSelect={(loc, coords) => {
                                    setNewKlant(prev => {
                                      const hasLoc = prev.GeselecteerdeLocaties.includes(loc);
                                      const hasCoords = !!prev.GeselecteerdeCoords[loc];
                                      if (hasLoc && hasCoords && prev.GeselecteerdeCoords[loc][0] === coords[0]) return prev;

                                      return { 
                                        ...prev, 
                                        GeselecteerdeLocaties: hasLoc ? prev.GeselecteerdeLocaties : [...prev.GeselecteerdeLocaties, loc],
                                        GeselecteerdeCoords: { ...prev.GeselecteerdeCoords, [loc]: coords }
                                      };
                                    });
                                    setLocatieError(false);
                                  }}
                                />
                              </div>

                            </div>
                            {locatieError && (
                              <div className="mt-3 border-l-4 border-red-500 bg-red-50 px-3 py-2">
                                <p className="text-red-600 text-xs">Selecteer a.u.b. een of meerdere locaties</p>
                              </div>
                            )}
                            <div className="mt-5 flex justify-center">
                              <button type="button" onClick={() => {
                               if (newKlant.GeselecteerdeLocaties.length === 0) { setLocatieError(true); return; }
                               setLocatieError(false);
                               setNewKlant(prev => ({ ...prev, Regio: prev.GeselecteerdeLocaties.join(', ') }));
                               setAddKlantStep(3);
                              }} className="px-10 py-1.5 bg-[#5b9bd5] hover:bg-[#4a8ac4] text-white text-sm font-medium rounded border border-[#3a7ab4] transition-colors">
                                Volgende stap
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Stap 3: Woonwensen ── */}
                      <div className="border-b border-slate-200">
                        <button type="button" onClick={() => setAddKlantStep(addKlantStep === 3 ? 0 : 3)}
                          className={`w-full flex items-center gap-2 px-5 py-3 text-left text-sm font-semibold transition-colors
                            ${addKlantStep === 3 ? 'bg-[#cfe2f3] text-[#1a5c8a]' : 'bg-[#e8f4fb] text-[#2d3e50] hover:bg-[#daeaf7]'}`}>
                          <span className="text-xs">{addKlantStep === 3 ? '▾' : '▸'}</span>
                          Stap 3. Woonwensen
                        </button>
                        {addKlantStep === 3 && (
                          <div className="px-8 py-5 bg-white">
                            {/* Match percentage */}
                            <div className="flex items-center gap-2 text-xs text-slate-700 mb-5">
                              <span>Stuur alleen emails met woningen die voor minimaal</span>
                              <select value={newKlant.MinMatchPercentage}
                                onChange={e => setNewKlant({ ...newKlant, MinMatchPercentage: e.target.value })}
                                className="px-1.5 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none">
                                {['60','65','70','75','80','85','90','95','100'].map(p => <option key={p}>{p}%</option>)}
                              </select>
                              <span>aan de woonwensen voldoen.</span>
                            </div>

                            <div className="flex gap-6">
                              {/* Left column */}
                              <div style={{ width: 175 }} className="flex-shrink-0 space-y-4">
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Soort</p>
                                  {[['koop','Koop'],['huur','Huur']].map(([v,l]) => (
                                    <label key={v} className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                                      <input type="radio" name="soort_wz" value={v} checked={newKlant.Soort === v}
                                        onChange={() => setNewKlant({...newKlant, Soort: v})} className="accent-blue-500" />
                                      {l}
                                    </label>
                                  ))}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Prijsklasse</p>
                                  <div className="flex items-center gap-1 mb-1">
                                    <span className="text-red-500 text-[10px]">*</span>
                                    <span className="text-xs text-slate-600 w-7">Van</span>
                                    <span className="text-xs">€</span>
                                    <input type="text" value={newKlant.Prijsklasse}
                                      onChange={e => setNewKlant({...newKlant, Prijsklasse: e.target.value})}
                                      className="w-20 px-1.5 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-slate-600 w-11">Max.</span>
                                    <span className="text-xs">€</span>
                                    <input type="text" value={newKlant.PrijsMax}
                                      onChange={e => setNewKlant({...newKlant, PrijsMax: e.target.value})}
                                      className="w-20 px-1.5 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Bouwvorm</p>
                                  {[['bestaand','Bestaande bouw'],['nieuwbouw','Nieuwbouw'],['beide','Beide']].map(([v,l]) => (
                                    <label key={v} className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                                      <input type="radio" name="bouwvorm_wz" value={v} checked={newKlant.Bouwvorm === v}
                                        onChange={() => setNewKlant({...newKlant, Bouwvorm: v})} className="accent-blue-500" />
                                      {l}
                                    </label>
                                  ))}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Objectsoort</p>
                                  {[['woonhuis_appartement','Woonhuis / Appartement'],['woonhuis','Woonhuis'],['appartement','Appartement'],['bouwgrond','Bouwgrond'],['overig','Overig']].map(([v,l]) => (
                                    <label key={v} className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                                      <input type="radio" name="objectsoort_wz" value={v} checked={newKlant.Objectsoort === v}
                                        onChange={() => setNewKlant({...newKlant, Objectsoort: v})} className="accent-blue-500" />
                                      {l}
                                    </label>
                                  ))}
                                </div>
                                <div className="border-t border-slate-200 pt-2">
                                  <button type="button" onClick={() => setShowSpecifiekeWensen(!showSpecifiekeWensen)}
                                    className="flex items-center gap-1.5 text-[#1a5c8a] text-xs font-bold uppercase tracking-wide">
                                    <span>{showSpecifiekeWensen ? '▾' : '▸'}</span>
                                    Specifieke wensen
                                  </button>
                                </div>
                              </div>

                              {/* Middle column */}
                              <div className="flex-1 space-y-4">
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Woonoppervlakte</p>
                                  <div className="flex items-center gap-1.5">
                                    <input type="text" value={newKlant.Woonoppervlakte} onChange={e => setNewKlant({...newKlant, Woonoppervlakte: e.target.value})}
                                      className="w-28 px-2 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="Minimaal:" />
                                    <span className="text-xs text-slate-500">m²</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Perceeloppervlakte</p>
                                  <div className="flex items-center gap-1.5">
                                    <input type="text" value={newKlant.Perceeloppervlakte} onChange={e => setNewKlant({...newKlant, Perceeloppervlakte: e.target.value})}
                                      className="w-28 px-2 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="Minimaal:" />
                                    <span className="text-xs text-slate-500">m²</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Aantal kamers</p>
                                  <input type="text" value={newKlant.AantalKamers} onChange={e => setNewKlant({...newKlant, AantalKamers: e.target.value})}
                                    className="w-28 px-2 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="Minimaal:" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Aantal slaapkamers</p>
                                  <input type="text" value={newKlant.AantalSlaapkamers} onChange={e => setNewKlant({...newKlant, AantalSlaapkamers: e.target.value})}
                                    className="w-28 px-2 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="Minimaal:" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Bestemming</p>
                                  {[['permanente_bewoning','Permanente bewoning'],['recreatiewoning','Recreatiewoning']].map(([v,l]) => (
                                    <label key={v} className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                                      <input type="checkbox" checked={newKlant.Bestemming.includes(v)}
                                        onChange={e => setNewKlant({...newKlant, Bestemming: e.target.checked ? [...newKlant.Bestemming, v] : newKlant.Bestemming.filter(x => x !== v)})}
                                        className="accent-blue-500" />
                                      {l}
                                    </label>
                                  ))}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Dubbele bewoning</p>
                                  {['Dubbele bewoning mogelijk','Dubbele bewoning aanwezig'].map(db => (
                                    <label key={db} className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                                      <input type="checkbox" checked={newKlant.DubbeleBewoning.includes(db)}
                                        onChange={e => setNewKlant({...newKlant, DubbeleBewoning: e.target.checked ? [...newKlant.DubbeleBewoning, db] : newKlant.DubbeleBewoning.filter(v => v !== db)})}
                                        className="accent-blue-500" />
                                      {db}
                                    </label>
                                  ))}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Energielabel</p>
                                  <select value={newKlant.Energielabel} onChange={e => setNewKlant({...newKlant, Energielabel: e.target.value})}
                                    className="w-32 px-1.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none">
                                    <option value="">Selecteer</option>
                                    {['A+++','A++','A+','A','B','C','D','E','F','G'].map(l => <option key={l}>{l}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Buitenruimte</p>
                                  {['Balkon','Tuin','Dakterras'].map(br => (
                                    <label key={br} className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                                      <input type="checkbox" checked={newKlant.Buitenruimte.includes(br)}
                                        onChange={e => setNewKlant({...newKlant, Buitenruimte: e.target.checked ? [...newKlant.Buitenruimte, br] : newKlant.Buitenruimte.filter(v => v !== br)})}
                                        className="accent-blue-500" />
                                      {br}
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* Right: Bepaal prioriteit */}
                              <div className="w-52 flex-shrink-0">
                                <div className="bg-[#dbeaf7] rounded border border-[#b8d4e8] p-4">
                                  <h4 className="font-bold text-[#1a5276] text-sm mb-0.5">Bepaal prioriteit</h4>
                                  <p className="text-xs text-slate-600 mb-3">Klik op een ster als iets een absolute eis is.</p>
                                  <div className="space-y-1.5 mb-3">
                                    {[['locatie','Locatie(s)'],['prijs','Prijsklasse'],['bouwvorm','Bouwvorm'],['objectsoort','Objectsoort'],['bewoning','Permanente bewoning']].map(([key,label]) => (
                                      <button key={key} type="button"
                                        onClick={() => setNewKlant({...newKlant, Prioriteiten: newKlant.Prioriteiten.includes(key) ? newKlant.Prioriteiten.filter(p => p !== key) : [...newKlant.Prioriteiten, key]})}
                                        className="flex items-center gap-2 w-full text-left text-xs text-slate-700 hover:text-[#1a5276] group">
                                        <span className={`text-base transition-colors ${newKlant.Prioriteiten.includes(key) ? 'text-[#1a5c8a]' : 'text-slate-300 group-hover:text-[#1a5c8a]'}`}>
                                          {newKlant.Prioriteiten.includes(key) ? '★' : '☆'}
                                        </span>
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="border-t border-[#b8d4e8] pt-2.5 mb-2.5">
                                    <p className="text-xs font-bold text-slate-700 mb-1">Stuur eigen woningaanbod</p>
                                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                                      <input type="checkbox" defaultChecked className="accent-blue-500" />
                                      én dat van andere makelaarskantoren
                                    </label>
                                  </div>
                                  <div className="border-t border-[#b8d4e8] pt-2.5 mb-2.5">
                                    <p className="text-xs font-bold text-slate-700 mb-1">Beschikbaar aanbod vanaf:</p>
                                    <select className="w-full px-1.5 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none">
                                      <option>Afgelopen 2 weken</option>
                                      <option>Afgelopen maand</option>
                                      <option>Afgelopen 3 maanden</option>
                                      <option>Alle aanbod</option>
                                    </select>
                                  </div>
                                  <div className="border-t border-[#b8d4e8] pt-2.5 text-center">
                                    <p className="text-xs font-bold text-slate-700 mb-1">Aantal gevonden woningen:</p>
                                    <p className="text-3xl font-black text-slate-800">0</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Specifieke wensen uitklapper */}
                            {showSpecifiekeWensen && (
                              <div className="mt-4 border-t-2 border-[#1a5c8a]/20 pt-4">
                                <p className="text-xs font-bold text-[#1a5c8a] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                  <span>▾</span> Specifieke wensen
                                </p>
                                <CheckboxGroup title="Type woning"
                                  items={['Verspringend','Halfvrijstaande woning','Hoekwoning','2-onder-1-kap','Vrijstaande woning','Geschakelde 2-onder-1-kap','Eindwoning','Tussenwoning','Geschakelde woning']}
                                  selected={newKlant.TypeWoning} onChange={vals => setNewKlant({...newKlant, TypeWoning: vals})} />
                                <CheckboxGroup title="Soort woning"
                                  items={['Eengezinswoning','Bungalow','Stacaravan','Herenhuis','Woonboerderij','Woonwagen','Villa','Grachtenpand','Landgoed','Landhuis','Woonboot']}
                                  selected={newKlant.SoortWoning} onChange={vals => setNewKlant({...newKlant, SoortWoning: vals})} />
                                <CheckboxGroup title="Soort appartement"
                                  items={['Tussenverdieping','Studentenkamer','Penthouse','Portiekflat','Maisonnette','Boven woning','Dubbel benedenhuis','Portiekwoning','Beneden + bovenwoning','Galerijflat','Benedenwoning']}
                                  selected={newKlant.SoortAppartement} onChange={vals => setNewKlant({...newKlant, SoortAppartement: vals})} />
                                <CheckboxGroup title="Ligging"
                                  items={['Bedrijventerrein','Landelijk gelegen','In centrum','Open ligging','Vrij uitzicht','Zeezicht','Aan drukke weg','Aan water','Beschutte ligging','In bosrijke omgeving','Buiten bebouwde kom','Aan park','In woonwijk','Aan rustige weg','Aan bosrand','Aan vaarwater']}
                                  selected={newKlant.Ligging} onChange={vals => setNewKlant({...newKlant, Ligging: vals})} />

                                {/* Bijzonderheden & Toegankelijkheid */}
                                <div className="border-t border-slate-100 pt-3 flex gap-8">
                                  <div className="flex-1">
                                    <p className="text-xs font-semibold text-slate-700 mb-2">Bijzonderheden</p>
                                    {['Gedeeltelijk gestoffeerd','Gemeubileerd','Gestoffeerd','Kluswoning'].map(item => (
                                      <label key={item} className="flex items-center gap-1.5 text-xs mb-1.5 cursor-pointer hover:text-blue-600">
                                        <input type="checkbox" checked={newKlant.Bijzonderheden.includes(item)}
                                          onChange={e => setNewKlant({...newKlant, Bijzonderheden: e.target.checked ? [...newKlant.Bijzonderheden, item] : newKlant.Bijzonderheden.filter(v => v !== item)})}
                                          className="accent-blue-500 w-3.5 h-3.5" />
                                        {item}
                                      </label>
                                    ))}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-semibold text-slate-700 mb-2">Toegankelijkheid</p>
                                    {['Geschikt voor ouderen','Geschikt voor minder validen','Slaapkamer op de begane grond','Badkamer op de begane grond'].map(item => (
                                      <label key={item} className="flex items-center gap-1.5 text-xs mb-1.5 cursor-pointer hover:text-blue-600">
                                        <input type="checkbox" checked={newKlant.Toegankelijkheid.includes(item)}
                                          onChange={e => setNewKlant({...newKlant, Toegankelijkheid: e.target.checked ? [...newKlant.Toegankelijkheid, item] : newKlant.Toegankelijkheid.filter(v => v !== item)})}
                                          className="accent-blue-500 w-3.5 h-3.5" />
                                        {item}
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                <OnderhoudGroup title="Onderhoud binnen" fieldName="onderhoud_binnen_wz"
                                  value={newKlant.OnderhoudBinnen} onChange={v => setNewKlant({...newKlant, OnderhoudBinnen: v})} />
                                <OnderhoudGroup title="Onderhoud buiten" fieldName="onderhoud_buiten_wz"
                                  value={newKlant.OnderhoudBuiten} onChange={v => setNewKlant({...newKlant, OnderhoudBuiten: v})} />

                                {/* Parkeren / Voorzieningen / Eigendom */}
                                <div className="border-t border-slate-100 pt-3 flex gap-8">
                                  <div>
                                    <p className="text-xs font-semibold text-slate-700 mb-2">Parkeren</p>
                                    {['Garage','Parkeerplaats'].map(item => (
                                      <label key={item} className="flex items-center gap-1.5 text-xs mb-1.5 cursor-pointer hover:text-blue-600">
                                        <input type="checkbox" checked={newKlant.Parkeren.includes(item)}
                                          onChange={e => setNewKlant({...newKlant, Parkeren: e.target.checked ? [...newKlant.Parkeren, item] : newKlant.Parkeren.filter(v => v !== item)})}
                                          className="accent-blue-500 w-3.5 h-3.5" />
                                        {item}
                                      </label>
                                    ))}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-slate-700 mb-2">Voorzieningen</p>
                                    {['Lift','Berging','Zonnepanelen','Jacuzzi','Zwembad'].map(item => (
                                      <label key={item} className="flex items-center gap-1.5 text-xs mb-1.5 cursor-pointer hover:text-blue-600">
                                        <input type="checkbox" checked={newKlant.Voorzieningen.includes(item)}
                                          onChange={e => setNewKlant({...newKlant, Voorzieningen: e.target.checked ? [...newKlant.Voorzieningen, item] : newKlant.Voorzieningen.filter(v => v !== item)})}
                                          className="accent-blue-500 w-3.5 h-3.5" />
                                        {item}
                                      </label>
                                    ))}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-slate-700 mb-2">Eigendom</p>
                                    {['Geen erfpacht','Alleen erfpacht indien afgekocht'].map(item => (
                                      <label key={item} className="flex items-center gap-1.5 text-xs mb-1.5 cursor-pointer hover:text-blue-600">
                                        <input type="checkbox" checked={newKlant.Eigendom.includes(item)}
                                          onChange={e => setNewKlant({...newKlant, Eigendom: e.target.checked ? [...newKlant.Eigendom, item] : newKlant.Eigendom.filter(v => v !== item)})}
                                          className="accent-blue-500 w-3.5 h-3.5" />
                                        {item}
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                {/* Bouwjaar */}
                                <div className="border-t border-slate-100 pt-3">
                                  <p className="text-xs font-semibold text-slate-700 mb-2">Bouwjaar</p>
                                  <div className="flex items-center gap-3 mb-1.5">
                                    <span className="text-xs text-slate-600 w-6">Van</span>
                                    <input type="text" value={newKlant.BouwjaarVan} onChange={e => setNewKlant({...newKlant, BouwjaarVan: e.target.value})}
                                      className="w-20 px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-slate-50" />
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-600 w-6">t/m</span>
                                    <input type="text" value={newKlant.BouwjaarTm} onChange={e => setNewKlant({...newKlant, BouwjaarTm: e.target.value})}
                                      className="w-20 px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-slate-50" />
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="mt-5 flex justify-center">
                              <button type="button" onClick={() => setAddKlantStep(4)}
                                className="px-10 py-1.5 bg-[#5b9bd5] hover:bg-[#4a8ac4] text-white text-sm font-medium rounded border border-[#3a7ab4] transition-colors">
                                Volgende stap
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Stap 4: Instellingen ── */}
                      <div>
                        <button type="button" onClick={() => setAddKlantStep(addKlantStep === 4 ? 0 : 4)}
                          className={`w-full flex items-center gap-2 px-5 py-3 text-left text-sm font-semibold transition-colors
                            ${addKlantStep === 4 ? 'bg-[#cfe2f3] text-[#1a5c8a]' : 'bg-[#e8f4fb] text-[#2d3e50] hover:bg-[#daeaf7]'}`}>
                          <span className="text-xs">{addKlantStep === 4 ? '▾' : '▸'}</span>
                          Stap 4. Instellingen
                        </button>
                        {addKlantStep === 4 && (
                          <form onSubmit={handleAddKlant} className="px-8 py-5 bg-white">
                            <div className="max-w-sm space-y-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mailadres klant</label>
                                <input type="email" value={newKlant.Email}
                                  onChange={e => setNewKlant({...newKlant, Email: e.target.value})}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  placeholder="naam@voorbeeld.nl" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notificatiefrequentie</label>
                                <select value={newKlant.Notificatie} onChange={e => setNewKlant({...newKlant, Notificatie: e.target.value})}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white focus:outline-none">
                                  <option value="direct">Direct (zodra beschikbaar)</option>
                                  <option value="dagelijks">Dagelijks overzicht</option>
                                  <option value="wekelijks">Wekelijks overzicht</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Extra notities / bijzondere wensen</label>
                                <textarea rows={3} value={newKlant.BijzondereKenmerken}
                                  onChange={e => setNewKlant({...newKlant, BijzondereKenmerken: e.target.value})}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                                  placeholder="Extra wensen of opmerkingen..." />
                              </div>
                            </div>
                            <div className="mt-5 flex justify-center gap-3">
                              <button type="button"
                                onClick={() => { setShowAddKlantModal(false); resetAddKlantForm(); }}
                                className="px-6 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded transition-colors">
                                Annuleren
                              </button>
                              <button type="submit" disabled={submittingKlant}
                                className="px-10 py-1.5 bg-[#5b9bd5] hover:bg-[#4a8ac4] disabled:opacity-50 text-white text-sm font-medium rounded border border-[#3a7ab4] transition-colors flex items-center gap-2">
                                {submittingKlant ? <RefreshCw size={14} className="animate-spin" /> : editingKlantRow ? <CheckCircle2 size={14} /> : <UserPlus size={14} />}
                                {editingKlantRow ? 'Wijzigingen Opslaan' : 'Profiel Opslaan'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>

                    </div>{/* end scrollable body */}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
