const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
const PriceDatabase = require('./src/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
console.log('Initializing database...');
const db = new PriceDatabase();

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

// GET /feed/latest endpoint
app.get('/feed/latest', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  
  try {
    const prices = db.getLatestPrices(limit);
    
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
app.get('/feed/bulk', (req, res) => {
  try {
    // Get bulk data from database
    const bulkData = db.getBulkData(50000);
    
    // Set headers for streaming JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Start JSON response
    res.write('{"prices":[');
    
    let isFirst = true;
    const BATCH_SIZE = 1000;
    
    // Stream data in batches
    for (let i = 0; i < bulkData.length; i += BATCH_SIZE) {
      const batch = bulkData.slice(i, Math.min(i + BATCH_SIZE, bulkData.length));
      
      batch.forEach(record => {
        if (!isFirst) {
          res.write(',');
        }
        res.write(JSON.stringify(record));
        isFirst = false;
      });
    }
    
    // Finish the JSON response
    res.write('],"metadata":{"generated_at":"' + new Date().toISOString() + '","count":' + bulkData.length + '}}');
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing database connection');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing database connection');
  db.close();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`MTG Price Feed Mock API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Latest feed: http://localhost:${PORT}/feed/latest?limit=100`);
  console.log(`Bulk feed: http://localhost:${PORT}/feed/bulk`);
});