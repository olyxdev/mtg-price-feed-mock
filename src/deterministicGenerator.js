const { v4: uuidv4 } = require('uuid');
const seedrandom = require('seedrandom');
const crypto = require('crypto');

class DeterministicGenerator {
  constructor() {
    this.cards = this.initializeCards();
    this.sources = ['tcgplayer', 'cardmarket', 'starcitygames', 'coolstuffinc'];
    this.sourceMultipliers = {
      tcgplayer: 1.0,
      cardmarket: 0.95,
      starcitygames: 1.08,
      coolstuffinc: 1.03
    };
  }

  initializeCards() {
    // Fixed set of cards with consistent IDs
    return [
      // Power Nine
      { id: '0e2749a9-c857-4b59', name: 'Black Lotus', basePrice: 35000, volatility: 0.15, rarity: 'mythic' },
      { id: '1a3d5f8e-9b2c-7d4e', name: 'Mox Sapphire', basePrice: 8500, volatility: 0.12, rarity: 'mythic' },
      { id: '2b4e6f9d-0c3d-8e5f', name: 'Mox Ruby', basePrice: 8000, volatility: 0.12, rarity: 'mythic' },
      { id: '3c5f7g0e-1d4e-9f6g', name: 'Ancestral Recall', basePrice: 12000, volatility: 0.13, rarity: 'mythic' },
      { id: '4d6g8h1f-2e5f-0g7h', name: 'Time Walk', basePrice: 10000, volatility: 0.13, rarity: 'mythic' },
      
      // Dual Lands
      { id: '5e7h9i2g-3f6g-1h8i', name: 'Underground Sea', basePrice: 4500, volatility: 0.10, rarity: 'rare' },
      { id: '6f8i0j3h-4g7h-2i9j', name: 'Volcanic Island', basePrice: 4200, volatility: 0.10, rarity: 'rare' },
      { id: '7g9j1k4i-5h8i-3j0k', name: 'Tropical Island', basePrice: 3800, volatility: 0.10, rarity: 'rare' },
      { id: '8h0k2l5j-6i9j-4k1l', name: 'Tundra', basePrice: 3500, volatility: 0.09, rarity: 'rare' },
      { id: '9i1l3m6k-7j0k-5l2m', name: 'Bayou', basePrice: 3200, volatility: 0.09, rarity: 'rare' },
      
      // Modern Staples
      { id: 'a1b2c3d4-e5f6-g7h8', name: 'Ragavan, Nimble Pilferer', basePrice: 75, volatility: 0.15, rarity: 'mythic' },
      { id: 'b2c3d4e5-f6g7-h8i9', name: 'Force of Negation', basePrice: 65, volatility: 0.12, rarity: 'rare' },
      { id: 'c3d4e5f6-g7h8-i9j0', name: 'Wrenn and Six', basePrice: 85, volatility: 0.14, rarity: 'mythic' },
      { id: 'd4e5f6g7-h8i9-j0k1', name: 'Scalding Tarn', basePrice: 95, volatility: 0.10, rarity: 'rare' },
      { id: 'e5f6g7h8-i9j0-k1l2', name: 'Misty Rainforest', basePrice: 90, volatility: 0.10, rarity: 'rare' },
      { id: 'f6g7h8i9-j0k1-l2m3', name: 'Liliana of the Veil', basePrice: 120, volatility: 0.13, rarity: 'mythic' },
      { id: 'g7h8i9j0-k1l2-m3n4', name: 'Tarmogoyf', basePrice: 55, volatility: 0.11, rarity: 'mythic' },
      { id: 'h8i9j0k1-l2m3-n4o5', name: 'Snapcaster Mage', basePrice: 65, volatility: 0.11, rarity: 'rare' },
      
      // Standard Cards
      { id: 'i9j0k1l2-m3n4-o5p6', name: 'Sheoldred, the Apocalypse', basePrice: 45, volatility: 0.18, rarity: 'mythic' },
      { id: 'j0k1l2m3-n4o5-p6q7', name: 'The One Ring', basePrice: 40, volatility: 0.20, rarity: 'mythic' },
      { id: 'k1l2m3n4-o5p6-q7r8', name: 'Orcish Bowmasters', basePrice: 35, volatility: 0.17, rarity: 'rare' },
      { id: 'l2m3n4o5-p6q7-r8s9', name: 'Fable of the Mirror-Breaker', basePrice: 28, volatility: 0.16, rarity: 'rare' },
      { id: 'm3n4o5p6-q7r8-s9t0', name: 'Ledger Shredder', basePrice: 22, volatility: 0.14, rarity: 'rare' },
      { id: 'n4o5p6q7-r8s9-t0u1', name: 'Meathook Massacre', basePrice: 25, volatility: 0.15, rarity: 'mythic' },
      { id: 'o5p6q7r8-s9t0-u1v2', name: 'Wandering Emperor', basePrice: 20, volatility: 0.14, rarity: 'mythic' },
      { id: 'p6q7r8s9-t0u1-v2w3', name: 'Boseiju, Who Endures', basePrice: 30, volatility: 0.13, rarity: 'rare' },
      
      // Commons and Uncommons
      { id: 'q7r8s9t0-u1v2-w3x4', name: 'Lightning Bolt', basePrice: 2.50, volatility: 0.08, rarity: 'common' },
      { id: 'r8s9t0u1-v2w3-x4y5', name: 'Brainstorm', basePrice: 1.50, volatility: 0.07, rarity: 'common' },
      { id: 's9t0u1v2-w3x4-y5z6', name: 'Counterspell', basePrice: 1.25, volatility: 0.06, rarity: 'common' },
      { id: 't0u1v2w3-x4y5-z6a7', name: 'Swords to Plowshares', basePrice: 3.50, volatility: 0.07, rarity: 'uncommon' },
      { id: 'u1v2w3x4-y5z6-a7b8', name: 'Path to Exile', basePrice: 4.00, volatility: 0.08, rarity: 'uncommon' },
      { id: 'v2w3x4y5-z6a7-b8c9', name: 'Fatal Push', basePrice: 3.00, volatility: 0.09, rarity: 'uncommon' },
      { id: 'w3x4y5z6-a7b8-c9d0', name: 'Sol Ring', basePrice: 2.50, volatility: 0.06, rarity: 'uncommon' },
      { id: 'x4y5z6a7-b8c9-d0e1', name: 'Birds of Paradise', basePrice: 8.00, volatility: 0.09, rarity: 'rare' },
      { id: 'y5z6a7b8-c9d0-e1f2', name: 'Noble Hierarch', basePrice: 12.00, volatility: 0.10, rarity: 'rare' },
      { id: 'z6a7b8c9-d0e1-f2g3', name: 'Thoughtseize', basePrice: 15.00, volatility: 0.10, rarity: 'rare' },
      
      // Additional cards
      { id: 'a7b8c9d0-e1f2-g3h4', name: 'Teferi, Time Raveler', basePrice: 18.00, volatility: 0.12, rarity: 'rare' },
      { id: 'b8c9d0e1-f2g3-h4i5', name: 'Ugin, the Spirit Dragon', basePrice: 35.00, volatility: 0.14, rarity: 'mythic' },
      { id: 'c9d0e1f2-g3h4-i5j6', name: 'Karn Liberated', basePrice: 28.00, volatility: 0.13, rarity: 'mythic' },
      { id: 'd0e1f2g3-h4i5-j6k7', name: 'Wurmcoil Engine', basePrice: 22.00, volatility: 0.11, rarity: 'mythic' },
      { id: 'e1f2g3h4-i5j6-k7l8', name: 'Aether Vial', basePrice: 5.00, volatility: 0.08, rarity: 'uncommon' },
      { id: 'f2g3h4i5-j6k7-l8m9', name: 'Chalice of the Void', basePrice: 45.00, volatility: 0.15, rarity: 'rare' },
      { id: 'g3h4i5j6-k7l8-m9n0', name: 'Mana Crypt', basePrice: 180.00, volatility: 0.14, rarity: 'mythic' },
      { id: 'h4i5j6k7-l8m9-n0o1', name: 'Chrome Mox', basePrice: 120.00, volatility: 0.13, rarity: 'rare' },
      { id: 'i5j6k7l8-m9n0-o1p2', name: 'Mox Opal', basePrice: 95.00, volatility: 0.15, rarity: 'mythic' },
      { id: 'j6k7l8m9-n0o1-p2q3', name: 'Arcbound Ravager', basePrice: 25.00, volatility: 0.11, rarity: 'rare' }
    ];
  }

