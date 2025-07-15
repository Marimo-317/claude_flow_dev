#!/bin/bash
# Claude-Flow Automation Monitoring Script

set -e

echo "📊 Claude-Flow Automation System Monitor"
echo "========================================"

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    
    if pm2 list | grep -q "$service_name.*online"; then
        echo "✅ $service_name: RUNNING"
        
        if [ ! -z "$port" ]; then
            if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
                echo "   🏥 Health check: PASSED"
            else
                echo "   ❌ Health check: FAILED"
            fi
        fi
    else
        echo "❌ $service_name: STOPPED"
    fi
}

# Check PM2 processes
echo "
🗺 PM2 Process Status:"
check_service "claude-flow-webhook" "3001"
check_service "claude-flow-monitor"

# System resources
echo "
💻 System Resources:"
echo "   Memory: $(free -h | awk '/^Mem:/ {print $3"/"$2}')"
echo "   CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "   Disk: $(df -h / | awk 'NR==2 {print $5}')"

# Port status
echo "
🗺 Port Status:"
if netstat -tuln | grep -q ":3001 "; then
    echo "   ✅ Port 3001: LISTENING (Webhook Server)"
else
    echo "   ❌ Port 3001: NOT LISTENING"
fi

# Recent errors
echo "
🚨 Recent Errors (last 10):"
if [ -f "logs/webhook-error.log" ]; then
    tail -10 logs/webhook-error.log 2>/dev/null || echo "   No recent errors"
else
    echo "   No error log found"
fi

# Process uptime
echo "
⏰ Process Uptime:"
pm2 list | grep "claude-flow" | awk '{print "   " $2 ": " $10}'

# GitHub API rate limit (if token available)
if [ ! -z "$GITHUB_TOKEN" ]; then
    echo "
🔒 GitHub API Rate Limit:"
    curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit | \
        jq -r '.rate | "   Remaining: \(.remaining)/\(.limit) (resets at \(.reset | strftime(\"%H:%M:%S\")))'" 2>/dev/null || \
        echo "   Unable to check rate limit"
fi

echo "
========================================"
echo "Monitor complete at $(date)"

# Options
echo "
📊 Available commands:"
echo "   pm2 logs                 - View live logs"
echo "   pm2 monit               - Real-time monitoring"
echo "   ./scripts/stop-automation.sh  - Stop all services"
echo "   ./scripts/start-automation.sh - Restart all services"
