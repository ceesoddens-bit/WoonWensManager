import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const app = express();
const port = 3001;
const DATA_FILE = path.join(process.cwd(), 'scans.json');
const MATCH_DATA_FILE = path.join(process.cwd(), 'matches.json');

app.use(cors());
app.use(express.json());

// 1. Initialiseer bestanden
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(MATCH_DATA_FILE)) fs.writeFileSync(MATCH_DATA_FILE, JSON.stringify({ matches: [] }, null, 2));

// SSE clients voor real-time matches updates
let matchSseClients: any[] = [];

function broadcastMatchUpdate(match: any) {
  const payload = JSON.stringify(match);
  matchSseClients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (_) {}
  });
}

// 2. Helper voor PDOK Wijk Lookup
async function getOfficialWijk(adres: string, plaats: string): Promise<string> {
  try {
    const rawQuery = `${adres}, ${plaats}`;
    console.log(`Searching PDOK v3.1 for: ${rawQuery}`);
    const suggestUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(rawQuery)}&rows=1`;
    const suggestRes = await fetch(suggestUrl);
    const suggestData: any = await suggestRes.json();

    if (suggestData && suggestData.response && suggestData.response.docs && suggestData.response.docs.length > 0) {
      const doc = suggestData.response.docs[0];
      const lookupUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?id=${doc.id}`;
      const lookupRes = await fetch(lookupUrl);
      const lookupData: any = await lookupRes.json();
      
      if (lookupData && lookupData.response && lookupData.response.docs && lookupData.response.docs.length > 0) {
        const wijkRaw = lookupData.response.docs[0].wijknaam || 'Onbekend';
        return wijkRaw.replace(/^Wijk \d+ /i, ''); 
      }
    }
  } catch (error) {
    console.error('PDOK Fetch Error:', error);
  }
  return 'Wijk onbekend';
}

// 3. GET APIs
app.get('/api/scans', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij inladen scans' });
  }
});

app.get('/api/matches', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(MATCH_DATA_FILE, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij inladen matches' });
  }
});

// SSE stream endpoint voor real-time match updates
app.get('/api/matches/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Stuur een hartslag elke 25 seconden om de verbinding actief te houden
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) {}
  }, 25000);

  const clientId = Date.now();
  matchSseClients.push({ id: clientId, res });
  console.log(`📡 SSE client verbonden voor matches (id: ${clientId}), totaal: ${matchSseClients.length}`);

  req.on('close', () => {
    clearInterval(heartbeat);
    matchSseClients = matchSseClients.filter(c => c.id !== clientId);
    console.log(`📡 SSE client verbroken (id: ${clientId}), totaal: ${matchSseClients.length}`);
  });
});

