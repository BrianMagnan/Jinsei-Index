FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]

