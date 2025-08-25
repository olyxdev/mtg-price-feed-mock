FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# The port will be set by Render via PORT env variable
EXPOSE 3000

# Health check - uses the PORT env variable or defaults to 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3000; require('http').get('http://localhost:' + port + '/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Run the application
CMD ["node", "server.js"]