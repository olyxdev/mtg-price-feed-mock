FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Pre-fetch Scryfall data during build
RUN node scripts/fetch-scryfall-data.js || echo "Scryfall fetch failed, will use fallback"

# The port will be set by Render via PORT env variable
EXPOSE 3000

# Health check - uses the PORT env variable or defaults to 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3000; require('http').get('http://localhost:' + port + '/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Run the application
CMD ["node", "server.js"]