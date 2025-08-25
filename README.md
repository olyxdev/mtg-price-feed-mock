# MTG Price Feed Mock API

A mock API server that simulates real-world Magic: The Gathering card price data with intentional data quality issues for technical assessments.

## Features

- **Persistent Data**: Uses an in-memory database with consistent card IDs and historical data
- **50,000 Historical Records**: Bulk endpoint provides consistent historical data spanning 1 year
- **Fixed Card Catalog**: 50 cards with stable IDs for tracking price changes over time
- **Multiple Price Sources**: Simulates data from tcgplayer, cardmarket, starcitygames, and coolstuffinc
- **Realistic Price Evolution**: Prices evolve gradually based on volatility and market trends
- **Data Quality Issues**: ~5% of data contains intentional corruptions (nulls, negatives, missing fields, etc.)
- **Rate Limiting**: 100 requests per minute per IP
- **Performance Simulation**: 50-150ms latency and 1% service unavailability

## Endpoints

### `GET /health`
Health check endpoint for monitoring.

### `GET /feed/latest?limit={limit}`
Returns recent price updates.
- Default limit: 100
- Maximum limit: 1000
- Each call returns slightly different data simulating real-time updates

### `GET /feed/bulk`
Returns exactly 50,000 historical price records.
- Covers approximately 1 year of data
- Streams response to handle large dataset efficiently
- Includes various cards with prices from $0.25 to $35,000

## Data Format

Each price point includes:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "card_id": "a1b2c3d4e5f6",
  "card_name": "Lightning Bolt",
  "source": "tcgplayer",
  "price": 2.50,
  "currency": "USD",
  "timestamp": "2024-01-15T10:30:00Z",
  "volume": 42
}
```

## Data Quality Issues (5% of data)

The API intentionally includes these issues to simulate real-world challenges:
- Null prices
- Negative prices
- Missing fields
- Duplicate IDs
- Extremely high prices (data entry errors)
- Timestamps in the future
- Invalid card_ids
- Zero volumes with high prices (suspicious activity)
- Wrong currency codes

## Local Development

### Prerequisites
- Node.js 18+
- Docker (optional)

### Installation
```bash
npm install
```

### Running Locally
```bash
npm start
# or
npm run dev
```

The server will start on http://localhost:3000

### Docker

Build and run with Docker:
```bash
npm run docker:build
npm run docker:run
```

Or use Docker Compose:
```bash
npm run docker:compose
```

## Deployment to Render.com

1. Push this repository to GitHub
2. Connect your GitHub account to Render
3. Create a new Web Service
4. Select this repository
5. Render will automatically detect the `render.yaml` configuration
6. Deploy!

The service will be available at: https://mtg-prices-mock.valoryx.nl/feed

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## API Behavior

### Performance Characteristics
- `/feed/latest`: Responds in <200ms (plus simulated latency)
- `/feed/bulk`: Streams response without loading all 50k records in memory
- Random 50-150ms latency added to all requests
- 1% of requests return 503 Service Unavailable

### Price Simulation
- Same card has different prices from different sources
- Prices vary realistically over time with gradual changes
- Occasional price spikes simulating market manipulation
- Cards show clear upward/downward trends based on rarity

### Card Pool
- **Power Nine**: $5,000-$35,000 (Black Lotus, Moxen, etc.)
- **Dual Lands**: $500-$5,000 (Underground Sea, Volcanic Island, etc.)
- **Modern Staples**: $50-$200 (Ragavan, Force of Negation, etc.)
- **Standard Cards**: $5-$50
- **Commons/Uncommons**: $0.25-$5

## Important Assessment Notes

### Data Consistency
- **Card IDs are stable**: Each card has a fixed ID that never changes
- **Historical data is consistent**: The bulk endpoint returns the same historical data
- **Prices evolve over time**: Latest prices show gradual changes from the historical baseline
- **Perfect for tracking**: You can track price changes, calculate trends, and detect anomalies

### Card Catalog
The API uses a fixed set of 50 cards including:
- Power Nine cards (Black Lotus, Moxen) with IDs like `0e2749a9-c857-4b59`
- Dual Lands (Underground Sea, Volcanic Island)
- Modern staples (Ragavan, Force of Negation)
- Standard cards with varying price ranges
- Commons and uncommons

## Technical Details

- **Framework**: Express.js
- **Data Storage**: In-memory database with pre-generated historical data
- **Streaming**: Chunked transfer encoding for bulk endpoint
- **Rate Limiting**: express-rate-limit
- **Logging**: Morgan
- **Compression**: gzip compression for responses
- **CORS**: Enabled for all origins

## Testing the API

```bash
# Check health
curl http://localhost:3000/health

# Get latest prices (limit 10)
curl http://localhost:3000/feed/latest?limit=10

# Get bulk data (will stream 50k records)
curl http://localhost:3000/feed/bulk > bulk_data.json
```

## License

ISC
