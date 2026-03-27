/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  Prijs: string;
  m2: string;
  "m2 perseel": string;
  satus: string;
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
}

const MATCH_DATA = {
  datum: "2026-03-26T18:30:00.707+01:00",
  matches: [
    {
      id: 1,
      clientName: "Kenny Jeurissen",
      address: "Parkstraat 9, Amstenrade",
      matchPercentage: 90,
      reason: "past qua woningtype (2-onder-1-kap), vraagprijs €335.000 binnen budget €350k, woonoppervlakte 135 m², grote achtertuin (ca.184 m²), garage en royale zolder als hobbyruimte. Kleine aandacht: energieklasse D (kan verbeteren).",
      shortSummary: "Prijs €€€ / Budget €€€€",
      features: ["4 slaapkamers mogelijk (3 regulier + zolder als 4e)", "Perceel 360 m² (grotere tuin dan gevraagd)"],
      link: "https://www.aquina.com/aanbod/woningaanbod/amstenrade/koop/huis-10067700-Parkstraat-9/",
      makelaar: "Aquina Hollanders makelaars"
    },
    {
      id: 2,
      clientName: "Saskia Essers",
      address: "Onze Lieve Vrouwestraat 46B 3, Ospel",
      matchPercentage: 60,
      reason: "vraagprijs €198.000 ruim binnen budget €390k, instapklaar, eigen parkeerplaats en berging. Nadelen: klein (ca.40 m²), 1 slaapkamer, geen expliciet levensloopbestendig ontwerp/grote verdieping. Gezamenlijke berging biedt beperkte hobbyruimte.",
      shortSummary: "Prijs € / Budget €€€",
      features: ["1 slaapkamer", "Geen tuin; eigen parkeerplaats + gezamenlijke berging"],
      link: "https://www.viadal.nl/aanbod/appartement-onze-lieve-vrouwestraat-46b-3-ospel/",
      makelaar: "Via Dal makelaardij"
    },
    {
      id: 3,
      clientName: "Irvina en Michel",
      address: "Boschstraat 85D, Maastricht",
      matchPercentage: 55,
      reason: "locatie Maastricht prima en binnen budget €600k (vraag €325k), instapklaar en sfeervol. Maar woningtype = bovenwoning/appartement (niet tweekapper/vrijstaand). Hobbyruimte beperkt; woonkamer groot (42 m²) en extra kamer geeft enige flexibiliteit. Bouwjaar circa 1800 (monument) — handig voor sfeer, maar niet voor hun voorkeur.",
      shortSummary: "Prijs €€ / Budget €€€",
      features: ["1 slaapkamer (3 kamers totaal; grote living biedt hobbyhoek)", "Geen tuin/garage; VvE/centrale verwarming aandachtspunt"],
      link: "https://makelaardij.fidus.nu/woningaanbod/boschstraat-85-d-in-maastricht/",
      makelaar: "Fidus Makelaardij"
    },
    {
      id: 4,
      clientName: "Joost en Joe",
      address: "Boschstraat 85D, Maastricht",
      matchPercentage: 35,
      reason: "locatie en prijs passen, maar harde eis van Joost & Joe: bouwjaar max 20 jaar en voorkeur voor vrijstaand/geschakeld/halfvrijstaand. Dit is een rijksmonument (ca.1800) bovenwoning — daarom lage match ondanks centrale locatie.",
      shortSummary: "Prijs €€ / Budget €€€€",
      features: ["1 slaapkamer, geen tuin, parkeren vergunning"],
      link: "https://makelaardij.fidus.nu/woningaanbod/boschstraat-85-d-in-maastricht/",
      makelaar: "Fidus Makelaardij"
    },
    {
      id: 5,
      clientName: "Saskia Essers",
      address: "Hoogpoort 214, Weert",
      matchPercentage: 20,
      reason: "bron gaf alleen een captcha/doorverwijzing; geen woningdata beschikbaar. Kan niet eerlijk scoren zonder woonoppervlak, type en indeling. Mogelijk matcht beter of slechter—graag volledige pagina of gegevens.",
      shortSummary: "Actie: stuur echte pagina/HTML of belangrijkste data",
      features: ["Geen data beschikbaar"],
      link: "https://www.koopklik.nl/woning/weert-hoogpoort-214/",
      makelaar: "KoopKlik"
    }
  ]
};

