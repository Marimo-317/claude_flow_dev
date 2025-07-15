#!/bin/bash
# Claude-Flow Automation Stop Script

set -e

echo "🛑 Stopping Claude-Flow Automation System..."

# Check if PM2 is running
if ! pm2 list | grep -q "claude-flow"; then
    echo "⚠️ No Claude-Flow processes found running"
    exit 0
fi

# Stop all Claude-Flow processes
echo "📋 Stopping all Claude-Flow processes..."
pm2 stop ecosystem.config.cjs

# Show final status
pm2 status

echo ""
echo "✅ Claude-Flow Automation System stopped successfully!"
echo ""
echo "To restart: ./scripts/start-automation.sh"
echo "To completely remove: pm2 delete all"