// 4. Helper: parseer n8n bullet-tekst naar gestructureerde match objecten
function parseN8nMatches(tekst: string, datum: string): any[] {
  const matches: any[] = [];
  // Splits op dubbele nieuwe regels om de verschillende matches te scheiden
  const blokken = tekst.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

  for (const blok of blokken) {
    const lines = blok.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    // Eerste regel: "Naam — Adres, Stad — match XX%" (of met een - aan het begin)
    // We maken de - aan het begin en het woord 'match' optioneel
    const headerMatch = lines[0].match(/^-?\s*(.+?)\s+—\s+(.+?)\s+—\s+(?:match\s+)?(\d+)%/i);
    if (!headerMatch) {
      console.log('Skipping line (no header match):', lines[0]);
      continue;
    }

    const clientName = headerMatch[1].trim();
    const address    = headerMatch[2].trim();
    const pct        = parseInt(headerMatch[3]);

    // Link zoeken: die kan beginnen met "- Link:" of "Link:"
    const linkLine = lines.find(l => l.toLowerCase().includes('link:'));
    let link = '';
    if (linkLine) {
      const parts = linkLine.split(/link:/i);
      if (parts.length > 1) link = parts[1].trim();
    }

    // Reden = alle overige regels (zonder de header en de link-regel)
    const reasonLines = lines.slice(1).filter(l => !l.toLowerCase().includes('link:'));
    const reason = reasonLines.join(' ').replace(/\s+/g, ' ').trim();

    // Extraheer prijs uit reden als aanwezig (bijv. "Prijs €315.000")
    const prijsMatch = reason.match(/Prijs\s+(€[\d.,]+)/i);
    const prijs = prijsMatch ? prijsMatch[1] : '';

    matches.push({
      id: `n8n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      clientName,
      address,
      matchPercentage: pct,
      reason,
      link,
      makelaar: 'Zie link',
      shortSummary: prijs ? `Vraagprijs: ${prijs}` : 'Zie analyse',
      // Features: probeer de bullets te gebruiken of splits op komma's
      features: reasonLines.map(l => l.replace(/^[-*]\s*/, '').trim()).filter(l => l.length > 3),
      matchCriteria: [],
      datum,
    });
  }

  return matches;
}

// 5. POST Webhooks
app.post('/webhook', async (req, res) => {
  try {
    const house = req.body;
    console.log('--- Nieuwe Scan Webhook ---');
    if (!house.Wijk || house.Wijk === 'Onbekend') {
      house.Wijk = await getOfficialWijk(house.adres, house.Plaats);
    }
    house.status = house.status || house.satus || 'Beschikbaar';
    house.m2 = house.m2 || '--';
    house["m2 perseel"] = house["m2 perseel"] || '--';
    house.Prijs = house.Prijs || 'Prijs op aanvraag';
    house.Makelaar = house.Makelaar || 'Onbekende Makelaar';
    if (!house.Datum) house.Datum = new Date().toLocaleDateString('nl-NL');

    const scans = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const exists = scans.find((s: any) => s.adres === house.adres && s.Plaats === house.Plaats);
    if (!exists) {
      scans.unshift(house);
      fs.writeFileSync(DATA_FILE, JSON.stringify(scans, null, 2));
    }
    res.json({ status: 'success', wijk: house.Wijk });
  } catch (err) {
    res.status(500).json({ status: 'error' });
  }
});

// Handmatig gestructureerde match (zoals eerder)
app.post('/webhook-match', async (req, res) => {
  try {
    const match = req.body;
    console.log('--- Nieuwe Match Webhook ---');
    
    if (match.address && (!match.wijk || match.wijk === 'Onbekend')) {
       const parts = match.address.split(',');
       const adres = parts[0]?.trim();
       const plaats = parts[1]?.trim() || '';
       match.wijk = await getOfficialWijk(adres, plaats);
    }

    const data = JSON.parse(fs.readFileSync(MATCH_DATA_FILE, 'utf-8'));
    data.matches.unshift(match);
    fs.writeFileSync(MATCH_DATA_FILE, JSON.stringify(data, null, 2));
    
    broadcastMatchUpdate(match);
    console.log(`📢 Match broadcast naar ${matchSseClients.length} SSE client(s)`);
    
    res.json({ status: 'success', wijk: match.wijk });
  } catch (err) {
    res.status(500).json({ status: 'error' });
  }
});

// n8n match webhook — ontvangt het raw n8n formaat met tekst-matches
app.post('/webhook-n8n-match', async (req, res) => {
  try {
    const body = req.body;
    console.log('--- n8n Match Webhook ontvangen ---');
    console.log('Body keys:', Object.keys(body));

    const matchTekst: string = body.matches || body.output || body.text || '';
    const datum: string = body.datum || new Date().toISOString();

    if (!matchTekst) {
      return res.status(400).json({ status: 'error', message: 'Geen matches tekst gevonden in body' });
    }

    const parsedMatches = parseN8nMatches(matchTekst, datum);
    console.log(`✅ ${parsedMatches.length} matches geparsed uit n8n response`);

    const data = JSON.parse(fs.readFileSync(MATCH_DATA_FILE, 'utf-8'));
    data.matches = data.matches.filter((m: any) => !String(m.id ?? '').startsWith('n8n-') || (m.datum ?? '').slice(0,10) !== datum.slice(0,10));
    data.matches = [...parsedMatches, ...data.matches];
    fs.writeFileSync(MATCH_DATA_FILE, JSON.stringify(data, null, 2));

    parsedMatches.forEach(m => broadcastMatchUpdate(m));
    console.log(`📢 ${parsedMatches.length} matches broadcast naar ${matchSseClients.length} SSE client(s)`);

    res.json({ status: 'success', parsed: parsedMatches.length, matches: parsedMatches });
  } catch (err) {
    console.error('n8n webhook fout:', err);
    res.status(500).json({ status: 'error' });
  }
});

// Poll n8n productie webhook en verwerk de response
const N8N_WEBHOOK_URL = 'https://woonwensmakelaar.app.n8n.cloud/webhook/d20bd156-86c9-40ea-86aa-f92949d207e7match';

app.get('/api/fetch-n8n-matches', async (req, res) => {
  try {
    console.log('📡 Ophalen van n8n matches...');
    const n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'fetch_latest', source: 'WoonWensManager' })
    });

    const n8nBody: any = await n8nRes.json();
    console.log('n8n response status:', n8nRes.status);
    console.log('n8n response keys:', Object.keys(n8nBody));

    const matchTekst: string = n8nBody.matches || n8nBody.output || n8nBody.text || '';
    const datum: string = n8nBody.datum || new Date().toISOString();

    if (!matchTekst) {
      return res.status(200).json({ status: 'no_data', raw: n8nBody, message: 'n8n gaf geen matches tekst terug' });
    }

    const parsedMatches = parseN8nMatches(matchTekst, datum);
    const data = JSON.parse(fs.readFileSync(MATCH_DATA_FILE, 'utf-8'));
    data.matches = data.matches.filter((m: any) => !String(m.id ?? '').startsWith('n8n-') || (m.datum ?? '').slice(0,10) !== datum.slice(0,10));
    data.matches = [...parsedMatches, ...data.matches];
    fs.writeFileSync(MATCH_DATA_FILE, JSON.stringify(data, null, 2));

    parsedMatches.forEach(m => broadcastMatchUpdate(m));
    console.log(`✅ ${parsedMatches.length} n8n matches geïmporteerd en gebroadcast`);

    res.json({ status: 'success', parsed: parsedMatches.length, matches: parsedMatches });
  } catch (err: any) {
    console.error('Fout bij ophalen n8n matches:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 WoonWens Backend draait op http://localhost:${port}`);
  console.log(`📡 Webhook Endpoint: http://localhost:${port}/webhook`);
  console.log(`📡 Match Webhook: http://localhost:${port}/webhook-match`);
  console.log(`📡 Match SSE Stream: http://localhost:${port}/api/matches/stream`);
  console.log(`📦 Data Bestand: ${DATA_FILE}`);
});