const HOUSE_SCANS: HouseScan[] = [
  {
    "row_number": 2,
    "ID": "AQU67700",
    "Datum": "26-03-2026",
    "Makelaar": "Aquina Hollanders makelaars",
    "adres": "Parkstraat 9",
    "Plaats": "Amstenrade",
    "Prijs": "€ 335.000,- k.k.",
    "m2": "--",
    "m2 perseel": "--",
    "satus": "Beschikbaar",
    "link": "https://www.aquina.com/aanbod/woningaanbod/amstenrade/koop/huis-10067700-Parkstraat-9/"
  },
  {
    "row_number": 3,
    "ID": "COR44845",
    "Datum": "26-03-2026",
    "Makelaar": "Corio Makelaars",
    "adres": "Burgemeester Henssingel 11C",
    "Plaats": "Valkenburg",
    "Prijs": "€ 399.000,- k.k.",
    "m2": "112 m²",
    "m2 perseel": "--",
    "satus": "Nieuw in verkoop",
    "link": "https://www.coriomakelaars.nl/woningaanbod/koop/valkenburg/burgemeester-henssingel/11-c"
  },
  {
    "row_number": 4,
    "ID": "KOO26984",
    "Datum": "26-03-2026",
    "Makelaar": "Koopklik",
    "adres": "Hoogpoort 214",
    "Plaats": "Weert",
    "Prijs": "€ 312.000,- k.k.",
    "m2": "68 m²",
    "m2 perseel": "--",
    "satus": "Beschikbaar",
    "link": "https://www.koopklik.nl/woning/weert-hoogpoort-214/"
  },
  {
    "row_number": 5,
    "ID": "M3M19086",
    "Datum": "26-03-2026",
    "Makelaar": "M3 Makelaars & Taxateurs",
    "adres": "Hofstraat 9",
    "Plaats": "Maasbracht",
    "Prijs": "€ 725.000,- k.k.",
    "m2": "233 m²",
    "m2 perseel": "1580 m²",
    "satus": "Beschikbaar",
    "link": "https://www.m3makelaardij.nl/aanbod/woningaanbod/maasbracht/koop/huis-9819086-Hofstraat-9/"
  },
  {
    "row_number": 6,
    "ID": "MAR00003",
    "Datum": "26-03-2026",
    "Makelaar": "Marcant",
    "adres": "Staai 3",
    "Plaats": "Grevenbicht",
    "Prijs": "€ 350.000 k.k.",
    "m2": "--",
    "m2 perseel": "--",
    "satus": "--",
    "link": "https://marcant.nl/woningaanbod/grevenbicht-staai-3/"
  },
  {
    "row_number": 7,
    "ID": "WAG00000",
    "Datum": "26-03-2026",
    "Makelaar": "Wagemans Wonen",
    "adres": "Forum 44",
    "Plaats": "Born",
    "Prijs": "€ 450.000,-",
    "m2": "120 m²",
    "m2 perseel": "--",
    "satus": "Onder bod",
    "link": "https://wa-wo.nl/aanbod/born-forum-44/"
  },
  {
    "row_number": 8,
    "ID": "VIA00463",
    "Datum": "26-03-2026",
    "Makelaar": "ViaDAL",
    "adres": "Onze Lieve Vrouwestraat 46B 3",
    "Plaats": "Ospel",
    "Prijs": "€ 198.000 k.k.",
    "m2": "--",
    "m2 perseel": "--",
    "satus": "Te koop",
    "link": "https://www.viadal.nl/aanbod/appartement-onze-lieve-vrouwestraat-46b-3-ospel/"
  },
  {
    "row_number": 9,
    "ID": "FID27126",
    "Datum": "26-03-2026",
    "Makelaar": "Fidus Makelaardij",
    "adres": "Boschstraat 85D",
    "Plaats": "Maastricht",
    "Prijs": "€ 325.000 k.k.",
    "m2": "--",
    "m2 perseel": "--",
    "satus": "Beschikbaar",
    "link": "https://makelaardij.fidus.nu/woningaanbod/boschstraat-85-d-in-maastricht/"
  },
  {
    "row_number": 10,
    "ID": "DIO00001",
    "Datum": "26-03-2026",
    "Makelaar": "Dionne Makelaars",
    "adres": "Valkenburg Hekerweg 44",
    "Plaats": "Valkenburg",
    "Prijs": "€ 445.000 k.k.",
    "m2": "6.280 m²",
    "m2 perseel": "--",
    "satus": "Beschikbaar",
    "link": "https://dionnemakelaars.nl/woning/valkenburg-hekerweg-44/"
  }
];

