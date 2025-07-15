#!/bin/bash
# Claude-Flow Automation Startup Script

set -e

echo "🚀 Starting Claude-Flow Automation System..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded from .env"
else
    echo "⚠️ No .env file found, using system environment variables"
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    npm run install:demo
fi

# Start PM2 processes
echo "🎯 Starting webhook server and monitor..."
pm2 start ecosystem.config.cjs

# Show status
pm2 status

# Show logs
echo ""
echo "📋 Recent logs:"
pm2 logs --lines 10

echo ""
echo "✅ Claude-Flow Automation System started successfully!"
echo ""
echo "📡 Webhook URL: http://localhost:3001/webhook"
echo "🏥 Health Check: http://localhost:3001/health"
echo ""
echo "📊 Monitor with: pm2 status"
echo "📝 View logs with: pm2 logs"
echo "🛑 Stop with: pm2 stop all"
echo "🔄 Restart with: pm2 restart all"
