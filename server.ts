import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const app = express();
const port = 3001;
const DATA_FILE = path.join(process.cwd(), 'scans.json');

app.use(cors());
app.use(express.json());

// 1. Initialiseer scans.json met de bestaande data als deze nog niet bestaat
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
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

// 3. GET Scans API
app.get('/api/scans', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij inladen data' });
  }
});

// 4. POST Webhook (Ontvangen van n8n)
app.post('/webhook', async (req, res) => {
  try {
    const house = req.body;
    console.log('--- Nieuwe Webhook Ontvangen ---');
    console.log('Adres:', house.adres);

    // Automatisch de wijk opzoeken als deze ontbreekt
    if (!house.Wijk || house.Wijk === 'Onbekend') {
      house.Wijk = await getOfficialWijk(house.adres, house.Plaats);
    }
    console.log('Gevonden Wijk:', house.Wijk);

    // Datum toevoegen als deze ontbreekt
    if (!house.Datum) {
      house.Datum = new Date().toLocaleDateString('nl-NL');
    }

    // Default velden toevoegen om crashes te voorkomen
    house.status = house.status || house.satus || 'Beschikbaar';
    house.m2 = house.m2 || '--';
    house["m2 perseel"] = house["m2 perseel"] || '--';
    house.Prijs = house.Prijs || 'Prijs op aanvraag';
    house.Makelaar = house.Makelaar || 'Onbekende Makelaar';

    // Bewaren in scans.json
    const scans = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    // Check op dubbelen op basis van Adres + Plaats
    const exists = scans.find((s: any) => s.adres === house.adres && s.Plaats === house.Plaats);
    if (!exists) {
      scans.unshift(house); // Vooraan plaatsen (nieuwste eerst)
      fs.writeFileSync(DATA_FILE, JSON.stringify(scans, null, 2));
      console.log('Success: Huis toegevoegd aan scans.json');
    } else {
      console.log('Skip: Dit huis stond al in de lijst.');
    }

    res.json({ status: 'success', wijk: house.Wijk });
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).json({ status: 'error', message: 'Fout bij verwerken webhook' });
  }
});

app.listen(port, () => {
  console.log(`🚀 WoonWens Backend draait op http://localhost:${port}`);
  console.log(`📡 Webhook Endpoint: http://localhost:${port}/webhook`);
  console.log(`📦 Data Bestand: ${DATA_FILE}`);
});