const DUMMY_CUSTOMERS: Customer[] = [
  {
    id: '1',
    name: 'Kenny Jeurissen',
    profile: {
      regio: 'Sittard, Nieuwstadt en omstreken',
      bijzonderhedenRegio: 'de woonwijken Ophoven en Overhoven en woonplaats Nieuwstadt',
      prijsklasse: 'tot en met € 350.000,-',
      woningtype: 'Halfvrijstaand, tweekapper, vrijstaande woning',
      bijzondereKenmerken: 'geen'
    },
    viewings: [
      { address: 'Parkstraat 9, Amstenrade', dateTime: '26/03/26 - 11:00' }
    ],
    totalViewings: 1,
    offers: [],
    structuralInspection: { status: 'Nee' },
    contract: { status: 'Nee' }
  },
  {
    id: '2',
    name: 'Merel en Yerke',
    profile: {
      regio: 'Echt, Susteren, Roosteren, Nieuwstadt, Maasgouw, Ohe en Laak, Stevensweert en omstreken',
      bijzonderhedenRegio: 'n.v.t.',
      prijsklasse: 'tot en met € 350.000,-',
      woningtype: 'tussenwoning, tweekapper, halfvrijstaand, vrijstaand',
      bijzondereKenmerken: 'geen'
    },
    viewings: [
      { address: 'Kerkstraat 12, Echt', dateTime: '20/03/26 - 14:00' },
      { address: 'Molenweg 5, Susteren', dateTime: '22/03/26 - 10:00' },
      { address: 'Julianastraat 44, Roosteren', dateTime: '24/03/26 - 09:30' },
      { address: 'Heerenstraat 2, Nieuwstadt', dateTime: '25/03/26 - 16:15' }
    ],
    totalViewings: 12,
    offers: [
      { amount: '€ 315.000', address: 'Kerkstraat 12', status: 'Afgewezen' },
      { amount: '€ 340.000', address: 'Molenweg 5', status: 'Rood' },
      { amount: '€ 345.000', address: 'Julianastraat 44', status: 'Geaccepteerd' }
    ],
    structuralInspection: { status: 'Gereed', date: '25/03/26', inspectorName: 'Jan de Bouwer' },
    contract: { status: 'Nee' }
  },
  {
    id: '3',
    name: 'Joost en Joe',
    profile: {
      regio: 'Maastricht',
      bijzonderhedenRegio: 'Statenkwartier, Hoge Barakken, Lindenkruis',
      prijsklasse: 'tot en met € 850.000,-',
      woningtype: 'Vrijstaand, geschakelde woning, halfvrijstaande woning',
      bijzondereKenmerken: 'bouwjaar maximaal 20 jaar oud'
    },
    viewings: [
      { address: 'Boschstraat 85D, Maastricht', dateTime: '26/03/26 - 15:30' }
    ],
    totalViewings: 1,
    offers: [
      { amount: '€ 325.000', address: 'Boschstraat 85D', status: 'Afgewezen' }
    ],
    structuralInspection: { status: 'Nee' },
    contract: { status: 'Nee' }
  },
  {
    id: '4',
    name: 'Bart Snel',
    profile: {
      regio: 'Spaubeek, Neerbeek, Beek, Sweikhuizen, Geleen, Puth en omstreken',
      bijzonderhedenRegio: 'n.v.t.',
      prijsklasse: 'tot en met € 300.000,-',
      woningtype: 'Halfvrijstaand, tweekapper',
      bijzondereKenmerken: 'Minimaal 3 slaapkamer'
    },
    viewings: [],
    totalViewings: 0,
    offers: [],
    structuralInspection: { status: 'Nee' },
    contract: { status: 'Nee' }
  },
  {
    id: '5',
    name: 'Irvina en Michel',
    profile: {
      regio: 'Maastricht',
      bijzonderhedenRegio: 'Amby, Brusselsepoort, Caberg, De Heeg, Heer, Heugem, Oud-caberg, Randwyck, Scharn, Sint Pieter, Vroendaal',
      prijsklasse: 'tot en met € 600.000,-',
      woningtype: 'Tweekapper, 2-onder-1 kapwoning, vrijstaande woning',
      bijzondereKenmerken: 'Instapklare woning, extra ruimte voor een hobbyruimte (mogelijke verbouwing garage)'
    },
    viewings: [
      { address: 'Boschstraat 85D, Maastricht', dateTime: '26/03/26 - 16:00' }
    ],
    totalViewings: 1,
    offers: [],
    structuralInspection: { status: 'Ingepland', date: '28/03/26', inspectorName: 'Pieter Keuringen' },
    contract: { status: 'Nee' }
  },
  {
    id: '6',
    name: 'Avital en Rico',
    profile: {
      regio: 'Geulle, Meerssen, Beek, Elsloo, Bunde en omstreken',
      prijsklasse: 'tot en met € 1.000.000,-',
      woningtype: 'Vrijstaand',
      bijzondereKenmerken: 'minimaal perceel van 2500 m2'
    },
    viewings: [],
    totalViewings: 0,
    offers: [],
    structuralInspection: { status: 'Nee' },
    contract: { status: 'Nee' }
  },
  {
    id: '7',
    name: 'Marly en Mitchell Takacs',
    profile: {
      regio: 'Vlodrop, Melick, Herkenbosch, St. Odilienberg, Posterholt, Maasniel, Hoogvonderen, Roer-zuid, Herten, Merum, Linne',
      prijsklasse: 'tot en met € 470.000,-',
      woningtype: 'Vrijstaand of halfvrijstaand',
      bijzondereKenmerken: 'oprit en garage'
    },
    viewings: [],
    totalViewings: 0,
    offers: [],
    structuralInspection: { status: 'Nee' },
    contract: { status: 'Nee' }
  },
  {
    id: '8',
    name: 'Saskia Essers',
    profile: {
      regio: 'Midden Limburg en Zuid Limburg',
      prijsklasse: 'tot en met € 390.000,-',
      woningtype: 'Levensloopbestendige woning, bungalow',
      bijzondereKenmerken: 'n.v.t.'
    },
    viewings: [
      { address: 'Onze Lieve Vrouwestraat 46B 3, Ospel', dateTime: '26/03/26 - 10:00' },
      { address: 'Hoogpoort 214, Weert', dateTime: '26/03/26 - 12:00' }
    ],
    totalViewings: 2,
    offers: [],
    structuralInspection: { status: 'Nee' },
    contract: { status: 'Nee' }
  },
  {
    id: '9',
    name: 'Renaldo1',
    profile: {
      regio: 'Beek, Spaubeek',
      prijsklasse: 'tot en met € 950.000,-',
      woningtype: 'Alle woningtypes',
      bijzondereKenmerken: 'n.v.t.'
    },
    viewings: [],
    totalViewings: 0,
    offers: [],
    structuralInspection: { status: 'Nee' },
    contract: { status: 'Nee' }
  }
];

