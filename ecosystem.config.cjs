/**
 * PM2 Ecosystem Configuration for Claude-Flow Automation
 * Ensures persistent webhook server and monitoring
 */

module.exports = {
  apps: [
    {
      name: 'claude-flow-webhook',
      script: './src/automation/simple-webhook-handler.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        WEBHOOK_PORT: 3001,
        LOG_LEVEL: 'info'
      },
      
      env_production: {
        NODE_ENV: 'production',
        WEBHOOK_PORT: 3001,
        LOG_LEVEL: 'warn'
      },
      
      // Auto-restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '300M',
      
      // Logging
      log_file: './logs/webhook-combined.log',
      out_file: './logs/webhook-out.log',
      error_file: './logs/webhook-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      
      // Health monitoring
      health_check_url: 'http://localhost:3001/health',
      health_check_grace_period: 3000
    },
    
    {
      name: 'claude-flow-monitor',
      script: './claude-flow-automation',
      args: 'monitor --interval 10',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'info'
      },
      
      env_production: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'warn'
      },
      
      // Auto-restart configuration
      autorestart: true,
      max_restarts: 5,
      min_uptime: '30s',
      max_memory_restart: '200M',
      
      // Cron restart (restart every 6 hours to prevent memory leaks)
      cron_restart: '0 */6 * * *',
      
      // Logging
      log_file: './logs/monitor-combined.log',
      out_file: './logs/monitor-out.log',
      error_file: './logs/monitor-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ],
  
  // Global PM2 settings
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/Marimo-317/multiagentdevsystem2.git',
      path: '/var/www/claude-flow',
      'post-deploy': 'npm install && npm run install:demo && pm2 reload ecosystem.config.js --env production'
    }
  }
};