  // Generate a deterministic price for a card at a specific timestamp
  generatePriceAtTime(card, source, timestamp) {
    // Create a deterministic seed from card ID, source, and timestamp
    const timeSeed = Math.floor(timestamp.getTime() / (1000 * 60 * 60)); // Hour precision
    const seed = `${card.id}-${source}-${timeSeed}`;
    const rng = seedrandom(seed);
    
    // Calculate base price with source multiplier
    const sourceMultiplier = this.sourceMultipliers[source];
    let price = card.basePrice * sourceMultiplier;
    
    // Add time-based evolution (sinusoidal pattern with noise)
    const daysSinceEpoch = timestamp.getTime() / (1000 * 60 * 60 * 24);
    const longTermTrend = Math.sin(daysSinceEpoch / 30) * 0.1; // 30-day cycle
    const shortTermTrend = Math.sin(daysSinceEpoch / 7) * 0.05; // 7-day cycle
    
    // Add volatility-based random walk
    const randomWalk = (rng() - 0.5) * card.volatility;
    
    // Combine all factors
    price = price * (1 + longTermTrend + shortTermTrend + randomWalk);
    
    // Ensure price stays positive
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
    
    return data;
  }

  generateLatestPrices(limit = 100) {
    const now = new Date();
    const prices = [];
    
    // Generate recent price updates
    for (let i = 0; i < limit; i++) {
      // Use deterministic selection based on current time and index
      const seed = `latest-${now.getTime()}-${i}`;
      const rng = seedrandom(seed);
      
      const card = this.cards[Math.floor(rng() * this.cards.length)];
      const source = this.sources[Math.floor(rng() * this.sources.length)];
      
      // Generate timestamp within last 2 hours
      const minutesAgo = rng() * 120;
      const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000);
      
      const priceId = crypto.createHash('md5')
        .update(`${card.id}-${source}-${timestamp.toISOString()}`)
        .digest('hex');
      
      const pricePoint = {
        id: priceId,
        card_id: card.id,
        card_name: card.name,
        source: source,
        price: this.generatePriceAtTime(card, source, timestamp),
        currency: 'USD',
        timestamp: timestamp.toISOString(),
        volume: Math.floor(rng() * 100) + 1
      };
      
      // 5% chance of corruption, deterministic based on ID
      const corruptRng = seedrandom(priceId);
      if (corruptRng() < 0.05) {
        this.corruptData(pricePoint);
      }
      
      prices.push(pricePoint);
    }
    