type View = 'nieuwste' | 'matches' | 'manager';

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

const HouseScanCard: React.FC<{ scan: HouseScan }> = ({ scan }) => {
  const relevantMatches = MATCH_DATA.matches.filter(m => 
    m.address.includes(scan.adres) && m.matchPercentage >= 50
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden border border-slate-300 p-6 hover:shadow-xl transition-shadow"
    >
      <div className="flex flex-col gap-4">
        {/* Header with Address and Price */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-2xl font-bold text-[#2d3e50]">{scan.adres}</h3>
              <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-black shadow-sm ${scan.satus === 'Nieuw in verkoop' ? 'bg-red-500 text-white' :
                  scan.satus === 'Onder bod' ? 'bg-amber-500 text-white' :
                    'bg-blue-600 text-white'
                }`}>
                {scan.satus === '--' ? 'Beschikbaar' : scan.satus}
              </span>
            </div>
            <p className="text-slate-500 font-medium text-lg">{scan.Plaats}</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-3xl font-black text-blue-600">{scan.Prijs}</p>
            <p className="text-xs text-slate-400 font-medium">Gescand op: {scan.Datum}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 border-y border-slate-100">
          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">🏢</div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none mb-1">Makelaar</p>
              <p className="text-sm font-bold text-[#2d3e50]">{scan.Makelaar}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">📏</div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none mb-1">Oppervlakte</p>
              <p className="text-sm font-bold text-[#2d3e50]">
                {scan.m2 !== '--' ? scan.m2 : 'N/A'}
                {scan.m2 !== '--' && parseInt(scan.m2.replace(/[^0-9]/g, '')) > 350 && (
                  <span className="text-amber-600 ml-1 text-[10px] font-medium">(waarschijnlijk perceel)</span>
                )}
                {scan["m2 perseel"] !== '--' ? ` (Perceel: ${scan["m2 perseel"]})` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Match Notes */}
        {relevantMatches.length > 0 && (
          <div className="flex flex-col gap-2">
            {relevantMatches.map(match => (
              <div key={match.id} className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-3">
                <div className="mt-0.5 text-emerald-500">
                  <MatchIcon size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    Eventuele match met {match.clientName} ({match.matchPercentage}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link Section (No Image) */}
        <div className="mt-2 bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer group"
          onClick={() => window.open(scan.link, '_blank')}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ExternalLink size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-blue-600 truncate">{scan.link}</p>
              <p className="text-xs text-slate-500">Klik om de volledige advertentie te openen</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-blue-600 font-bold text-sm">
            Bekijken
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const MatchCard: React.FC<{ match: Match }> = ({ match }) => {
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
    const message = `Beste ${match.makelaar},\n\nIk zou graag een bezichtiging willen inplannen voor de ${match.address} op ${dateStr}. Laat me weten of dat mogelijk is.\n\nVriendelijke groet,\nRenaldo`;
    setMessageModal({ title: `Bericht voor ${match.makelaar}`, message, type: 'makelaar' });
    setEditedMessage(message);
    setCopied(false);
  };

  const openKlantMessage = () => {
    const message = `Beste ${match.clientName},\n\nIk heb een interessante woning voor u gevonden: ${match.address}.\n\nDeze woning past goed bij uw zoekprofiel. Graag zou ik een bezichtiging voor u willen inplannen. Laat mij weten wanneer het u uitkomt.\n\nMet vriendelijke groet,\nRenaldo`;
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

          {/* Analysis Section */}
          <div className="bg-white/50 rounded-2xl p-5 border border-slate-100">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-3">Analyse & Reden</h4>
            <p className="text-[#2d3e50] leading-relaxed italic text-lg">
              "{match.reason}"
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Kenmerken</h4>
              <ul className="space-y-2">
                {match.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span className="font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Financieel</h4>
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Gavel size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold leading-none mb-1">Budget Check</p>
                  <p className="text-sm font-bold text-[#2d3e50]">{match.shortSummary}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Links */}
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

export default function App() {
  const [activeView, setActiveView] = useState<View>('manager');
  const [selectedViewing, setSelectedViewing] = useState<{
    address: string;
    dateTime: string;
    customerName: string;
    details?: string;
  } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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
        <SidebarIcon view="matches" icon={MatchIcon} label="Matches" />
        <SidebarIcon view="manager" icon={Users} label="Manager" />
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
                  {/* Viewing Details Modal */}
                  <AnimatePresence>
                    {selectedViewing && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setSelectedViewing(null)}
                          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
                        >
                          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-[#2d3e50]">Bezichtiging Details</h3>
                            <button
                              onClick={() => setSelectedViewing(null)}
                              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                            >
                              <X size={20} />
                            </button>
                          </div>

                          <div className="p-8 space-y-6">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                <Home size={24} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Adres</p>
                                <p className="text-lg font-bold text-[#2d3e50]">{selectedViewing.address}</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                <Calendar size={24} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Datum & Tijd</p>
                                <p className="text-lg font-bold text-[#2d3e50]">{selectedViewing.dateTime}</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                                <Users size={24} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Klant</p>
                                <p className="text-lg font-bold text-[#2d3e50]">{selectedViewing.customerName}</p>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Onderzoek naar omgevings factoren is gereed</p>
                              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 mb-6">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <Search size={16} />
                                  </div>
                                  <span className="font-bold text-emerald-800">Volledig onderzoek beschikbaar</span>
                                </div>
                                <p className="text-emerald-700 text-sm leading-relaxed">

                                </p>
                                <button className="mt-3 w-full py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm">
                                  Bekijken / Downloaden
                                </button>
                              </div>

                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Extra Informatie</p>
                              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <p className="text-slate-600 leading-relaxed italic">
                                  {selectedViewing.details}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                              onClick={() => setSelectedViewing(null)}
                              className="px-6 py-2 bg-[#141e2b] text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                            >
                              Sluiten
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Customer Details Modal */}
                  <AnimatePresence>
                    {selectedCustomer && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setSelectedCustomer(null)}
                          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
                        >
                          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-bold text-[#2d3e50]">Klant Dossier: {selectedCustomer.name}</h3>
                            <button
                              onClick={() => setSelectedCustomer(null)}
                              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                            >
                              <X size={20} />
                            </button>
                          </div>

                          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Zoekprofiel</h4>
                                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                  <div className="flex items-start gap-2 text-sm">
                                    <MapPin size={14} className="text-slate-400 mt-1" />
                                    <span>{selectedCustomer.profile.regio}</span>
                                  </div>
                                  <div className="flex items-start gap-2 text-sm">
                                    <span className="text-slate-400 font-bold">€</span>
                                    <span>{selectedCustomer.profile.prijsklasse}</span>
                                  </div>
                                  <div className="flex items-start gap-2 text-sm">
                                    <Home size={14} className="text-slate-400 mt-1" />
                                    <span>{selectedCustomer.profile.woningtype}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Status</h4>
                                <div className="flex gap-2">
                                  <span className="badge badge-green">Actief</span>
                                  <span className="badge badge-blue">Zoekend</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recente Activiteit</h4>
                                <div className="space-y-3">
                                  {selectedCustomer.viewings.length > 0 ? (
                                    <div className="text-sm text-slate-600">
                                      Laatste bezichtiging: <span className="font-bold">{selectedCustomer.viewings[0].address}</span>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-slate-400 italic">Geen recente bezichtigingen</div>
                                  )}
                                  {selectedCustomer.offers.length > 0 && (
                                    <div className="text-sm text-slate-600">
                                      Laatste bod: <span className="font-bold text-emerald-600">{selectedCustomer.offers[0].amount}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Notities</h4>
                                <p className="text-sm text-slate-500 italic leading-relaxed">
                                  Klant is zeer serieus en heeft financiering reeds rond. Voorkeur gaat uit naar een woning met veel lichtinval.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                              className="px-6 py-2 border-2 border-[#141e2b] text-[#141e2b] rounded-xl font-bold hover:bg-white transition-colors"
                            >
                              Dossier Bewerken
                            </button>
                            <button
                              onClick={() => setSelectedCustomer(null)}
                              className="px-6 py-2 bg-[#141e2b] text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                            >
                              Sluiten
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  <h2 className="text-3xl font-bold text-[#2d3e50] mb-6">
                    Klantoverzicht - <span className="text-[#2d3e50]">Woningaanbod & Bezichtgingen</span>
                  </h2>

                  <div className="glass-card overflow-x-auto border border-slate-300 custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                      <thead>
                        <tr className="table-header">
                          <th className="px-6 py-4 border-b border-slate-300">Klant</th>
                          <th className="px-6 py-4 border-b border-l border-slate-300">Bezichtigingen</th>
                          <th className="px-6 py-4 border-b border-l border-slate-300">Bod</th>
                          <th className="px-6 py-4 border-b border-l border-slate-300">Bouwkundige Keuring</th>
                          <th className="px-6 py-4 border-b border-l border-slate-300 text-center">Concept Koopcontract</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {DUMMY_CUSTOMERS.map((customer) => (
                          <tr key={customer.id} className="bg-white/40 hover:bg-white/60 transition-colors">
                            {/* Klant Column */}
                            <td
                              className="px-6 py-6 align-top min-w-[250px] cursor-pointer hover:bg-slate-50/50 transition-colors"
                              onClick={() => setSelectedCustomer(customer)}
                            >
                              <div className="flex flex-col gap-3">
                                <span className="text-xl font-bold text-[#2d3e50] border-b border-slate-200 pb-1 group-hover:text-blue-600">{customer.name}</span>
                                <div className="space-y-2">
                                  <div className="flex items-start gap-2">
                                    <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-slate-600">
                                      <p className="font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Regio</p>
                                      <p>{customer.profile.regio}</p>
                                      {customer.profile.bijzonderhedenRegio && customer.profile.bijzonderhedenRegio !== 'n.v.t.' && (
                                        <p className="italic text-slate-400 mt-0.5">{customer.profile.bijzonderhedenRegio}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-start gap-2">
                                    <div className="w-[14px] h-[14px] flex items-center justify-center text-slate-400 mt-0.5 flex-shrink-0 font-bold text-[10px]">€</div>
                                    <div className="text-xs text-slate-600">
                                      <p className="font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Prijsklasse</p>
                                      <p>{customer.profile.prijsklasse}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-start gap-2">
                                    <Home size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-slate-600">
                                      <p className="font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Woningtype</p>
                                      <p>{customer.profile.woningtype}</p>
                                    </div>
                                  </div>

                                  {customer.profile.bijzondereKenmerken && customer.profile.bijzondereKenmerken !== 'geen' && customer.profile.bijzondereKenmerken !== 'n.v.t.' && (
                                    <div className="flex items-start gap-2">
                                      <div className="w-[14px] h-[14px] flex items-center justify-center text-amber-400 mt-0.5 flex-shrink-0 font-bold text-[10px]">★</div>
                                      <div className="text-xs text-slate-600">
                                        <p className="font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Bijzonderheden</p>
                                        <p>{customer.profile.bijzondereKenmerken}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Bezichtigingen Column */}
                            <td className="px-6 py-6 border-l border-slate-300 align-top min-w-[300px]">
                              <div className="space-y-4 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                                {customer.viewings.map((v, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setSelectedViewing({
                                      ...v,
                                      customerName: customer.name,
                                      details: "Extra informatie over deze bezichtiging: De klant was erg enthousiast over de lichtinval en de ruime keuken. Er is interesse getoond in een tweede bezichtiging."
                                    })}
                                    className="w-full text-left flex flex-col pb-2 border-b border-slate-100 last:border-0 last:pb-0 hover:bg-slate-50/50 p-2 -m-2 rounded-lg transition-colors group"
                                  >
                                    <div className="flex items-center gap-2 text-[#2d3e50] font-medium leading-tight group-hover:text-blue-600 transition-colors">
                                      <span className="text-lg flex-shrink-0">🏡</span>
                                      <span className="text-sm md:text-base">{v.address}</span>
                                    </div>
                                    <div className="flex items-center justify-between ml-7 mt-1">
                                      <span className="text-slate-500 text-xs md:text-sm">{v.dateTime}</span>
                                      <span className="badge badge-green text-[8px] py-0 px-1 flex items-center gap-0.5 leading-none h-3.5 whitespace-nowrap">
                                        <Search size={7} /> Bekijk onderzoek
                                      </span>
                                    </div>
                                  </button>
                                ))}
                                {customer.totalViewings > customer.viewings.length && (
                                  <div className="ml-7 pt-2">
                                    <button className="text-blue-600 hover:text-blue-800 underline text-sm font-bold transition-colors">
                                      + {customer.totalViewings - customer.viewings.length} meer bezichtigingen...
                                    </button>
                                    <span className="text-slate-400 text-xs ml-1 block mt-0.5">(Totaal {customer.totalViewings} bezichtigingen)</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Bod Column */}
                            <td
                              className="px-6 py-6 border-l border-slate-300 align-top cursor-pointer hover:bg-slate-50/50 transition-colors"
                              onClick={() => setSelectedCustomer(customer)}
                            >
                              <div className="space-y-4">
                                {customer.offers.map((offer, i) => (
                                  <div key={i} className="flex flex-col gap-1">
                                    <span className="text-[#2d3e50] font-medium">
                                      Bod {offer.amount} op {offer.address}
                                    </span>
                                    <div className="flex gap-2">
                                      <span className={`badge ${offer.status === 'Groen' ? 'badge-green' :
                                          offer.status === 'Afgewezen' ? 'badge-red' :
                                            offer.status === 'Rood' ? 'badge-red' :
                                              offer.status === 'Geaccepteerd' ? 'badge-green' :
                                                'badge-green'
                                        }`}>
                                        {offer.status === 'Groen' ? (
                                          <span className="flex items-center gap-1">
                                            Agenda bijgewerkt <CheckCircle2 size={12} className="text-emerald-500" />
                                          </span>
                                        ) : offer.status}
                                      </span>
                                      {offer.status !== 'Geaccepteerd' && offer.status !== 'Groen' && <span className="badge badge-gray">status</span>}
                                      {offer.status === 'Geaccepteerd' && (
                                        <span className="badge badge-green flex items-center gap-1">
                                          Agenda bijgewerkt <CheckCircle2 size={12} className="text-emerald-500" />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>

                            {/* Bouwkundige Keuring Column */}
                            <td
                              className="px-6 py-6 border-l border-slate-300 align-top cursor-pointer hover:bg-slate-50/50 transition-colors"
                              onClick={() => setSelectedCustomer(customer)}
                            >
                              <div className="flex flex-col items-center justify-center h-full gap-1">
                                {customer.structuralInspection?.status === 'Nee' && (
                                  <span className="text-xl text-[#2d3e50]">Nee</span>
                                )}
                                {customer.structuralInspection?.status === 'Ingepland' && (
                                  <>
                                    <span className="badge badge-amber">Ingepland</span>
                                    <span className="text-slate-600 text-sm">{customer.structuralInspection.date}</span>
                                    {customer.structuralInspection.inspectorName && (
                                      <span className="text-slate-400 text-[10px] italic">{customer.structuralInspection.inspectorName}</span>
                                    )}
                                  </>
                                )}
                                {customer.structuralInspection?.status === 'Gereed' && (
                                  <>
                                    <div className="flex items-center gap-2 text-xl font-semibold text-[#2d3e50]">
                                      Gereed <CheckCircle2 className="text-emerald-500" size={24} />
                                    </div>
                                    <span className="text-slate-600 text-sm">{customer.structuralInspection.date}</span>
                                    {customer.structuralInspection.inspectorName && (
                                      <span className="text-slate-400 text-[10px] italic">{customer.structuralInspection.inspectorName}</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Contract Column */}
                            <td className="px-6 py-6 border-l border-slate-300 align-top text-center">
                              <div className="flex flex-col items-center justify-center h-full gap-1">
                                {customer.contract.status === 'Nee' && (
                                  <span className="text-xl text-[#2d3e50]">Nee</span>
                                )}
                                {customer.contract.status === 'afgewezen' && (
                                  <>
                                    <span className="badge badge-amber">afgewezen</span>
                                    <span className="text-slate-600 text-sm">{customer.contract.date}</span>
                                  </>
                                )}
                                {customer.contract.status === 'Ja Getekend' && (
                                  <>
                                    <div className="flex items-center gap-2 text-xl font-semibold text-[#2d3e50]">
                                      Ja Getekend <CheckCircle2 className="text-emerald-500" size={24} />
                                    </div>
                                    <span className="text-slate-600 text-sm">{customer.contract.date}</span>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                    <div className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-sm border border-slate-200">

                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 pb-12">
                    {HOUSE_SCANS.map((scan) => (
                      <HouseScanCard key={scan.ID} scan={scan} />
                    ))}
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
                    <div className="bg-amber-100 text-amber-700 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-sm border border-amber-200">
                      <Clock size={18} />
                      Laatste update: 26-03-2026 18:30
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 pb-12">
                    {MATCH_DATA.matches.map((match) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
