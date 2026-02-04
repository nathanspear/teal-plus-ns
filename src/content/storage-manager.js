/**
 * Chrome storage management for Teal+ Extension
 */

import { LICENSE, DEFAULT_SETTINGS } from './config.js';

export class StorageManager {
  constructor() {
    this.usageCount = 0;
    this.isPremium = false;
    this.currentPlan = 'basic';
    this.trialExpired = false;
    this.settings = {};
    this.preserveList = new Set();
    this.excludeList = new Set();
  }

  // Load settings from Chrome storage
  async load() {
    try {
      const result = await chrome.storage.local.get([
        'teal_auto_usage',
        'teal_license_key',
        'teal_current_plan',
        'teal_settings'
      ]);
      
      this.usageCount = result.teal_auto_usage || 0;
      this.isPremium = result.teal_license_key === LICENSE.KEY;
      this.currentPlan = result.teal_current_plan || 'basic';
      this.trialExpired = this.usageCount >= LICENSE.TRIAL_LIMIT;
      this.settings = result.teal_settings || {};
      
      // Merge with defaults
      Object.keys(DEFAULT_SETTINGS).forEach(key => {
        if (this.settings[key] === undefined) {
          this.settings[key] = DEFAULT_SETTINGS[key];
        }
      });
      
      // Initialize lists
      this.preserveList = new Set(this.settings.preserveSelected);
      this.excludeList = new Set(this.settings.excludeSections);
      
      console.log('Settings loaded:', this);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  // Save settings to Chrome storage
  async save() {
    try {
      await chrome.storage.local.set({
        teal_auto_usage: this.usageCount,
        teal_license_key: this.isPremium ? LICENSE.KEY : null,
        teal_current_plan: this.currentPlan,
        teal_settings: this.settings
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  // Check if user has valid license
  checkLicense() {
    if (this.isPremium) return true;
    if (!this.trialExpired) return true;
    return false;
  }

  // Increment usage count
  async incrementUsage() {
    this.usageCount++;
    this.trialExpired = this.usageCount >= LICENSE.TRIAL_LIMIT;
    await this.save();
  }

  // Validate license key
  async validateLicense(key, plan = 'basic') {
    if (key === LICENSE.KEY) {
      this.isPremium = true;
      this.currentPlan = plan;
      await this.save();
      return true;
    }
    return false;
  }

  // Initialize usage statistics
  async initializeStats() {
    try {
      const result = await chrome.storage.local.get([
        'teal_total_operations',
        'teal_checkboxes_processed',
        'teal_auto_usage'
      ]);
      
      if (result.teal_total_operations === undefined) {
        await chrome.storage.local.set({
          'teal_total_operations': 0,
          'teal_checkboxes_processed': 0,
          'teal_auto_usage': 0
        });
        console.log('Usage statistics initialized');
      }
    } catch (error) {
      console.error('Failed to initialize stats:', error);
    }
  }

  // Update usage statistics after operation
  async updateStats(checkboxesChanged, perfMetrics) {
    try {
      // Store performance metrics
      const successRate = perfMetrics.checkboxCount > 0 
        ? (perfMetrics.successCount / perfMetrics.checkboxCount) * 100 
        : 0;
      
      await chrome.storage.local.set({
        'teal_last_performance': {
          executionTime: perfMetrics.totalTime,
          checkboxesProcessed: perfMetrics.checkboxCount,
          successRate: successRate,
          timestamp: Date.now()
        }
      });

      // Update operation counts
      const result = await chrome.storage.local.get([
        'teal_total_operations',
        'teal_checkboxes_processed'
      ]);
      
      const totalOps = (result.teal_total_operations || 0) + 1;
      const totalCheckboxes = (result.teal_checkboxes_processed || 0) + checkboxesChanged;
      
      await chrome.storage.local.set({
        'teal_total_operations': totalOps,
        'teal_checkboxes_processed': totalCheckboxes,
      });
      
      console.log(`Usage stats updated: ${totalOps} operations, ${totalCheckboxes} checkboxes`);
    } catch (error) {
      console.error('Failed to update usage stats:', error);
    }
  }
}

