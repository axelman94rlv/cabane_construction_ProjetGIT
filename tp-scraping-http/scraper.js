// TP 1 — Web Scraping des codes HTTP en Node.js
// Usage : node scraper.js            (télécharge la page Wikipédia)
//         node scraper.js page.html  (analyse un fichier HTML local, utile hors-ligne)

const https = require('node:https');
const { readFile, writeFile } = require('node:fs/promises');
const { JSDOM } = require('jsdom');

const URL_PAGE = 'https://fr.wikipedia.org/wiki/Liste_des_codes_HTTP';
const FICHIER_SORTIE = 'codes_http.json';

// ---------------------------------------------------------------------------
// Étape 1 : récupérer le HTML avec https.request(), encapsulé dans une Promise
// ---------------------------------------------------------------------------
function telechargerHtml(url) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        // Wikipédia refuse/limite les requêtes sans User-Agent
        'User-Agent': 'TP-Scraper-CodesHTTP/1.0 (Node.js; usage pedagogique)',
        Accept: 'text/html',
      },
    };

    const req = https.request(url, options, (res) => {
      // Une redirection (301/302...) : on suit l'URL indiquée dans "Location"
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); // vide le flux pour libérer la connexion
        resolve(telechargerHtml(new URL(res.headers.location, url)));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`Réponse HTTP inattendue : ${res.statusCode}`));
        return;
      }

      // La réponse est un flux : on accumule les morceaux (Buffer) au fil de l'eau
      const morceaux = [];
      res.on('data', (morceau) => morceaux.push(morceau));
      res.on('end', () => resolve(Buffer.concat(morceaux).toString('utf8')));
      res.on('error', reject);
    });

    // Erreurs réseau (DNS, connexion refusée, TLS...)
    req.on('error', reject);

    // Indispensable : c'est end() qui envoie réellement la requête
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Étape 2 : analyser le DOM avec jsdom
// ---------------------------------------------------------------------------

// Supprime les références Wikipédia ([1], [réf. nécessaire]...) et les espaces superflus
function nettoyer(texte) {
  return texte
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extraireCodes(html) {
  const document = new JSDOM(html).window.document;
  const codes = {};

  // Sur Wikipédia, les références sont dans des <sup class="reference"> : on les retire
  document.querySelectorAll('sup.reference, .mw-editsection').forEach((el) => el.remove());

  // 1) Cas principal : les codes sont rangés dans des tableaux (colonnes Code | Message | ...)
  document.querySelectorAll('table.wikitable tr').forEach((ligne) => {
    const cellules = ligne.querySelectorAll('td, th');
    if (cellules.length < 2) return;

    const code = nettoyer(cellules[0].textContent);
    const message = nettoyer(cellules[1].textContent);
    if (/^\d{3}$/.test(code) && message && !(code in codes)) {
      codes[code] = message;
    }
  });

  // 2) Plan B si la structure change : éléments de liste du type "404 Not Found"
  if (Object.keys(codes).length === 0) {
    document.querySelectorAll('dt, li, h3, h4').forEach((el) => {
      const correspondance = nettoyer(el.textContent).match(/^(\d{3})\s*[:\-–]?\s*(.+)$/);
      if (correspondance && !(correspondance[1] in codes)) {
        codes[correspondance[1]] = correspondance[2];
      }
    });
  }

  return codes;
}

// ---------------------------------------------------------------------------
// Étape 3 : structurer et écrire le JSON
// ---------------------------------------------------------------------------
async function main() {
  const fichierLocal = process.argv[2];
  const html = fichierLocal
    ? await readFile(fichierLocal, 'utf8')
    : await telechargerHtml(URL_PAGE);

  // Vérification que la page est complète
  console.log(`HTML récupéré : ${html.length} caractères, </html> présent : ${html.includes('</html>')}`);

  const codes = extraireCodes(html);

  // Contrôle : on vérifie qu'on a au moins un code par famille 1xx à 5xx
  const familles = ['1', '2', '3', '4', '5'].filter((f) =>
    Object.keys(codes).some((c) => c.startsWith(f)),
  );
  console.log(`${Object.keys(codes).length} codes extraits, familles trouvées : ${familles.map((f) => f + 'xx').join(', ')}`);

  await writeFile(FICHIER_SORTIE, JSON.stringify(codes, null, 2) + '\n', 'utf8');
  console.log(`Fichier ${FICHIER_SORTIE} écrit.`);
}

main().catch((err) => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
