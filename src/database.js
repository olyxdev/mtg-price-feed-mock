const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const seedrandom = require('seedrandom');
const { execSync } = require('child_process');

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
    this.loadScryfallCards();
    
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
    // Create cards table with Scryfall fields
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        oracle_id TEXT NOT NULL,
        name TEXT NOT NULL,
        base_price REAL NOT NULL,
        volatility REAL NOT NULL,
        rarity TEXT NOT NULL,
        set_code TEXT,
        set_name TEXT
      )
    `);

    // Create prices table with indexes for performance
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prices (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        oracle_id TEXT NOT NULL,
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
      CREATE INDEX IF NOT EXISTS idx_prices_oracle_id ON prices(oracle_id);
      CREATE INDEX IF NOT EXISTS idx_prices_source ON prices(source);
      CREATE INDEX IF NOT EXISTS idx_prices_card_source ON prices(card_id, source);
      CREATE INDEX IF NOT EXISTS idx_prices_card_timestamp ON prices(card_id, timestamp);
    `);
  }

  loadScryfallCards() {
    // First check if we need to fetch Scryfall data
    const cacheDir = path.join(__dirname, '..', 'cache');
    const selectedFile = path.join(cacheDir, 'selected-cards.json');
    
    if (!fs.existsSync(selectedFile)) {
      console.log('Fetching Scryfall card data...');
      try {
        execSync('node scripts/fetch-scryfall-data.js', { stdio: 'inherit' });
      } catch (error) {
        console.error('Failed to fetch Scryfall data:', error.message);
        console.log('Using fallback card data...');
        this.useFallbackCards();
        return;
      }
    }
    
    // Load the selected cards
    try {
      const selectedCards = JSON.parse(fs.readFileSync(selectedFile, 'utf8'));
      console.log(`Loading ${selectedCards.length} cards from Scryfall data...`);
      
      // Insert cards into database
      const insertCard = this.db.prepare(`
        INSERT OR REPLACE INTO cards (id, oracle_id, name, base_price, volatility, rarity, set_code, set_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertMany = this.db.transaction((cards) => {
        for (const card of cards) {
          // Calculate volatility based on price and rarity
          let volatility = 0.10; // default
          if (card.rarity === 'mythic') volatility = 0.18;
          else if (card.rarity === 'rare') volatility = 0.14;
          else if (card.rarity === 'uncommon') volatility = 0.08;
          else if (card.rarity === 'common') volatility = 0.05;
          
          // Add some variance to volatility based on price
          const priceLog = Math.log10(Math.max(1, card.estimated_price));
          volatility = volatility * (1 + priceLog * 0.05);
          
          insertCard.run(
            card.id,
            card.oracle_id,
            card.name,
            card.estimated_price || 1.0,
            Math.min(0.25, volatility), // Cap at 25% volatility
            card.rarity || 'common',
            card.set || '',
            card.set_name || ''
          );
        }
      });
      
      insertMany(selectedCards);
      console.log(`Loaded ${selectedCards.length} cards into database`);
      
    } catch (error) {
      console.error('Error loading Scryfall cards:', error.message);
      this.useFallbackCards();
    }
  }

  useFallbackCards() {
    // Fallback to a minimal set of cards if Scryfall fetch fails
    const fallbackCards = [
      { id: 'fallback-001', oracle_id: 'fallback-001', name: 'Example Rare Card', base_price: 50, volatility: 0.15, rarity: 'rare' },
      { id: 'fallback-002', oracle_id: 'fallback-002', name: 'Example Common Card', base_price: 1, volatility: 0.05, rarity: 'common' },
      { id: 'fallback-003', oracle_id: 'fallback-003', name: 'Example Mythic Card', base_price: 100, volatility: 0.20, rarity: 'mythic' }
    ];
    
    const insertCard = this.db.prepare(`
      INSERT OR REPLACE INTO cards (id, oracle_id, name, base_price, volatility, rarity, set_code, set_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = this.db.transaction((cards) => {
      for (const card of cards) {
        insertCard.run(
          card.id,
          card.oracle_id,
          card.name,
          card.base_price,
          card.volatility,
          card.rarity,
          'FALLBACK',
          'Fallback Set'
        );
      }
    });
    
    insertMany(fallbackCards);
    console.log('Using fallback cards (Scryfall data unavailable)');
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
      INSERT INTO prices (id, card_id, oracle_id, card_name, source, price, currency, timestamp, volume, is_corrupted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
              card.oracle_id,
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
      SELECT id, card_id, oracle_id, card_name, source, price, currency, timestamp, volume
      FROM prices
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
        oracle_id: card.oracle_id,
        card_name: card.name,
        source: source,
        price: price,
        currency: 'USD',
        timestamp: timestamp.toISOString(),
        volume: Math.floor(rng() * 100) + 1
      });
    }

    // Combine and return
    return [...newPrices, ...recentPrices].slice(0, limit);
  }

  getBulkData(limit = 50000) {
    return this.db.prepare(`
      SELECT id, card_id, oracle_id, card_name, source, price, currency, timestamp, volume
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