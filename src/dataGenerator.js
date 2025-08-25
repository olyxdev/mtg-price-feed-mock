const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');
const seedrandom = require('seedrandom');

// MTG-themed word combinations for card names
const MTG_PREFIXES = [
  'Lightning', 'Thunder', 'Shadow', 'Mystic', 'Ancient', 'Eternal', 'Crimson',
  'Azure', 'Verdant', 'Golden', 'Silver', 'Dark', 'Light', 'Primal', 'Arcane',
  'Savage', 'Noble', 'Fallen', 'Rising', 'Forgotten', 'Lost', 'Hidden', 'Forbidden',
  'Sacred', 'Cursed', 'Blessed', 'Burning', 'Frozen', 'Storm', 'Wind', 'Fire',
  'Water', 'Earth', 'Death', 'Life', 'Mind', 'Soul', 'Spirit', 'Dream', 'Nightmare',
  'Chaos', 'Order', 'Balance', 'Void', 'Aether', 'Nether', 'Celestial', 'Infernal',
  'Eldrazi', 'Phyrexian', 'Mirran', 'Dominarian', 'Ravnican', 'Innistrad'
];

const MTG_SUFFIXES = [
  'Bolt', 'Strike', 'Blade', 'Shield', 'Armor', 'Helm', 'Crown', 'Scepter',
  'Orb', 'Crystal', 'Stone', 'Gem', 'Amulet', 'Ring', 'Staff', 'Wand',
  'Dragon', 'Phoenix', 'Angel', 'Demon', 'Elemental', 'Beast', 'Warrior',
  'Wizard', 'Cleric', 'Rogue', 'Knight', 'Assassin', 'Berserker', 'Shaman',
  'Druid', 'Necromancer', 'Pyromancer', 'Hydromancer', 'Geomancer', 'Aeromancer',
  'Lotus', 'Mox', 'Signet', 'Talisman', 'Medallion', 'Banner', 'Obelisk',
  'Monolith', 'Vault', 'Citadel', 'Fortress', 'Tower', 'Gate', 'Bridge',
  'Ritual', 'Invocation', 'Incantation', 'Enchantment', 'Hex', 'Curse', 'Blessing',
  'Pact', 'Vow', 'Oath', 'Promise', 'Covenant', 'Treaty', 'Alliance'
];

const MTG_MIDDLE_WORDS = [
  'of', 'the', 'of the', 'and', 'and the', 'from', 'from the', 'in', 'in the',
  'at', 'at the', 'on', 'on the', 'with', 'with the', 'for', 'for the'
];

const SOURCES = ['tcgplayer', 'cardmarket', 'starcitygames', 'coolstuffinc'];

const RARITIES = [
  { name: 'common', weight: 50, priceRange: [0.25, 5] },
  { name: 'uncommon', weight: 30, priceRange: [1, 15] },
  { name: 'rare', weight: 15, priceRange: [5, 200] },
  { name: 'mythic', weight: 5, priceRange: [20, 35000] }
];

class DataGenerator {
  constructor(seed = 'mtg-price-feed') {
    this.rng = seedrandom(seed);
    this.cards = this.generateCardPool();
    this.priceHistory = new Map();
  }

  generateCardPool(count = 1000) {
    const cards = [];
    const usedNames = new Set();
    
    // Add some famous real cards
    const famousCards = [
      { name: 'Black Lotus', rarity: 'mythic', basePrice: 35000, volatility: 0.15 },
      { name: 'Mox Sapphire', rarity: 'mythic', basePrice: 8500, volatility: 0.12 },
      { name: 'Underground Sea', rarity: 'rare', basePrice: 4500, volatility: 0.10 },
      { name: 'Volcanic Island', rarity: 'rare', basePrice: 4200, volatility: 0.10 },
      { name: 'Force of Will', rarity: 'rare', basePrice: 120, volatility: 0.11 },
      { name: 'Lightning Bolt', rarity: 'common', basePrice: 2.50, volatility: 0.08 },
      { name: 'Sol Ring', rarity: 'uncommon', basePrice: 2.50, volatility: 0.06 },
      { name: 'Ragavan, Nimble Pilferer', rarity: 'mythic', basePrice: 75, volatility: 0.15 },
      { name: 'Sheoldred, the Apocalypse', rarity: 'mythic', basePrice: 45, volatility: 0.18 },
      { name: 'The One Ring', rarity: 'mythic', basePrice: 40, volatility: 0.20 }
    ];

    famousCards.forEach(card => {
      cards.push({
        id: uuidv4().substring(0, 12),
        ...card
      });
      usedNames.add(card.name);
    });

    // Generate remaining cards procedurally
    while (cards.length < count) {
      const name = this.generateCardName(usedNames);
      if (!name) continue;
      
      const rarity = this.selectRarity();
      const { basePrice, volatility } = this.generatePriceForRarity(rarity);
      
      cards.push({
        id: uuidv4().substring(0, 12),
        name,
        rarity,
        basePrice,
        volatility
      });
      
      usedNames.add(name);
    }

    return cards;
  }

