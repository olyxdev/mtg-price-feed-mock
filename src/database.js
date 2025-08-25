const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const seedrandom = require('seedrandom');

class PriceDatabase {
  constructor() {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize database
    const dbPath = path.join(dataDir, 'prices.db');
    this.db = new Database(dbPath);
    
    // Enable WAL mode for better concurrent read performance
    this.db.pragma('journal_mode = WAL');
    
    this.initializeSchema();
    this.initializeCards();
    
    // Check if we need to seed data
    const count = this.db.prepare('SELECT COUNT(*) as count FROM prices').get();
    if (count.count === 0) {
      console.log('Database is empty, seeding with historical data...');
      this.seedHistoricalData();
      console.log('Seeding complete!');
    } else {
      console.log(`Database loaded with ${count.count} price records`);
    }
  }

  initializeSchema() {
    // Create cards table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        base_price REAL NOT NULL,
        volatility REAL NOT NULL,
        rarity TEXT NOT NULL
      )
    `);

    // Create prices table with indexes for performance
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prices (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        card_name TEXT NOT NULL,
        source TEXT NOT NULL,
        price REAL,
        currency TEXT DEFAULT 'USD',
        timestamp TEXT NOT NULL,
        volume INTEGER,
        is_corrupted INTEGER DEFAULT 0,
        FOREIGN KEY (card_id) REFERENCES cards(id)
      )
    `);

    // Create indexes for query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_prices_timestamp ON prices(timestamp);
      CREATE INDEX IF NOT EXISTS idx_prices_card_id ON prices(card_id);
      CREATE INDEX IF NOT EXISTS idx_prices_source ON prices(source);
      CREATE INDEX IF NOT EXISTS idx_prices_card_source ON prices(card_id, source);
      CREATE INDEX IF NOT EXISTS idx_prices_card_timestamp ON prices(card_id, timestamp);
    `);
  }

  initializeCards() {
    const cards = [
      // Power Nine
      { id: '0e2749a9-c857-4b59', name: 'Black Lotus', base_price: 35000, volatility: 0.15, rarity: 'mythic' },
      { id: '1a3d5f8e-9b2c-7d4e', name: 'Mox Sapphire', base_price: 8500, volatility: 0.12, rarity: 'mythic' },
      { id: '2b4e6f9d-0c3d-8e5f', name: 'Mox Ruby', base_price: 8000, volatility: 0.12, rarity: 'mythic' },
      { id: '3c5f7g0e-1d4e-9f6g', name: 'Ancestral Recall', base_price: 12000, volatility: 0.13, rarity: 'mythic' },
      { id: '4d6g8h1f-2e5f-0g7h', name: 'Time Walk', base_price: 10000, volatility: 0.13, rarity: 'mythic' },
      
      // Dual Lands
      { id: '5e7h9i2g-3f6g-1h8i', name: 'Underground Sea', base_price: 4500, volatility: 0.10, rarity: 'rare' },
      { id: '6f8i0j3h-4g7h-2i9j', name: 'Volcanic Island', base_price: 4200, volatility: 0.10, rarity: 'rare' },
      { id: '7g9j1k4i-5h8i-3j0k', name: 'Tropical Island', base_price: 3800, volatility: 0.10, rarity: 'rare' },
      { id: '8h0k2l5j-6i9j-4k1l', name: 'Tundra', base_price: 3500, volatility: 0.09, rarity: 'rare' },
      { id: '9i1l3m6k-7j0k-5l2m', name: 'Bayou', base_price: 3200, volatility: 0.09, rarity: 'rare' },
      
      // Modern Staples
      { id: 'a1b2c3d4-e5f6-g7h8', name: 'Ragavan, Nimble Pilferer', base_price: 75, volatility: 0.15, rarity: 'mythic' },
      { id: 'b2c3d4e5-f6g7-h8i9', name: 'Force of Negation', base_price: 65, volatility: 0.12, rarity: 'rare' },
      { id: 'c3d4e5f6-g7h8-i9j0', name: 'Wrenn and Six', base_price: 85, volatility: 0.14, rarity: 'mythic' },
      { id: 'd4e5f6g7-h8i9-j0k1', name: 'Scalding Tarn', base_price: 95, volatility: 0.10, rarity: 'rare' },
      { id: 'e5f6g7h8-i9j0-k1l2', name: 'Misty Rainforest', base_price: 90, volatility: 0.10, rarity: 'rare' },
      { id: 'f6g7h8i9-j0k1-l2m3', name: 'Liliana of the Veil', base_price: 120, volatility: 0.13, rarity: 'mythic' },
      { id: 'g7h8i9j0-k1l2-m3n4', name: 'Tarmogoyf', base_price: 55, volatility: 0.11, rarity: 'mythic' },
      { id: 'h8i9j0k1-l2m3-n4o5', name: 'Snapcaster Mage', base_price: 65, volatility: 0.11, rarity: 'rare' },
      
      // Standard Cards
      { id: 'i9j0k1l2-m3n4-o5p6', name: 'Sheoldred, the Apocalypse', base_price: 45, volatility: 0.18, rarity: 'mythic' },
      { id: 'j0k1l2m3-n4o5-p6q7', name: 'The One Ring', base_price: 40, volatility: 0.20, rarity: 'mythic' },
      { id: 'k1l2m3n4-o5p6-q7r8', name: 'Orcish Bowmasters', base_price: 35, volatility: 0.17, rarity: 'rare' },
      { id: 'l2m3n4o5-p6q7-r8s9', name: 'Fable of the Mirror-Breaker', base_price: 28, volatility: 0.16, rarity: 'rare' },
      { id: 'm3n4o5p6-q7r8-s9t0', name: 'Ledger Shredder', base_price: 22, volatility: 0.14, rarity: 'rare' },
      { id: 'n4o5p6q7-r8s9-t0u1', name: 'Meathook Massacre', base_price: 25, volatility: 0.15, rarity: 'mythic' },
      { id: 'o5p6q7r8-s9t0-u1v2', name: 'Wandering Emperor', base_price: 20, volatility: 0.14, rarity: 'mythic' },
      { id: 'p6q7r8s9-t0u1-v2w3', name: 'Boseiju, Who Endures', base_price: 30, volatility: 0.13, rarity: 'rare' },
      
      // Commons and Uncommons
      { id: 'q7r8s9t0-u1v2-w3x4', name: 'Lightning Bolt', base_price: 2.50, volatility: 0.08, rarity: 'common' },
      { id: 'r8s9t0u1-v2w3-x4y5', name: 'Brainstorm', base_price: 1.50, volatility: 0.07, rarity: 'common' },
      { id: 's9t0u1v2-w3x4-y5z6', name: 'Counterspell', base_price: 1.25, volatility: 0.06, rarity: 'common' },
      { id: 't0u1v2w3-x4y5-z6a7', name: 'Swords to Plowshares', base_price: 3.50, volatility: 0.07, rarity: 'uncommon' },
      { id: 'u1v2w3x4-y5z6-a7b8', name: 'Path to Exile', base_price: 4.00, volatility: 0.08, rarity: 'uncommon' },
      { id: 'v2w3x4y5-z6a7-b8c9', name: 'Fatal Push', base_price: 3.00, volatility: 0.09, rarity: 'uncommon' },
      { id: 'w3x4y5z6-a7b8-c9d0', name: 'Sol Ring', base_price: 2.50, volatility: 0.06, rarity: 'uncommon' },
      { id: 'x4y5z6a7-b8c9-d0e1', name: 'Birds of Paradise', base_price: 8.00, volatility: 0.09, rarity: 'rare' },
      { id: 'y5z6a7b8-c9d0-e1f2', name: 'Noble Hierarch', base_price: 12.00, volatility: 0.10, rarity: 'rare' },
      { id: 'z6a7b8c9-d0e1-f2g3', name: 'Thoughtseize', base_price: 15.00, volatility: 0.10, rarity: 'rare' },
      
      // Additional cards
      { id: 'a7b8c9d0-e1f2-g3h4', name: 'Teferi, Time Raveler', base_price: 18.00, volatility: 0.12, rarity: 'rare' },
      { id: 'b8c9d0e1-f2g3-h4i5', name: 'Ugin, the Spirit Dragon', base_price: 35.00, volatility: 0.14, rarity: 'mythic' },
      { id: 'c9d0e1f2-g3h4-i5j6', name: 'Karn Liberated', base_price: 28.00, volatility: 0.13, rarity: 'mythic' },
      { id: 'd0e1f2g3-h4i5-j6k7', name: 'Wurmcoil Engine', base_price: 22.00, volatility: 0.11, rarity: 'mythic' },
      { id: 'e1f2g3h4-i5j6-k7l8', name: 'Aether Vial', base_price: 5.00, volatility: 0.08, rarity: 'uncommon' },
      { id: 'f2g3h4i5-j6k7-l8m9', name: 'Chalice of the Void', base_price: 45.00, volatility: 0.15, rarity: 'rare' },
      { id: 'g3h4i5j6-k7l8-m9n0', name: 'Mana Crypt', base_price: 180.00, volatility: 0.14, rarity: 'mythic' },
      { id: 'h4i5j6k7-l8m9-n0o1', name: 'Chrome Mox', base_price: 120.00, volatility: 0.13, rarity: 'rare' },
      { id: 'i5j6k7l8-m9n0-o1p2', name: 'Mox Opal', base_price: 95.00, volatility: 0.15, rarity: 'mythic' },
      { id: 'j6k7l8m9-n0o1-p2q3', name: 'Arcbound Ravager', base_price: 25.00, volatility: 0.11, rarity: 'rare' }
    ];

    // Insert cards if they don't exist
    const insertCard = this.db.prepare(`
      INSERT OR IGNORE INTO cards (id, name, base_price, volatility, rarity)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((cards) => {
      for (const card of cards) {
        insertCard.run(card.id, card.name, card.base_price, card.volatility, card.rarity);
      }
    });

    insertMany(cards);
  }

  seedHistoricalData() {
    const sources = ['tcgplayer', 'cardmarket', 'starcitygames', 'coolstuffinc'];
    const sourceMultipliers = {
      tcgplayer: 1.0,
      cardmarket: 0.95,
      starcitygames: 1.08,
      coolstuffinc: 1.03
    };

    const cards = this.db.prepare('SELECT * FROM cards').all();
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    const insertPrice = this.db.prepare(`
      INSERT INTO prices (id, card_id, card_name, source, price, currency, timestamp, volume, is_corrupted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction(() => {
      let totalInserted = 0;
      const targetRecords = 50000;
      const recordsPerCard = Math.ceil(targetRecords / (cards.length * sources.length));
      
      for (const card of cards) {
        for (const source of sources) {
          const basePrice = card.base_price * sourceMultipliers[source];
          let currentPrice = basePrice;
          
          // Generate sparse data points over the year
          for (let i = 0; i < recordsPerCard && totalInserted < targetRecords; i++) {
            // Random timestamp within the year
            const timeOffset = Math.random() * (now.getTime() - oneYearAgo.getTime());
            const timestamp = new Date(oneYearAgo.getTime() + timeOffset);
            
            // Deterministic price based on timestamp
            const seed = `${card.id}-${source}-${Math.floor(timestamp.getTime() / (1000 * 60 * 60))}`;
            const rng = seedrandom(seed);
            
            // Price evolution
            const daysSinceStart = (timestamp.getTime() - oneYearAgo.getTime()) / (1000 * 60 * 60 * 24);
            const trend = Math.sin(daysSinceStart / 30) * 0.1 + Math.sin(daysSinceStart / 7) * 0.05;
            const volatility = (rng() - 0.5) * card.volatility;
            
            currentPrice = basePrice * (1 + trend + volatility);
            currentPrice = Math.max(0.10, currentPrice);
            
            const priceId = crypto.createHash('md5')
              .update(`${card.id}-${source}-${timestamp.toISOString()}-${i}`)
              .digest('hex');
            
            // Determine if this record should be corrupted (5% chance)
            const isCorrupted = rng() < 0.05;
            let price = Math.round(currentPrice * 100) / 100;
            let volume = Math.floor(rng() * 1000) + 1;
            
            if (isCorrupted) {
              const corruptionType = Math.floor(rng() * 5);
              switch (corruptionType) {
                case 0: price = null; break;
                case 1: price = -Math.abs(price); break;
                case 2: price = price * 1000; break;
                case 3: volume = 0; break;
                case 4: price = null; volume = null; break;
              }
            }
            
            insertPrice.run(
              priceId,
              card.id,
              card.name,
              source,
              price,
              'USD',
              timestamp.toISOString(),
              volume,
              isCorrupted ? 1 : 0
            );
            
            totalInserted++;
          }
        }
      }
      
      console.log(`Inserted ${totalInserted} historical price records`);
    });

    insertMany();
  }

  getLatestPrices(limit = 100) {
    // Get recent prices and also generate some new ones
    const recentPrices = this.db.prepare(`
      SELECT * FROM prices
      WHERE timestamp > datetime('now', '-2 hours')
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);

    // Also generate a few new price points to simulate real-time updates
    const cards = this.db.prepare('SELECT * FROM cards ORDER BY RANDOM() LIMIT 10').all();
    const sources = ['tcgplayer', 'cardmarket', 'starcitygames', 'coolstuffinc'];
    const now = new Date();
    const newPrices = [];

    for (const card of cards) {
      const source = sources[Math.floor(Math.random() * sources.length)];
      const timestamp = new Date(now.getTime() - Math.random() * 60 * 60 * 1000); // Within last hour
      
      const seed = `${card.id}-${source}-${Math.floor(timestamp.getTime() / (1000 * 60 * 60))}`;
      const rng = seedrandom(seed);
      
      const sourceMultiplier = {
        tcgplayer: 1.0,
        cardmarket: 0.95,
        starcitygames: 1.08,
        coolstuffinc: 1.03
      }[source];
      
      let price = card.base_price * sourceMultiplier * (1 + (rng() - 0.5) * card.volatility * 0.1);
      price = Math.round(price * 100) / 100;
      
      const priceId = crypto.createHash('md5')
        .update(`${card.id}-${source}-${timestamp.toISOString()}`)
        .digest('hex');
      
      newPrices.push({
        id: priceId,
        card_id: card.id,
        card_name: card.name,
        source: source,
        price: price,
        currency: 'USD',
        timestamp: timestamp.toISOString(),
        volume: Math.floor(rng() * 100) + 1,
        is_corrupted: 0
      });
    }

    // Combine and return
    return [...newPrices, ...recentPrices].slice(0, limit);
  }

  getBulkData(limit = 50000) {
    return this.db.prepare(`
      SELECT id, card_id, card_name, source, price, currency, timestamp, volume
      FROM prices
      ORDER BY timestamp ASC
      LIMIT ?
    `).all(limit);
  }

  close() {
    this.db.close();
  }
}

module.exports = PriceDatabase;