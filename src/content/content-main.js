/**
 * Main entry point for Teal+ Extension content script
 */

import { TriggerButton, ProgressOverlay, showToast } from './ui-components.js';
import { StorageManager } from './storage-manager.js';
import { showPaymentModal, showSettingsPanel } from './modals.js';
import { processAllSections, uncheckFullTimeInPosition } from './auto-off-core.js';

// Prevent multiple injections
if (window.__autoOffLoaded) {
  console.log('Teal+ Extension already loaded');
} else {
  window.__autoOffLoaded = true;
  console.log('Teal+ Extension loading...');
  
  // Initialize storage manager
  const storageManager = new StorageManager();
  
  // Main auto-off function
  async function runAutoOff() {
    console.log('[Teal+] Starting Auto-OFF');
    
    const overlay = new ProgressOverlay(storageManager.settings.showProgress);
    overlay.show();
    triggerBtn.setDisabled(true);
    
    try {
      const rows = [];
      
      // Process Full-Time checkboxes
      if (!overlay.isCancelled()) {
        overlay.setText('Processing Full-Time checkboxes...');
        console.log('[Processing] Starting full-time checkbox processing...');
        const fullTimeResults = await uncheckFullTimeInPosition();
        if (fullTimeResults && fullTimeResults.length > 0) {
          fullTimeResults.forEach(result => rows.push(result));
          console.log(`[Processing] Full-time processing complete: ${fullTimeResults.length} checkboxes`);
        }
      }
      
      // Process all sections
      if (!overlay.isCancelled()) {
        console.log('[Processing] Starting parallel section processing...');
        const { rows: sectionRows, perfMetrics } = await processAllSections(storageManager, overlay);
        rows.push(...sectionRows);
        console.log('[Processing] All parallel processing complete');
        
        // Update statistics
        const changed = rows.filter(r => r.changed).length;
        await storageManager.updateStats(changed, perfMetrics);
        
        // Log results
        logResults(rows, perfMetrics);
        
        // Show success message
        if (!overlay.isCancelled()) {
          const executionTimeSec = (perfMetrics.totalTime / 1000).toFixed(1);
          const successRate = perfMetrics.checkboxCount > 0 
            ? ((perfMetrics.successCount / perfMetrics.checkboxCount) * 100).toFixed(0)
            : '100';
          const successMsg = `Auto‑OFF complete! ${changed} items switched off in ${executionTimeSec}s (${successRate}% success)`;
          showToast(successMsg);
        }
      }
      
      if (overlay.isCancelled()) {
        showToast('Auto‑OFF cancelled');
      }
      
    } catch (error) {
      console.error('[Teal+] Error during Auto-OFF:', error);
      showToast('Auto-OFF encountered an error. Check console for details.');
    } finally {
      overlay.remove();
      triggerBtn.setDisabled(false);
    }
  }
  
  // Log results to console
  function logResults(rows, perfMetrics) {
    const changed = rows.filter(r => r.changed).length;
    
    // Log performance metrics
    console.group('🚀 Auto-OFF Performance Metrics');
    console.log(`Total execution time: ${perfMetrics.totalTime.toFixed(2)}ms`);
    console.log(`Total checkboxes processed: ${perfMetrics.checkboxCount}`);
    
    if (perfMetrics.checkboxCount > 0) {
      const successRate = (perfMetrics.successCount / perfMetrics.checkboxCount) * 100;
      console.log(`Success rate: ${successRate.toFixed(1)}%`);
      console.log(`Average time per checkbox: ${(perfMetrics.totalTime / perfMetrics.checkboxCount).toFixed(2)}ms`);
    }
    
    if (perfMetrics.totalTime > 0) {
      console.log(`Time spent on accordions: ${perfMetrics.accordionTime.toFixed(2)}ms (${((perfMetrics.accordionTime / perfMetrics.totalTime) * 100).toFixed(1)}%)`);
    }
    
    console.log('Method distribution:', perfMetrics.methodCounts);
    console.groupEnd();
    
    // Group results by section
    const sectionGroups = {};
    rows.forEach(row => {
      if (!sectionGroups[row.section]) {
        sectionGroups[row.section] = [];
      }
      sectionGroups[row.section].push(row);
    });
    
    console.group('📊 Results by Section');
    for (const [section, sectionRows] of Object.entries(sectionGroups)) {
      const sectionChanged = sectionRows.filter(r => r.changed).length;
      console.groupCollapsed(`${section}: ${sectionChanged}/${sectionRows.length} changed`);
      console.table(sectionRows);
      console.groupEnd();
    }
    console.groupEnd();
    
    console.info(`[auto‑off] scanned=${rows.length} • changed=${changed} • success=${perfMetrics.successCount} • failed=${perfMetrics.failureCount}`);
  }
  
  // Update trigger button based on license status
  function updateTrigger() {
    triggerBtn.update(
      storageManager.isPremium,
      storageManager.currentPlan,
      storageManager.usageCount,
      3
    );
  }
  
  // Create trigger button
  const triggerBtn = new TriggerButton(
    () => {
      if (!triggerBtn.button.disabled) {
        runAutoOff();
      }
    },
    () => {
      if (storageManager.isPremium) {
        showSettingsPanel(storageManager);
      } else {
        showPaymentModal(storageManager, updateTrigger, () => showSettingsPanel(storageManager));
      }
    }
  );
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (!storageManager.settings.enableKeyboardShortcuts) return;
    
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      runAutoOff();
    }
    
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      showSettingsPanel(storageManager);
    }
  });
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ status: 'ok' });
      return true;
    }
    
    if (request.action === 'runAutoOff') {
      runAutoOff();
      sendResponse({ status: 'started' });
      return true;
    }
    
    if (request.action === 'openSettings') {
      showSettingsPanel(storageManager);
      sendResponse({ status: 'opened' });
      return true;
    }
    
    if (request.action === 'showPaymentModal') {
      showPaymentModal(storageManager, updateTrigger, () => showSettingsPanel(storageManager));
      sendResponse({ status: 'opened' });
      return true;
    }
    
    if (request.action === 'storageChanged') {
      storageManager.load().then(() => {
        updateTrigger();
      });
      sendResponse({ status: 'updated' });
      return true;
    }
  });
  
  // Initialize the extension
  async function init() {
    await storageManager.load();
    updateTrigger();
    await storageManager.initializeStats();
    console.log('Teal+ Extension initialized');
  }
  
  // Start the extension
  init();
}