  generateCardName(usedNames) {
    let attempts = 0;
    while (attempts < 100) {
      const useMiddle = this.rng() > 0.6;
      const prefix = MTG_PREFIXES[Math.floor(this.rng() * MTG_PREFIXES.length)];
      const suffix = MTG_SUFFIXES[Math.floor(this.rng() * MTG_SUFFIXES.length)];
      
      let name;
      if (useMiddle) {
        const middle = MTG_MIDDLE_WORDS[Math.floor(this.rng() * MTG_MIDDLE_WORDS.length)];
        name = `${prefix} ${middle} ${suffix}`;
      } else {
        name = `${prefix} ${suffix}`;
      }
      
      if (!usedNames.has(name)) {
        return name;
      }
      attempts++;
    }
    return null;
  }

  selectRarity() {
    const totalWeight = RARITIES.reduce((sum, r) => sum + r.weight, 0);
    let random = this.rng() * totalWeight;
    
    for (const rarity of RARITIES) {
      random -= rarity.weight;
      if (random <= 0) {
        return rarity.name;
      }
    }
    return 'common';
  }

  generatePriceForRarity(rarity) {
    const rarityConfig = RARITIES.find(r => r.name === rarity);
    const [min, max] = rarityConfig.priceRange;
    
    // Use log scale for more realistic price distribution
    const logMin = Math.log(min);
    const logMax = Math.log(max);
    const logPrice = logMin + this.rng() * (logMax - logMin);
    const basePrice = Math.exp(logPrice);
    
    // Higher rarity = higher volatility
    const volatilityBase = {
      common: 0.05,
      uncommon: 0.08,
      rare: 0.12,
      mythic: 0.18
    };
    
    const volatility = volatilityBase[rarity] + (this.rng() * 0.05 - 0.025);
    
    return {
      basePrice: Math.round(basePrice * 100) / 100,
      volatility: Math.max(0.03, Math.min(0.25, volatility))
    };
  }

  generatePrice(card, source, timestamp) {
    const key = `${card.id}-${source}`;
    
    // Get or initialize price history for this card-source combination
    if (!this.priceHistory.has(key)) {
      // Source price variance (different sources have different prices)
      const sourceMultiplier = {
        tcgplayer: 1.0,
        cardmarket: 0.95,
        starcitygames: 1.08,
        coolstuffinc: 1.03
      };
      
      const initialPrice = card.basePrice * sourceMultiplier[source] * (1 + (this.rng() * 0.1 - 0.05));
      this.priceHistory.set(key, {
        lastPrice: initialPrice,
        trend: this.rng() * 0.02 - 0.01, // -1% to +1% trend
        manipulationEnd: null
      });
    }
    
    const history = this.priceHistory.get(key);
    const hoursSinceEpoch = timestamp.getTime() / (1000 * 60 * 60);
    
    // Market manipulation simulation (1% chance)
    if (this.rng() < 0.01 && !history.manipulationEnd) {
      history.manipulationEnd = hoursSinceEpoch + 24 + this.rng() * 48; // 1-3 days
      history.manipulationMultiplier = 1.3 + this.rng() * 0.4; // 30-70% spike
    }
    
    // Check if manipulation period ended
    if (history.manipulationEnd && hoursSinceEpoch > history.manipulationEnd) {
      history.manipulationEnd = null;
      history.manipulationMultiplier = 1;
    }
    
    // Calculate price with various factors
    let priceChange = 0;
    
    // Random walk
    priceChange += (this.rng() * 2 - 1) * card.volatility * history.lastPrice * 0.01;
    
    // Trend component
    priceChange += history.trend * history.lastPrice * 0.001;
    
    // Mean reversion
    const deviation = (history.lastPrice - card.basePrice) / card.basePrice;
    priceChange -= deviation * 0.002 * history.lastPrice;
    
    // Apply manipulation if active
    if (history.manipulationEnd) {
      priceChange *= history.manipulationMultiplier;
    }
    
    // Update price
    let newPrice = history.lastPrice + priceChange;
    newPrice = Math.max(0.10, newPrice); // Minimum price
    
    // Occasionally adjust trend
    if (this.rng() < 0.05) {
      history.trend = this.rng() * 0.02 - 0.01;
    }
    
    history.lastPrice = newPrice;
    
    return Math.round(newPrice * 100) / 100;
  }

