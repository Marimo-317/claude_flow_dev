/**
 * Simple GitHub Webhook Handler
 * Minimal implementation for testing automated issue detection
 */

import express from 'express';
import crypto from 'crypto';
import { Octokit } from '@octokit/rest';

export class SimpleWebhookHandler {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || 3001;
    this.secret = process.env.GITHUB_WEBHOOK_SECRET;
    
    // Initialize GitHub API client
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    
    this.repository = {
      owner: 'Marimo-317',
      repo: 'multiagentdevsystem2'
    };
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use('/webhook', express.json({
      limit: '5mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    this.app.post('/webhook', this.verifySignature.bind(this), this.handleWebhook.bind(this));
    
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });
    
    this.app.post('/trigger/:issueNumber', this.handleManualTrigger.bind(this));
  }

  verifySignature(req, res, next) {
    if (!this.secret) {
      console.warn('⚠️ Webhook secret not configured, skipping verification');
      return next();
    }

    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', this.secret)
      .update(req.rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  }

  async handleWebhook(req, res) {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    console.log(`📨 Received GitHub webhook: ${event}`);

    try {
      let result = null;

      switch (event) {
        case 'issues':
          result = await this.handleIssueEvent(payload);
          break;
          
        case 'issue_comment':
          result = await this.handleIssueComment(payload);
          break;
          
        case 'ping':
          result = { pong: true };
          break;
          
        default:
          console.log(`ℹ️ Ignoring ${event} event`);
          result = { ignored: true, event };
      }

      res.json({
        success: true,
        event,
        result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Error handling ${event} webhook:`, error.message);
      
      res.status(500).json({
        success: false,
        error: error.message,
        event,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleIssueEvent(payload) {
    const { action, issue } = payload;
    const issueNumber = issue.number;
    
    console.log(`🎯 Issue ${action}: #${issueNumber} - ${issue.title}`);

    // Auto-trigger conditions
    const shouldAutoTrigger = this.shouldAutoTriggerForIssue(issue, action);
    
    if (shouldAutoTrigger) {
      console.log(`🚀 Auto-triggering workflow for issue #${issueNumber}`);
      
      try {
        // Add processing label
        await this.addIssueLabel(issue, 'claude-flow:processing');
        
        // Simulate processing
        await this.processIssue(issueNumber);
        
        // Add success label
        await this.removeIssueLabel(issue, 'claude-flow:processing');
        await this.addIssueLabel(issue, 'claude-flow:implemented');
        
        return {
          triggered: true,
          issueNumber,
          result: true
        };
        
      } catch (error) {
        await this.removeIssueLabel(issue, 'claude-flow:processing');
        await this.addIssueLabel(issue, 'claude-flow:failed');
        throw error;
      }
    }

    return {
      triggered: false,
      issueNumber,
      reason: 'Auto-trigger conditions not met'
    };
  }

  async handleIssueComment(payload) {
    const { action, issue, comment } = payload;
    
    if (action !== 'created') {
      return { ignored: true, reason: 'Not a new comment' };
    }

    const commentBody = comment.body.toLowerCase().trim();
    const issueNumber = issue.number;

    const triggerCommands = [
      '/claude-flow',
      '/autofix',
      '/implement',
      '/merge-me'
    ];

    const matchedCommand = triggerCommands.find(cmd => commentBody.includes(cmd));
    
    if (matchedCommand) {
      console.log(`🎯 Manual trigger detected: "${matchedCommand}" on issue #${issueNumber}`);
      
      try {
        await this.addCommentReaction(comment, '+1');
        await this.processIssue(issueNumber);
        await this.addCommentReaction(comment, 'rocket');
        
        return {
          triggered: true,
          issueNumber,
          command: matchedCommand,
          result: true
        };
        
      } catch (error) {
        await this.addCommentReaction(comment, 'confused');
        throw error;
      }
    }

    return {
      triggered: false,
      issueNumber,
      reason: 'No trigger command found'
    };
  }

  async handleManualTrigger(req, res) {
    const issueNumber = parseInt(req.params.issueNumber);
    const options = req.body || {};

    if (!issueNumber || isNaN(issueNumber)) {
      return res.status(400).json({ error: 'Invalid issue number' });
    }

    try {
      console.log(`🎯 Manual trigger for issue #${issueNumber}`);
      
      const result = await this.processIssue(issueNumber);

      res.json({
        success: true,
        issueNumber,
        result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Manual trigger failed for issue #${issueNumber}:`, error.message);
      
      res.status(500).json({
        success: false,
        error: error.message,
        issueNumber,
        timestamp: new Date().toISOString()
      });
    }
  }

  shouldAutoTriggerForIssue(issue, action) {
    if (!['opened', 'labeled'].includes(action)) {
      return false;
    }

    const hasAutoLabel = issue.labels.some(label => 
      label.name === 'claude-flow:auto' || 
      label.name === 'auto-implement'
    );

    const isProcessing = issue.labels.some(label => 
      ['claude-flow:processing', 'claude-flow:failed'].includes(label.name)
    );

    return hasAutoLabel && !isProcessing;
  }

  async processIssue(issueNumber) {
    console.log(`🔄 Processing issue #${issueNumber}...`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // For now, just add a comment to the issue
    await this.addIssueComment(issueNumber, 
      '🤖 **Claude-Flow Automation Triggered**\n\n' +
      'This issue has been automatically detected and processed by Claude-Flow.\n\n' +
      '**Status**: Processing simulation completed\n' +
      '**Next Steps**: Manual implementation required\n\n' +
      '---\n' +
      '*This is a demo of the automated issue detection system.*'
    );
    
    console.log(`✅ Issue #${issueNumber} processed successfully`);
    return { success: true, processed: true };
  }

  async addIssueLabel(issue, labelName) {
    try {
      console.log(`🏷️ Adding label "${labelName}" to issue #${issue.number}`);
      
      await this.octokit.rest.issues.addLabels({
        owner: this.repository.owner,
        repo: this.repository.repo,
        issue_number: issue.number,
        labels: [labelName]
      });
      
      console.log(`✅ Label "${labelName}" added to issue #${issue.number}`);
    } catch (error) {
      console.error(`❌ Failed to add label "${labelName}" to issue #${issue.number}:`, error.message);
      
      if (error.status === 422) {
        await this.createLabel(labelName);
        return this.addIssueLabel(issue, labelName);
      }
    }
  }

  async removeIssueLabel(issue, labelName) {
    try {
      console.log(`🏷️ Removing label "${labelName}" from issue #${issue.number}`);
      
      await this.octokit.rest.issues.removeLabel({
        owner: this.repository.owner,
        repo: this.repository.repo,
        issue_number: issue.number,
        name: labelName
      });
      
      console.log(`✅ Label "${labelName}" removed from issue #${issue.number}`);
    } catch (error) {
      console.error(`❌ Failed to remove label "${labelName}" from issue #${issue.number}:`, error.message);
    }
  }

  async addCommentReaction(comment, reaction) {
    try {
      console.log(`👍 Adding reaction "${reaction}" to comment ${comment.id}`);
      
      await this.octokit.rest.reactions.createForIssueComment({
        owner: this.repository.owner,
        repo: this.repository.repo,
        comment_id: comment.id,
        content: reaction
      });
      
      console.log(`✅ Reaction "${reaction}" added to comment ${comment.id}`);
    } catch (error) {
      console.error(`❌ Failed to add reaction "${reaction}" to comment ${comment.id}:`, error.message);
    }
  }

  async addIssueComment(issueNumber, body) {
    try {
      console.log(`💬 Adding comment to issue #${issueNumber}`);
      
      await this.octokit.rest.issues.createComment({
        owner: this.repository.owner,
        repo: this.repository.repo,
        issue_number: issueNumber,
        body: body
      });
      
      console.log(`✅ Comment added to issue #${issueNumber}`);
    } catch (error) {
      console.error(`❌ Failed to add comment to issue #${issueNumber}:`, error.message);
    }
  }

  async createLabel(labelName, color = 'f29513', description = '') {
    try {
      console.log(`🏷️ Creating label "${labelName}"`);
      
      await this.octokit.rest.issues.createLabel({
        owner: this.repository.owner,
        repo: this.repository.repo,
        name: labelName,
        color: color,
        description: description || `Auto-generated label for Claude-Flow: ${labelName}`
      });
      
      console.log(`✅ Label "${labelName}" created`);
    } catch (error) {
      console.error(`❌ Failed to create label "${labelName}":`, error.message);
    }
  }

  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`🎣 Simple GitHub webhook handler listening on port ${this.port}`);
        console.log(`📡 Webhook URL: http://localhost:${this.port}/webhook`);
        console.log(`🏥 Health check: http://localhost:${this.port}/health`);
        resolve();
      });
    });
  }

  async stop() {
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
    console.log('🛑 Webhook handler stopped');
  }
}

// CLI interface when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const handler = new SimpleWebhookHandler();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, stopping webhook handler...');
    await handler.stop();
    process.exit(0);
  });
  
  handler.start().catch(error => {
    console.error('❌ Failed to start webhook handler:', error);
    process.exit(1);
  });
}

export default SimpleWebhookHandler;