    return prices.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  *generateBulkData(count = 50000) {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const timeRange = now.getTime() - oneYearAgo.getTime();
    
    // Generate data points deterministically
    for (let i = 0; i < count; i++) {
      // Use deterministic selection based on index
      const seed = `bulk-${i}`;
      const rng = seedrandom(seed);
      
      const card = this.cards[Math.floor(rng() * this.cards.length)];
      const source = this.sources[Math.floor(rng() * this.sources.length)];
      
      // Distribute timestamps across the year
      const timeOffset = (i / count) * timeRange + (rng() * 60 * 60 * 1000); // Add some jitter
      const timestamp = new Date(oneYearAgo.getTime() + timeOffset);
      
      const priceId = crypto.createHash('md5')
        .update(`${card.id}-${source}-${timestamp.toISOString()}-${i}`)
        .digest('hex');
      
      const pricePoint = {
        id: priceId,
        card_id: card.id,
        card_name: card.name,
        source: source,
        price: this.generatePriceAtTime(card, source, timestamp),
        currency: 'USD',
        timestamp: timestamp.toISOString(),
        volume: Math.floor(rng() * 1000) + 1
      };
      
      // 5% chance of corruption, deterministic based on ID
      const corruptRng = seedrandom(priceId);
      if (corruptRng() < 0.05) {
        this.corruptData(pricePoint);
      }
      
      yield pricePoint;
    }
  }
}

module.exports = DeterministicGenerator;