  corruptData(data) {
    const corruption = this.rng();
    
    if (corruption < 0.2) {
      // Null price
      data.price = null;
    } else if (corruption < 0.3) {
      // Negative price
      data.price = -Math.abs(data.price);
    } else if (corruption < 0.4) {
      // Missing fields
      const fields = ['card_id', 'card_name', 'source', 'timestamp'];
      const fieldToRemove = fields[Math.floor(this.rng() * fields.length)];
      delete data[fieldToRemove];
    } else if (corruption < 0.5) {
      // Duplicate ID
      data.id = 'duplicate-' + Math.floor(this.rng() * 100);
    } else if (corruption < 0.6) {
      // Extremely high price (data entry error)
      data.price = data.price * 1000;
    } else if (corruption < 0.7) {
      // Future timestamp
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(this.rng() * 30));
      data.timestamp = futureDate.toISOString();
    } else if (corruption < 0.8) {
      // Invalid card_id
      data.card_id = 'invalid-' + this.rng().toString(36).substring(2, 9);
    } else if (corruption < 0.9) {
      // Zero volume with high price
      data.volume = 0;
      data.price = data.price * 10;
    } else {
      // Wrong currency
      data.currency = 'EUR';
    }
    
    return data;
  }

  generatePriceData(count = 100, currentTime = new Date()) {
    const data = [];
    
    for (let i = 0; i < count; i++) {
      const card = this.cards[Math.floor(this.rng() * this.cards.length)];
      const source = SOURCES[Math.floor(this.rng() * SOURCES.length)];
      
      // Generate timestamp within last hour for "latest" feed
      const minutesAgo = this.rng() * 60;
      const timestamp = new Date(currentTime.getTime() - minutesAgo * 60 * 1000);
      
      let pricePoint = {
        id: uuidv4(),
        card_id: card.id,
        card_name: card.name,
        source: source,
        price: this.generatePrice(card, source, timestamp),
        currency: 'USD',
        timestamp: timestamp.toISOString(),
        volume: Math.floor(this.rng() * 100) + 1
      };
      
      // 5% chance of data corruption
      if (this.rng() < 0.05) {
        pricePoint = this.corruptData(pricePoint);
      }
      
      data.push(pricePoint);
    }
    
    return data;
  }

  generateBulkData(count = 50000) {
    const data = [];
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < count; i++) {
      const card = this.cards[Math.floor(this.rng() * this.cards.length)];
      const source = SOURCES[Math.floor(this.rng() * SOURCES.length)];
      
      // Distribute timestamps across the year
      const timeOffset = this.rng() * (now.getTime() - oneYearAgo.getTime());
      const timestamp = new Date(oneYearAgo.getTime() + timeOffset);
      
      let pricePoint = {
        id: uuidv4(),
        card_id: card.id,
        card_name: card.name,
        source: source,
        price: this.generatePrice(card, source, timestamp),
        currency: 'USD',
        timestamp: timestamp.toISOString(),
        volume: Math.floor(this.rng() * 1000) + 1
      };
      
      // 5% chance of data corruption
      if (this.rng() < 0.05) {
        pricePoint = this.corruptData(pricePoint);
      }
      
      data.push(pricePoint);
    }
    
    // Sort by timestamp for more realistic bulk data
    data.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });
    
    return data;
  }
}

module.exports = DataGenerator;