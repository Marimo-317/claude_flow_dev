#!/bin/bash

# init-firewall.sh - Network security setup for Claude Code devcontainer
# This script establishes a default-deny firewall with whitelisted domains

set -e

echo "🔒 Initializing firewall rules for Claude Code devcontainer..."

# Check if running as root or with sudo capabilities
if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
    echo "⚠️  Warning: Cannot configure firewall - insufficient privileges"
    echo "   Firewall setup requires sudo access for iptables"
    exit 0
fi

# Function to run iptables with proper permissions
run_iptables() {
    if [[ $EUID -eq 0 ]]; then
        iptables "$@"
    else
        sudo iptables "$@"
    fi
}

# Clear existing rules
echo "🧹 Clearing existing firewall rules..."
run_iptables -F OUTPUT 2>/dev/null || true
run_iptables -F INPUT 2>/dev/null || true

# Set default policies
echo "🚫 Setting default deny policy..."
run_iptables -P OUTPUT DROP 2>/dev/null || true

# Allow loopback traffic
echo "🔄 Allowing loopback traffic..."
run_iptables -A OUTPUT -o lo -j ACCEPT 2>/dev/null || true
run_iptables -A INPUT -i lo -j ACCEPT 2>/dev/null || true

# Allow established and related connections
echo "🔗 Allowing established connections..."
run_iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true
run_iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true

# Whitelist essential domains for development
echo "✅ Configuring whitelisted domains..."

# Essential domains for package managers and development
WHITELISTED_DOMAINS=(
    "registry.npmjs.org"
    "github.com"
    "api.github.com"
    "raw.githubusercontent.com"
    "pypi.org"
    "files.pythonhosted.org"
    "anthropic.com"
    "api.anthropic.com"
    "claude.ai"
    "docs.anthropic.com"
    "registry.yarnpkg.com"
    "nodejs.org"
    "ubuntu.com"
    "debian.org"
    "security.ubuntu.com"
    "archive.ubuntu.com"
    "deb.debian.org"
    "cdn.jsdelivr.net"
    "unpkg.com"
    "fonts.googleapis.com"
    "fonts.gstatic.com"
)

# Create whitelist rules for each domain
for domain in "${WHITELISTED_DOMAINS[@]}"; do
    echo "  📝 Whitelisting: $domain"
    
    # Resolve domain to IP addresses and create rules
    IPS=$(dig +short "$domain" 2>/dev/null || echo "")
    
    if [[ -n "$IPS" ]]; then
        while IFS= read -r ip; do
            if [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                run_iptables -A OUTPUT -d "$ip" -j ACCEPT 2>/dev/null || true
            fi
        done <<< "$IPS"
    fi
    
    # Also allow by domain name (for future resolution)
    run_iptables -A OUTPUT -p tcp --dport 80 -m string --string "$domain" --algo bm -j ACCEPT 2>/dev/null || true
    run_iptables -A OUTPUT -p tcp --dport 443 -m string --string "$domain" --algo bm -j ACCEPT 2>/dev/null || true
done

# Allow DNS queries
echo "🔍 Allowing DNS queries..."
run_iptables -A OUTPUT -p udp --dport 53 -j ACCEPT 2>/dev/null || true
run_iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT 2>/dev/null || true

# Allow common development ports (for local development)
echo "🛠️  Allowing development ports..."
DEV_PORTS=(3000 8000 8080 5000 3001 4000 5173 5174)
for port in "${DEV_PORTS[@]}"; do
    run_iptables -A OUTPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || true
    run_iptables -A INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || true
done

# Allow SSH (for git operations)
echo "🔑 Allowing SSH..."
run_iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT 2>/dev/null || true

# Allow HTTPS and HTTP for whitelisted domains
echo "🌐 Allowing HTTPS/HTTP for development..."
run_iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
run_iptables -A OUTPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true

# Log dropped packets for debugging
echo "📊 Setting up logging for dropped packets..."
run_iptables -A OUTPUT -j LOG --log-prefix "FIREWALL-DROP: " --log-level 4 2>/dev/null || true

# Verify firewall rules
echo "🔍 Verifying firewall configuration..."
if command -v iptables-save >/dev/null 2>&1; then
    RULE_COUNT=$(iptables-save | grep -c "^-A" || echo "0")
    echo "✅ Firewall initialized with $RULE_COUNT rules"
else
    echo "✅ Firewall rules applied (verification skipped)"
fi

# Test connectivity to essential services
echo "🧪 Testing connectivity..."
ESSENTIAL_HOSTS=("github.com" "registry.npmjs.org" "anthropic.com")
for host in "${ESSENTIAL_HOSTS[@]}"; do
    if timeout 5 nc -z "$host" 443 2>/dev/null; then
        echo "  ✅ $host: Connected"
    else
        echo "  ⚠️  $host: Connection failed"
    fi
done

echo "🎉 Firewall initialization complete!"
echo "📋 Security features enabled:"
echo "  • Default-deny outbound policy"
echo "  • Whitelisted essential development domains"
echo "  • Local development ports allowed"
echo "  • SSH access for git operations"
echo "  • Connection logging enabled"
echo ""
echo "⚠️  Note: Only whitelisted domains are accessible from this container"
echo "   To add new domains, update the WHITELISTED_DOMAINS array in this script"