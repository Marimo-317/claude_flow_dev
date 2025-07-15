#!/bin/bash

# Script to create claude_flow_dev repository with exact commit 55d6278 content

# Create a temporary directory for the new repository
TEMP_DIR="../claude_flow_dev_temp"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Clone the new empty repository
git clone https://github.com/Marimo-317/claude_flow_dev.git "$TEMP_DIR"

# Copy all files from current commit 55d6278 state (excluding .git)
rsync -av --exclude='.git' ./ "$TEMP_DIR/"

# Change to the new repository directory
cd "$TEMP_DIR"

# Configure git
git config user.name "Marimo-317"
git config user.email "marimo.317@example.com"

# Add all files
git add .

# Create initial commit with the exact content from 55d6278
git commit -m "🎯 Initial commit: Exact replica of commit 55d6278

Add GitHub Actions workflow for Claude Code integration

This repository contains the exact state of the original repository
at commit 55d6278, including:
- Basic project structure
- GitHub Actions workflows  
- Development environment setup
- Core configuration files

Repository created as claude_flow_dev for development purposes."

# Push to main branch
git push -u origin main

# Clean up - move the repository to the correct location
cd ..
rm -rf claude_flow_dev 2>/dev/null || true
mv claude_flow_dev_temp claude_flow_dev

echo "✅ Repository claude_flow_dev created successfully with exact commit 55d6278 content!"
echo "🔗 Repository URL: https://github.com/Marimo-317/claude_flow_dev"
echo "📁 Local copy available at: ../claude_flow_dev"