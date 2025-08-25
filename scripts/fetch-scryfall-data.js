const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Fetches Scryfall bulk data and extracts popular cards for price simulation
 */

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'MTG-Price-Feed-Mock/1.0',
        'Accept': 'application/json'
      }
    };
    
    https.get(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          console.error('Failed to parse JSON:', data.substring(0, 200));
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'MTG-Price-Feed-Mock/1.0',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip'
      }
    };
    
    https.get(options, (response) => {
      // Handle gzip encoding
      if (response.headers['content-encoding'] === 'gzip') {
        const gunzip = zlib.createGunzip();
        response.pipe(gunzip).pipe(file);
      } else {
        response.pipe(file);
      }
      
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('Fetching Scryfall bulk data information...');
  
  // Get bulk data endpoints  
  const bulkDataResponse = await fetchJSON('https://api.scryfall.com/bulk-data');
  console.log('Response keys:', Object.keys(bulkDataResponse));
  
  // The response is actually an array directly, not wrapped in data
  const bulkDataArray = Array.isArray(bulkDataResponse) ? bulkDataResponse : bulkDataResponse.data;
  
  if (!Array.isArray(bulkDataArray)) {
    console.error('Unexpected response:', JSON.stringify(bulkDataResponse).substring(0, 500));
    throw new Error('Unexpected bulk data response format');
  }
  
  const oracleCards = bulkDataArray.find(d => d.type === 'oracle_cards');
  
  if (!oracleCards) {
    throw new Error('Could not find oracle cards bulk data');
  }
  
  console.log(`Oracle cards file: ${oracleCards.size} bytes`);
  console.log(`Download URL: ${oracleCards.download_uri}`);
  
  // Create cache directory
  const cacheDir = path.join(__dirname, '..', 'cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  const jsonFile = path.join(cacheDir, 'oracle-cards.json');
  const selectedFile = path.join(cacheDir, 'selected-cards.json');
  
  // Check if we already have recent data
  if (fs.existsSync(selectedFile)) {
    const stats = fs.statSync(selectedFile);
    const hoursSinceUpdate = (Date.now() - stats.mtime) / (1000 * 60 * 60);
    if (hoursSinceUpdate < 24) {
      console.log('Using cached Scryfall data (less than 24 hours old)');
      return;
    }
  }
  
  console.log('Downloading oracle cards (this may take a minute)...');
  await downloadFile(oracleCards.download_uri, jsonFile);
  
  console.log('Parsing cards...');
  const allCards = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  
  console.log(`Total cards in Scryfall: ${allCards.length}`);
  
  // Filter to get interesting cards for our price feed
  // We want cards that are:
  // 1. Legal in at least one format
  // 2. Not tokens, emblems, or other special cards
  // 3. Have USD prices (so we know they're tradeable)
  
  const selectedCards = allCards.filter(card => {
    // Skip special card types
    if (card.layout === 'token' || card.layout === 'emblem' || 
        card.layout === 'planar' || card.layout === 'scheme' ||
        card.layout === 'vanguard' || card.set_type === 'funny') {
      return false;
    }
    
    // Must be legal in at least one format
    const legalities = card.legalities || {};
    const hasLegalFormat = Object.values(legalities).some(l => l === 'legal');
    if (!hasLegalFormat) return false;
    
    // Must have some price data
    const prices = card.prices || {};
    const hasPrice = prices.usd || prices.usd_foil;
    if (!hasPrice) return false;
    
    return true;
  });
  
  console.log(`Cards with prices and legal in formats: ${selectedCards.length}`);
  
  // Sort by popularity/value and take a diverse set
  // We'll use a combination of EDHREC rank (popularity) and price
  const scoredCards = selectedCards.map(card => {
    const prices = card.prices || {};
    const price = parseFloat(prices.usd) || 0;
    const edhrecRank = card.edhrec_rank || 100000;
    
    // Lower EDHREC rank = more popular
    // Higher price = more valuable
    // We want both popular and valuable cards
    const popularityScore = 100000 - edhrecRank;
    const valueScore = Math.log(Math.max(1, price)) * 10000;
    
    return {
      ...card,
      score: popularityScore + valueScore,
      estimated_price: price
    };
  }).sort((a, b) => b.score - a.score);
  
  // Take top cards by score, ensuring variety
  const finalCards = [];
  const rarityQuotas = {
    'mythic': 20,
    'rare': 100,
    'uncommon': 50,
    'common': 30
  };
  
  const rarityCounts = {
    'mythic': 0,
    'rare': 0,
    'uncommon': 0,
    'common': 0
  };
  
  for (const card of scoredCards) {
    const rarity = card.rarity || 'common';
    if (rarityCounts[rarity] < (rarityQuotas[rarity] || 0)) {
      finalCards.push({
        id: card.id,                    // Scryfall ID
        oracle_id: card.oracle_id,      // Oracle ID (same card across sets)
        name: card.name,
        mana_cost: card.mana_cost,
        type_line: card.type_line,
        oracle_text: card.oracle_text,
        rarity: card.rarity,
        set: card.set,
        set_name: card.set_name,
        collector_number: card.collector_number,
        prices: card.prices,
        estimated_price: card.estimated_price,
        edhrec_rank: card.edhrec_rank,
        color_identity: card.color_identity,
        legalities: card.legalities
      });
      rarityCounts[rarity]++;
      
      if (finalCards.length >= 200) break;
    }
  }
  
  // Add some random cards to ensure variety
  const randomCards = selectedCards
    .filter(c => !finalCards.find(f => f.id === c.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, 50)
    .map(card => ({
      id: card.id,
      oracle_id: card.oracle_id,
      name: card.name,
      mana_cost: card.mana_cost,
      type_line: card.type_line,
      oracle_text: card.oracle_text,
      rarity: card.rarity,
      set: card.set,
      set_name: card.set_name,
      collector_number: card.collector_number,
      prices: card.prices,
      estimated_price: parseFloat(card.prices?.usd) || 1,
      edhrec_rank: card.edhrec_rank,
      color_identity: card.color_identity,
      legalities: card.legalities
    }));
  
  const allSelected = [...finalCards, ...randomCards];
  
  console.log(`\nSelected ${allSelected.length} cards for price simulation:`);
  console.log(`- Mythics: ${allSelected.filter(c => c.rarity === 'mythic').length}`);
  console.log(`- Rares: ${allSelected.filter(c => c.rarity === 'rare').length}`);
  console.log(`- Uncommons: ${allSelected.filter(c => c.rarity === 'uncommon').length}`);
  console.log(`- Commons: ${allSelected.filter(c => c.rarity === 'common').length}`);
  
  // Save selected cards
  fs.writeFileSync(selectedFile, JSON.stringify(allSelected, null, 2));
  console.log(`\nSaved selected cards to ${selectedFile}`);
  
  // Clean up large file
  fs.unlinkSync(jsonFile);
  console.log('Cleaned up temporary file');
  
  // Show some examples
  console.log('\nExample cards selected:');
  allSelected.slice(0, 10).forEach(card => {
    console.log(`- ${card.name} (${card.set}) - $${card.estimated_price}`);
  });
}

main().catch(console.error);