const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class PriceDatabase {
  constructor() {
    this.cards = this.initializeCards();
    this.priceHistory = [];
    this.lastUpdateTime = new Date();
    this.initializeHistoricalData();
  }

  initializeCards() {
    // Fixed set of cards with consistent IDs
    return [
      // Power Nine - Extremely expensive
      { id: '0e2749a9-c857-4b59', name: 'Black Lotus', basePrice: 35000, volatility: 0.15, rarity: 'mythic' },
      { id: '1a3d5f8e-9b2c-7d4e', name: 'Mox Sapphire', basePrice: 8500, volatility: 0.12, rarity: 'mythic' },
      { id: '2b4e6f9d-0c3d-8e5f', name: 'Mox Ruby', basePrice: 8000, volatility: 0.12, rarity: 'mythic' },
      { id: '3c5f7g0e-1d4e-9f6g', name: 'Ancestral Recall', basePrice: 12000, volatility: 0.13, rarity: 'mythic' },
      { id: '4d6g8h1f-2e5f-0g7h', name: 'Time Walk', basePrice: 10000, volatility: 0.13, rarity: 'mythic' },
      
      // Dual Lands - Very expensive
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
      
      // Add more variety
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

  initializeHistoricalData() {
    const sources = ['tcgplayer', 'cardmarket', 'starcitygames', 'coolstuffinc'];
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    // Initialize price tracking for each card-source combination
    this.currentPrices = {};
    this.priceHistory = [];
    
    // Generate historical data points
    const hoursInYear = 365 * 24;
    const dataPointsPerHour = 2; // Average 2 updates per hour per card-source
    
    for (const card of this.cards) {
      for (const source of sources) {
        const key = `${card.id}-${source}`;
        
        // Set initial price with source variance
        const sourceMultiplier = {
          tcgplayer: 1.0,
          cardmarket: 0.95,
          starcitygames: 1.08,
          coolstuffinc: 1.03
        }[source];
        
        let currentPrice = card.basePrice * sourceMultiplier;
        let trend = 0;
        
        // Generate sparse historical data (not every hour has data)
        for (let hour = 0; hour < hoursInYear; hour += Math.floor(Math.random() * 3) + 1) {
          const timestamp = new Date(oneYearAgo.getTime() + hour * 60 * 60 * 1000);
          
          // Skip some data points to create sparseness
          if (Math.random() > 0.7) continue;
          
          // Update price with random walk
          const changePercent = (Math.random() - 0.5) * card.volatility * 0.1;
          currentPrice *= (1 + changePercent);
          
          // Add trend component
          if (Math.random() < 0.05) {
            trend = (Math.random() - 0.5) * 0.02;
          }
          currentPrice *= (1 + trend);
          
          // Mean reversion
          const deviation = (currentPrice - card.basePrice * sourceMultiplier) / (card.basePrice * sourceMultiplier);
          currentPrice -= deviation * 0.01 * currentPrice;
          
          // Ensure price stays positive
          currentPrice = Math.max(0.10, currentPrice);
          
          const pricePoint = {
            id: uuidv4(),
            card_id: card.id,
            card_name: card.name,
            source: source,
            price: Math.round(currentPrice * 100) / 100,
            currency: 'USD',
            timestamp: timestamp.toISOString(),
            volume: Math.floor(Math.random() * 100) + 1
          };
          
          // Add data corruption (5% chance)
          if (Math.random() < 0.05) {
            this.corruptData(pricePoint);
          }
          
          this.priceHistory.push(pricePoint);
        }
        
        // Store current price for latest updates
        this.currentPrices[key] = currentPrice;
      }
    }
    
    // Sort by timestamp
    this.priceHistory.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  corruptData(data) {
    const corruption = Math.random();
    
    if (corruption < 0.2) {
      data.price = null;
    } else if (corruption < 0.3) {
      data.price = -Math.abs(data.price || 0);
    } else if (corruption < 0.4) {
      delete data.card_name;
    } else if (corruption < 0.5) {
      data.id = 'duplicate-' + Math.floor(Math.random() * 100);
    } else if (corruption < 0.6) {
      data.price = (data.price || 0) * 1000;
    } else if (corruption < 0.7) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30));
      data.timestamp = futureDate.toISOString();
    } else if (corruption < 0.8) {
      data.card_id = 'invalid-' + Math.random().toString(36).substring(2, 9);
    } else if (corruption < 0.9) {
      data.volume = 0;
      data.price = (data.price || 0) * 10;
    }
  }

  getLatestPrices(limit = 100) {
    const sources = ['tcgplayer', 'cardmarket', 'starcitygames', 'coolstuffinc'];
    const now = new Date();
    const newPrices = [];
    
    // Generate new price points based on current state
    const numUpdates = Math.min(limit, Math.floor(Math.random() * 20) + 10);
    
    for (let i = 0; i < numUpdates; i++) {
      const card = this.cards[Math.floor(Math.random() * this.cards.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const key = `${card.id}-${source}`;
      
      // Get current price or initialize
      let currentPrice = this.currentPrices[key];
      if (!currentPrice) {
        const sourceMultiplier = {
          tcgplayer: 1.0,
          cardmarket: 0.95,
          starcitygames: 1.08,
          coolstuffinc: 1.03
        }[source];
        currentPrice = card.basePrice * sourceMultiplier;
      }
      
      // Apply small price change
      const changePercent = (Math.random() - 0.5) * card.volatility * 0.02;
      currentPrice *= (1 + changePercent);
      currentPrice = Math.max(0.10, currentPrice);
      
      // Update stored price
      this.currentPrices[key] = currentPrice;
      
      // Create price point with recent timestamp
      const minutesAgo = Math.random() * 60;
      const timestamp = new Date(now.getTime() - minutesAgo * 60 * 1000);
      
      const pricePoint = {
        id: uuidv4(),
        card_id: card.id,
        card_name: card.name,
        source: source,
        price: Math.round(currentPrice * 100) / 100,
        currency: 'USD',
        timestamp: timestamp.toISOString(),
        volume: Math.floor(Math.random() * 100) + 1
      };
      
      // Add data corruption (5% chance)
      if (Math.random() < 0.05) {
        this.corruptData(pricePoint);
      }
      
      newPrices.push(pricePoint);
      this.priceHistory.push(pricePoint);
    }
    
    // Add some recent historical prices to fill the limit
    const recentHistory = this.priceHistory
      .filter(p => {
        const timestamp = new Date(p.timestamp);
        return timestamp > new Date(now.getTime() - 2 * 60 * 60 * 1000); // Last 2 hours
      })
      .slice(-(limit - newPrices.length));
    
    return [...newPrices, ...recentHistory].slice(0, limit);
  }

  getBulkData() {
    // Return the consistent historical data
    return this.priceHistory.slice(0, 50000);
  }
}

// Create singleton instance
const database = new PriceDatabase();

module.exports = database;