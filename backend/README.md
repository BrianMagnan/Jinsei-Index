# Jinsei Index Backend

Backend server for Jinsei Index using Express, MongoDB, and Mongoose.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and configure your MongoDB connection:

```bash
cp .env.example .env
```

3. Make sure MongoDB is running on your system. If using MongoDB locally:

```bash
# macOS (via Homebrew)
brew services start mongodb-community

# Or run MongoDB manually
mongod
```

4. Start the development server:

```bash
npm run dev
```

The server will run on `http://localhost:3000` by default.

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files (database, etc.)
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   └── server.js       # Main server file
├── .env                # Environment variables (not in git)
├── .env.example        # Example environment variables
└── package.json
```

## API Endpoints

- `GET /api/health` - Health check endpoint

## Environment Variables

- `MONGODB_URI` - MongoDB connection string (default: mongodb://localhost:27017/jinsei-index)
- `PORT` - Server port (default: 3000)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
