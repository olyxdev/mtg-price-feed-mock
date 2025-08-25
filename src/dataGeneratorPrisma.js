const { PrismaClient } = require('@prisma/client');

class DataGeneratorPrisma {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async generateLatestPrices(limit = 100) {
    try {
      // Get the most recent prices grouped by card
      const prices = await this.prisma.price.findMany({
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: {
          card: {
            select: {
              name: true,
              set: true,
              setName: true,
              rarity: true
            }
          }
        }
      });

      return prices.map(price => ({
        card_id: price.cardId,
        oracle_id: price.oracleId,
        name: price.cardName,
        set: price.card.set,
        set_name: price.card.setName,
        rarity: price.card.rarity,
        source: price.source,
        price: price.price,
        currency: price.currency,
        timestamp: price.timestamp.toISOString(),
        volume: price.volume
      }));
    } catch (error) {
      console.error('Error fetching latest prices:', error);
      return [];
    }
  }

  async *generateBulkPrices(startDate, endDate) {
    const batchSize = 1000;
    let skip = 0;
    
    try {
      while (true) {
        const prices = await this.prisma.price.findMany({
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: { timestamp: 'desc' },
          skip,
          take: batchSize,
          include: {
            card: {
              select: {
                name: true,
                set: true,
                setName: true,
                rarity: true
              }
            }
          }
        });

        if (prices.length === 0) break;

        for (const price of prices) {
          yield {
            card_id: price.cardId,
            oracle_id: price.oracleId,
            name: price.cardName,
            set: price.card.set,
            set_name: price.card.setName,
            rarity: price.card.rarity,
            source: price.source,
            price: price.price,
            currency: price.currency,
            timestamp: price.timestamp.toISOString(),
            volume: price.volume
          };
        }

        skip += batchSize;
      }
    } catch (error) {
      console.error('Error in bulk price generation:', error);
    }
  }

  async getHistoricalPrices(cardId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    try {
      const prices = await this.prisma.price.findMany({
        where: {
          cardId,
          timestamp: {
            gte: startDate
          }
        },
        orderBy: { timestamp: 'desc' },
        include: {
          card: {
            select: {
              name: true,
              set: true,
              setName: true,
              rarity: true
            }
          }
        }
      });

      return prices.map(price => ({
        card_id: price.cardId,
        oracle_id: price.oracleId,
        name: price.cardName,
        set: price.card.set,
        set_name: price.card.setName,
        rarity: price.card.rarity,
        source: price.source,
        price: price.price,
        currency: price.currency,
        timestamp: price.timestamp.toISOString(),
        volume: price.volume
      }));
    } catch (error) {
      console.error('Error fetching historical prices:', error);
      return [];
    }
  }

  async getStats() {
    try {
      const [totalPrices, totalCards, corruptedCount] = await Promise.all([
        this.prisma.price.count(),
        this.prisma.card.count(),
        this.prisma.price.count({ where: { isCorrupted: true } })
      ]);

      const dateRange = await this.prisma.price.aggregate({
        _min: { timestamp: true },
        _max: { timestamp: true }
      });

      return {
        total_prices: totalPrices,
        total_cards: totalCards,
        corrupted_records: corruptedCount,
        corruption_rate: (corruptedCount / totalPrices * 100).toFixed(1) + '%',
        date_range: {
          start: dateRange._min.timestamp?.toISOString(),
          end: dateRange._max.timestamp?.toISOString()
        }
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return null;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = DataGeneratorPrisma;