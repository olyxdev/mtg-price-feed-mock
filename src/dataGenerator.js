const { v4: uuidv4 } = require('uuid');
const seedrandom = require('seedrandom');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class DataGenerator {
  constructor() {
    this.cards = [];
    this.sources = ['tcgplayer', 'cardmarket', 'starcitygames', 'coolstuffinc'];
    this.sourceMultipliers = {
      tcgplayer: 1.0,
      cardmarket: 0.95,
      starcitygames: 1.08,
      coolstuffinc: 1.03
    };
    
    this.loadScryfallCards();
  }

  loadScryfallCards() {
    const cacheDir = path.join(__dirname, '..', 'cache');
    const selectedFile = path.join(cacheDir, 'selected-cards.json');
    
    // Check if we have cached Scryfall data
    if (fs.existsSync(selectedFile)) {
      try {
        const selectedCards = JSON.parse(fs.readFileSync(selectedFile, 'utf8'));
        console.log(`Loaded ${selectedCards.length} cards from Scryfall cache`);
        
        this.cards = selectedCards.map(card => ({
          id: card.id,
          oracle_id: card.oracle_id,
          name: card.name,
          basePrice: card.estimated_price || 1.0,
          volatility: this.calculateVolatility(card.rarity, card.estimated_price),
          rarity: card.rarity || 'common',
          set: card.set || '',
          set_name: card.set_name || ''
        }));
        
        return;
      } catch (error) {
        console.error('Error loading Scryfall cache:', error.message);
      }
    }
    
    // Fallback to minimal cards if no cache
    console.log('Using fallback cards (run scripts/fetch-scryfall-data.js to get real cards)');
    this.cards = [
      { id: 'fallback-001', oracle_id: 'fallback-001', name: 'Example Rare Card', basePrice: 50, volatility: 0.15, rarity: 'rare' },
      { id: 'fallback-002', oracle_id: 'fallback-002', name: 'Example Common Card', basePrice: 1, volatility: 0.05, rarity: 'common' },
      { id: 'fallback-003', oracle_id: 'fallback-003', name: 'Example Mythic Card', basePrice: 100, volatility: 0.20, rarity: 'mythic' },
      { id: 'fallback-004', oracle_id: 'fallback-004', name: 'Example Uncommon Card', basePrice: 5, volatility: 0.08, rarity: 'uncommon' },
      { id: 'fallback-005', oracle_id: 'fallback-005', name: 'Example Expensive Card', basePrice: 500, volatility: 0.18, rarity: 'mythic' }
    ];
  }

  calculateVolatility(rarity, price) {
    let volatility = 0.10; // default
    
    if (rarity === 'mythic') volatility = 0.18;
    else if (rarity === 'rare') volatility = 0.14;
    else if (rarity === 'uncommon') volatility = 0.08;
    else if (rarity === 'common') volatility = 0.05;
    
    // Add variance based on price
    const priceLog = Math.log10(Math.max(1, price));
    volatility = volatility * (1 + priceLog * 0.05);
    
    return Math.min(0.25, volatility); // Cap at 25%
  }

  // Generate deterministic price at a specific time
  generatePriceAtTime(card, source, timestamp) {
    const hoursSinceEpoch = Math.floor(timestamp.getTime() / (1000 * 60 * 60));
    const seed = `${card.id}-${source}-${hoursSinceEpoch}`;
    const rng = seedrandom(seed);
    
    const sourceMultiplier = this.sourceMultipliers[source];
    let price = card.basePrice * sourceMultiplier;
    
    // Time-based evolution
    const daysSinceEpoch = timestamp.getTime() / (1000 * 60 * 60 * 24);
    const longTermTrend = Math.sin(daysSinceEpoch / 30) * 0.1;
    const shortTermTrend = Math.sin(daysSinceEpoch / 7) * 0.05;
    
    // Random walk
    const randomWalk = (rng() - 0.5) * card.volatility;
    
    // Combine factors
    price = price * (1 + longTermTrend + shortTermTrend + randomWalk);
    price = Math.max(0.10, price);
    
    return Math.round(price * 100) / 100;
  }

  corruptData(data) {
    const rng = seedrandom(data.id);
    const corruption = rng();
    
    if (corruption < 0.2) {
      data.price = null;
    } else if (corruption < 0.3) {
      data.price = -Math.abs(data.price || 0);
    } else if (corruption < 0.4) {
      delete data.card_name;
    } else if (corruption < 0.5) {
      data.id = 'duplicate-' + Math.floor(rng() * 100);
    } else if (corruption < 0.6) {
      data.price = (data.price || 0) * 1000;
    } else if (corruption < 0.7) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(rng() * 30));
      data.timestamp = futureDate.toISOString();
    } else if (corruption < 0.8) {
      data.card_id = 'invalid-' + rng().toString(36).substring(2, 9);
    } else if (corruption < 0.9) {
      data.volume = 0;
      data.price = (data.price || 0) * 10;
    }
  }

  generateLatestPrices(limit = 100) {
    const now = new Date();
    const prices = [];
    
    // Generate price points with recent timestamps
    for (let i = 0; i < limit; i++) {
      // Deterministic selection based on current time
      const seed = `latest-${now.getTime()}-${i}`;
      const rng = seedrandom(seed);
      
      const card = this.cards[Math.floor(rng() * this.cards.length)];
      const source = this.sources[Math.floor(rng() * this.sources.length)];
      
      // Recent timestamp (within last 2 hours)
      const minutesAgo = rng() * 120;
      const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000);
      
      const priceId = crypto.createHash('md5')
        .update(`${card.id}-${source}-${timestamp.toISOString()}`)
        .digest('hex');
      
      const pricePoint = {
        id: priceId,
        card_id: card.id,
        oracle_id: card.oracle_id,
        card_name: card.name,
        source: source,
        price: this.generatePriceAtTime(card, source, timestamp),
        currency: 'USD',
        timestamp: timestamp.toISOString(),
        volume: Math.floor(rng() * 100) + 1
      };
      
      // 5% corruption chance
      const corruptRng = seedrandom(priceId);
      if (corruptRng() < 0.05) {
        this.corruptData(pricePoint);
      }
      
      prices.push(pricePoint);
    }
    
    return prices.sort((a, b) => 
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );
  }

  *generateBulkData(count = 50000) {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const timeRange = now.getTime() - oneYearAgo.getTime();
    
    for (let i = 0; i < count; i++) {
      // Deterministic selection
      const seed = `bulk-${i}`;
      const rng = seedrandom(seed);
      
      const card = this.cards[Math.floor(rng() * this.cards.length)];
      const source = this.sources[Math.floor(rng() * this.sources.length)];
      
      // Distribute across the year
      const timeOffset = (i / count) * timeRange + (rng() * 60 * 60 * 1000);
      const timestamp = new Date(oneYearAgo.getTime() + timeOffset);
      
      const priceId = crypto.createHash('md5')
        .update(`${card.id}-${source}-${timestamp.toISOString()}-${i}`)
        .digest('hex');
      
      const pricePoint = {
        id: priceId,
        card_id: card.id,
        oracle_id: card.oracle_id,
        card_name: card.name,
        source: source,
        price: this.generatePriceAtTime(card, source, timestamp),
        currency: 'USD',
        timestamp: timestamp.toISOString(),
        volume: Math.floor(rng() * 1000) + 1
      };
      
      // 5% corruption
      const corruptRng = seedrandom(priceId);
      if (corruptRng() < 0.05) {
        this.corruptData(pricePoint);
      }
      
      yield pricePoint;
    }
  }
}

module.exports = DataGenerator;