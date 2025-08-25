const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
const DataGenerator = require('./src/dataGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize data generator
const dataGenerator = new DataGenerator();

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
    const prices = dataGenerator.generatePriceData(limit);
    
    res.json({
      prices,
      metadata: {
        generated_at: new Date().toISOString(),
        count: prices.length
      }
    });
  } catch (error) {
    console.error('Error generating latest feed:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate price data'
    });
  }
});

// GET /feed/bulk endpoint with streaming
app.get('/feed/bulk', (req, res) => {
  const BATCH_SIZE = 1000;
  const TOTAL_RECORDS = 50000;
  
  try {
    // Set headers for streaming JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Start JSON response
    res.write('{"prices":[');
    
    let recordsSent = 0;
    let isFirst = true;
    
    // Generate and stream data in batches
    const streamBatch = () => {
      const remaining = TOTAL_RECORDS - recordsSent;
      const batchSize = Math.min(BATCH_SIZE, remaining);
      
      if (batchSize === 0) {
        // Finish the JSON response
        res.write('],"metadata":{"generated_at":"' + new Date().toISOString() + '","count":' + TOTAL_RECORDS + '}}');
        res.end();
        return;
      }
      
      // Generate batch of data
      const batch = dataGenerator.generateBulkData(batchSize);
      
      // Write batch to response
      batch.forEach(record => {
        if (!isFirst) {
          res.write(',');
        }
        res.write(JSON.stringify(record));
        isFirst = false;
        recordsSent++;
      });
      
      // Continue with next batch
      setImmediate(streamBatch);
    };
    
    streamBatch();
  } catch (error) {
    console.error('Error generating bulk feed:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate bulk data'
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