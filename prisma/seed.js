const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const seedrandom = require('seedrandom');

const prisma = new PrismaClient();

const SOURCES = ['tcgplayer', 'cardmarket', 'starcitygames', 'coolstuffinc'];
const CORRUPTION_RATE = 0.05;
const DAYS_OF_HISTORY = 365;
const PRICES_PER_DAY = 4; // One price per source per day

async function loadScryfallCards() {
  const cacheDir = path.join(__dirname, '..', 'cache');
  const cardsFile = path.join(cacheDir, 'selected-cards.json');
  
  if (!fs.existsSync(cardsFile)) {
    console.error('Scryfall cards not found. Run scripts/fetch-scryfall-data.js first');
    process.exit(1);
  }
  
  return JSON.parse(fs.readFileSync(cardsFile, 'utf8'));
}

function generatePriceData(card, source, timestamp) {
  const hoursSinceEpoch = Math.floor(timestamp.getTime() / (1000 * 60 * 60));
  const seed = `${card.id}-${source}-${hoursSinceEpoch}`;
  const rng = seedrandom(seed);
  
  // Base price with some randomness
  const basePrice = card.prices?.usd ? parseFloat(card.prices.usd) : 10 + rng() * 90;
  const volatility = 0.1 + rng() * 0.3;
  
  // Add trends and daily variations
  const dayOfYear = Math.floor((timestamp - new Date(timestamp.getFullYear(), 0, 0)) / 86400000);
  const trend = Math.sin(dayOfYear / 30) * 0.2;
  const dailyVariation = (rng() - 0.5) * volatility;
  
  let price = basePrice * (1 + trend + dailyVariation);
  let isCorrupted = false;
  let volume = Math.floor(10 + rng() * 500);
  
  // Apply corruption
  if (rng() < CORRUPTION_RATE) {
    isCorrupted = true;
    const corruptionType = Math.floor(rng() * 4);
    switch (corruptionType) {
      case 0:
        price = null; // Missing price
        break;
      case 1:
        price = -Math.abs(price); // Negative price
        break;
      case 2:
        price = price * 1000; // Extreme outlier
        break;
      case 3:
        volume = null; // Missing volume
        break;
    }
  }
  
  return {
    cardId: card.id,
    oracleId: card.oracle_id,
    cardName: card.name,
    source,
    price: price === null ? null : Math.round(price * 100) / 100,
    currency: 'USD',
    timestamp,
    volume,
    isCorrupted
  };
}

async function seed() {
  console.log('Starting database seed...');
  
  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.price.deleteMany();
  await prisma.card.deleteMany();
  
  // Load Scryfall cards
  console.log('Loading Scryfall cards...');
  const scryfallCards = await loadScryfallCards();
  console.log(`Loaded ${scryfallCards.length} cards`);
  
  // Prepare card data for bulk insert
  console.log('Inserting cards into database...');
  const cardData = scryfallCards.map(card => {
    const basePrice = card.prices?.usd ? parseFloat(card.prices.usd) : 10 + Math.random() * 90;
    const rng = seedrandom(card.id);
    
    return {
      id: card.id,
      oracleId: card.oracle_id,
      name: card.name,
      set: card.set,
      setName: card.set_name,
      rarity: card.rarity,
      basePrice: Math.round(basePrice * 100) / 100,
      volatility: 0.1 + rng() * 0.3
    };
  });
  
  // Bulk insert cards
  await prisma.card.createMany({
    data: cardData,
    skipDuplicates: true
  });
  console.log(`Inserted ${cardData.length} cards`);
  
  // Generate historical price data
  console.log('Generating historical price data...');
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - DAYS_OF_HISTORY);
  
  let priceData = [];
  let totalPrices = 0;
  const batchSize = 5000;
  
  for (let d = 0; d < DAYS_OF_HISTORY; d++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + d);
    
    // Generate prices for a subset of cards each day (not all cards have prices every day)
    const activeCards = scryfallCards.filter((_, index) => {
      const rng = seedrandom(`${index}-${d}`);
      return rng() < 0.3; // 30% of cards have prices on any given day
    });
    
    for (const card of activeCards) {
      for (const source of SOURCES) {
        // Random chance of having price from this source
        const rng = seedrandom(`${card.id}-${source}-${d}`);
        if (rng() < 0.7) { // 70% chance of having price from each source
          const price = generatePriceData(card, source, currentDate);
          priceData.push(price);
          
          // Batch insert when we reach the batch size
          if (priceData.length >= batchSize) {
            await prisma.price.createMany({
              data: priceData,
              skipDuplicates: true
            });
            totalPrices += priceData.length;
            console.log(`Inserted ${totalPrices} prices so far...`);
            priceData = [];
          }
        }
      }
    }
  }
  
  // Insert remaining prices
  if (priceData.length > 0) {
    await prisma.price.createMany({
      data: priceData,
      skipDuplicates: true
    });
    totalPrices += priceData.length;
  }
  
  console.log(`Seed completed! Inserted ${totalPrices} price records`);
  
  // Print some statistics
  const stats = await prisma.price.aggregate({
    _count: true,
    _avg: {
      price: true
    },
    _min: {
      timestamp: true
    },
    _max: {
      timestamp: true
    }
  });
  
  const corruptedCount = await prisma.price.count({
    where: { isCorrupted: true }
  });
  
  console.log('\nDatabase Statistics:');
  console.log(`Total prices: ${stats._count}`);
  console.log(`Average price: $${stats._avg.price?.toFixed(2) || 'N/A'}`);
  console.log(`Corrupted records: ${corruptedCount} (${(corruptedCount / stats._count * 100).toFixed(1)}%)`);
  console.log(`Date range: ${stats._min.timestamp?.toISOString()} to ${stats._max.timestamp?.toISOString()}`);
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });