const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize data generator based on environment
let generator;
if (process.env.DATABASE_URL) {
  console.log('Using PostgreSQL with Prisma');
  const DataGeneratorPrisma = require('./src/dataGeneratorPrisma');
  generator = new DataGeneratorPrisma();
} else {
  console.log('Using in-memory data generator');
  const DataGenerator = require('./src/dataGenerator');
  generator = new DataGenerator();
}

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting - 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/feed', limiter);

// Simulate network latency
const addLatency = (req, res, next) => {
  const delay = 50 + Math.random() * 100; // 50-150ms
  setTimeout(next, delay);
};

app.use(addLatency);

// Simulate occasional service unavailability (1% of requests)
const simulateErrors = (req, res, next) => {
  if (Math.random() < 0.01) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'The service is temporarily unavailable. Please try again later.'
    });
  }
  next();
};

app.use('/feed', simulateErrors);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Stats endpoint (for debugging/monitoring)
app.get('/stats', async (req, res) => {
  if (generator.getStats) {
    const stats = await generator.getStats();
    res.json(stats || { message: 'Stats not available' });
  } else {
    res.json({ message: 'Stats not available for in-memory generator' });
  }
});

// GET /feed/latest endpoint
app.get('/feed/latest', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  
  try {
    const prices = await generator.generateLatestPrices(limit);
    
    res.json({
      prices,
      metadata: {
        generated_at: new Date().toISOString(),
        count: prices.length
      }
    });
  } catch (error) {
    console.error('Error fetching latest feed:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch price data'
    });
  }
});

// GET /feed/bulk endpoint with streaming
app.get('/feed/bulk', async (req, res) => {
  try {
    // Set headers for streaming JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Start JSON response
    res.write('{"prices":[');
    
    let isFirst = true;
    let count = 0;
    
    if (process.env.DATABASE_URL) {
      // Stream from database
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 365); // 1 year of data
      
      for await (const record of generator.generateBulkPrices(startDate, endDate)) {
        if (!isFirst) {
          res.write(',');
        }
        res.write(JSON.stringify(record));
        isFirst = false;
        count++;
      }
    } else {
      // Use in-memory generator
      const TOTAL_RECORDS = 50000;
      for (const record of generator.generateBulkData(TOTAL_RECORDS)) {
        if (!isFirst) {
          res.write(',');
        }
        res.write(JSON.stringify(record));
        isFirst = false;
        count++;
      }
    }
    
    // Finish the JSON response
    res.write('],"metadata":{"generated_at":"' + new Date().toISOString() + '","count":' + count + '}}');
    res.end();
  } catch (error) {
    console.error('Error fetching bulk feed:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch bulk data'
      });
    } else {
      res.end();
    }
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`MTG Price Feed Mock API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Latest feed: http://localhost:${PORT}/feed/latest?limit=100`);
  console.log(`Bulk feed: http://localhost:${PORT}/feed/bulk`);
});