/**
 * Core Auto-OFF logic for Teal+ Extension
 */

import { SECTION_IDS, EXTRA_IDS, TIMING, SECTION_ID_ALIASES } from './config.js';
import { sleep, dedupe, isChecked, labelText, discoverAllSections, findSectionElement } from './utils.js';

// Click and verify checkbox state
export async function turnOff(el, perfMetrics = null) {
  const turnOffStart = performance.now();
  
  const before = isChecked(el);
  if (!before) {
    if (perfMetrics) perfMetrics.totalTime += performance.now() - turnOffStart;
    return { changed: false, method: 'noop', ok: true };
  }
  
  el.click();
  
  if (TIMING.WAIT_SETTLE > 0) {
    await sleep(TIMING.WAIT_SETTLE);
  }
  
  const after = isChecked(el);
  const success = !after;
  
  if (perfMetrics) {
    perfMetrics.totalTime += performance.now() - turnOffStart;
    perfMetrics.methodCounts['click'] = (perfMetrics.methodCounts['click'] || 0) + 1;
    if (success) {
      perfMetrics.successCount++;
    } else {
      perfMetrics.failureCount++;
    }
  }
  
  return { changed: before !== after, method: 'click', ok: success };
}

// Open accordion section
export async function openAccordion(sec, perfMetrics = null) {
  const accordionStart = performance.now();
  const btn = sec.querySelector('h3 button[aria-controls]');
  const rid = btn?.getAttribute('aria-controls');
  const reg = rid ? document.getElementById(rid) : sec.querySelector('[role="region"]');
  
  console.log(`[Accordion] Opening section: ${sec.id || 'unknown'}`);
  
  const isExpanded = btn?.getAttribute('aria-expanded') === 'true';
  const isVisible = reg && !reg.hidden;
  
  if (btn && (!isExpanded || !isVisible)) {
    console.log(`[Accordion] Section ${sec.id} needs to be opened`);
    btn.click();
    
    await new Promise((resolve) => {
      let resolved = false;
      let observer = null;
      let btnObserver = null;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          observer?.disconnect();
          btnObserver?.disconnect();
          console.log(`[Accordion] Section ${sec.id} opened (timeout)`);
          resolve();
        }
      }, TIMING.ACCORDION_WAIT);
      
      if (reg) {
        observer = new MutationObserver(() => {
          if (!resolved && !reg.hidden) {
            resolved = true;
            clearTimeout(timeout);
            observer.disconnect();
            btnObserver?.disconnect();
            console.log(`[Accordion] Section ${sec.id} opened (visible)`);
            resolve();
          }
        });
        
        observer.observe(reg, {
          attributes: true,
          attributeFilter: ['hidden'],
          attributeOldValue: false
        });
        
        if (btn) {
          btnObserver = new MutationObserver(() => {
            if (!resolved && btn.getAttribute('aria-expanded') === 'true') {
              resolved = true;
              clearTimeout(timeout);
              observer?.disconnect();
              btnObserver.disconnect();
              console.log(`[Accordion] Section ${sec.id} opened (aria-expanded)`);
              resolve();
            }
          });
          
          btnObserver.observe(btn, {
            attributes: true,
            attributeFilter: ['aria-expanded'],
            attributeOldValue: false
          });
        }
      } else {
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            console.log(`[Accordion] Section ${sec.id} opened (no region)`);
            resolve();
          }
        }, 100);
      }
    });
    
    await sleep(TIMING.CONTENT_SETTLE_WAIT);
    console.log(`[Accordion] Section ${sec.id} content settled`);
    
    if (perfMetrics) perfMetrics.accordionTime += performance.now() - accordionStart;
  } else {
    console.log(`[Accordion] Section ${sec.id} already open`);
  }
  
  if (perfMetrics) perfMetrics.accordionTime += performance.now() - accordionStart;
  return reg || sec;
}

// Get all checked checkboxes from a section
export async function getCheckedCheckboxes(id, root, storageManager, isFirstPass = false) {
  console.log(`[Checkboxes] Querying section: ${id}, firstPass: ${isFirstPass}`);
  
  const checkboxSelector = 
    'input[type="checkbox"],' +
    '[role="checkbox"],' +
    '[role="switch"],' +
    '[aria-checked],' +
    '[aria-pressed],' +
    'button[aria-checked],' +
    'div[role="checkbox"],' +
    'span[role="checkbox"]';
  
  const toggles = dedupe([...root.querySelectorAll(checkboxSelector)]);
  console.log(`[Checkboxes] Initial query found ${toggles.length} checkboxes in ${id}`);
  
  if (isFirstPass && toggles.length > 0) {
    console.log(`[Checkboxes] Waiting for lazy-loaded content in ${id}...`);
    await sleep(TIMING.LAZY_LOAD_WAIT);
    const additionalToggles = dedupe([...root.querySelectorAll(checkboxSelector)]);
    console.log(`[Checkboxes] Second query found ${additionalToggles.length} checkboxes in ${id}`);
    
    additionalToggles.forEach(toggle => {
      if (!toggles.includes(toggle)) {
        toggles.push(toggle);
      }
    });
    console.log(`[Checkboxes] Total after merge: ${toggles.length} checkboxes in ${id}`);
  }
  
  const checkedToggles = toggles.filter(el => {
    if (!shouldToggle(el, id, storageManager)) return false;
    return isChecked(el);
  });
  
  console.log(`[Checkboxes] Section ${id}: ${checkedToggles.length} checked checkboxes to process`);
  return checkedToggles;
}

// Check if element should be toggled
function shouldToggle(el, section, storageManager) {
  const elementId = el.id || el.getAttribute('data-id');
  
  if (storageManager.preserveList.has(elementId)) {
    return false;
  }
  
  if (storageManager.excludeList.has(section)) {
    return false;
  }
  
  return true;
}

// Find and uncheck all "Full-time" checkboxes
export async function uncheckFullTimeInPosition(perfMetrics = null) {
  try {
    console.log('[Auto-OFF] Searching for all "Full-time" checkboxes on the page...');
    
    const allLabels = document.querySelectorAll('label');
    console.log(`[Auto-OFF] Found ${allLabels.length} labels on page`);
    
    const results = [];
    
    for (const label of allLabels) {
      const labelTextValue = label.textContent?.trim().toLowerCase() || '';
      if (labelTextValue === 'full-time' || labelTextValue === 'fulltime' || labelTextValue.includes('full-time')) {
        const checkboxId = label.getAttribute('for');
        console.log(`[Auto-OFF] Found label with "Full-time" text, for="${checkboxId}"`);
        
        if (checkboxId) {
          const checkbox = document.getElementById(checkboxId);
          if (checkbox) {
            const isCheckboxEl = checkbox.matches('input[type="checkbox"]') || 
                               checkbox.hasAttribute('aria-checked') || 
                               checkbox.getAttribute('role') === 'checkbox' ||
                               checkbox.getAttribute('role') === 'switch';
            
            if (isCheckboxEl) {
              const checked = isChecked(checkbox);
              console.log(`[Auto-OFF] Found full-time checkbox: id="${checkboxId}", checked=${checked}`);
              
              if (checked) {
                const before = isChecked(checkbox);
                const { changed, method, ok } = await turnOff(checkbox, perfMetrics);
                
                console.log(`[Auto-OFF] Attempted to uncheck full-time: changed=${changed}, method=${method}, ok=${ok}`);
                
                if (perfMetrics) {
                  perfMetrics.checkboxCount++;
                }
                
                results.push({
                  section: 'position-type',
                  label: label.textContent?.trim() || 'full-time',
                  before: before ? 'on' : 'off',
                  after: isChecked(checkbox) ? 'on' : 'off',
                  changed: changed,
                  method: method + (ok ? '' : ' (failed)')
                });
              }
            }
          }
        }
      }
    }
    
    console.log(`[Auto-OFF] Found and processed ${results.length} full-time checkboxes`);
    return results.length > 0 ? results : null;
  } catch (error) {
    console.error('[Auto-OFF] Error finding full-time checkboxes:', error);
    return null;
  }
}

// Process all sections in parallel
export async function processAllSections(storageManager, overlay) {
  const perfMetrics = {
    startTime: performance.now(),
    totalTime: 0,
    waitTime: 0,
    accordionTime: 0,
    processingTime: 0,
    methodCounts: {},
    sectionTimes: {},
    checkboxCount: 0,
    successCount: 0,
    failureCount: 0
  };
  
  const rows = [];
  overlay.setText('Preparing...');
  console.log(`[Processing] Waiting for page to be ready...`);
  
  await sleep(500);
  
  overlay.setText('Opening all sections...');
  console.log(`[Processing] Opening and processing ALL sections in parallel!`);
  
  discoverAllSections();
  
  const allSections = [...SECTION_IDS, ...storageManager.settings.customSections];
  console.log(`[Processing] Looking for sections:`, allSections);
  
  const validSections = allSections
    .filter(id => !storageManager.excludeList.has(id))
    .map(id => {
      const sec = findSectionElement(id, SECTION_ID_ALIASES);
      if (!sec) {
        console.log(`[Processing] ⚠️ Section "${id}" not found on page`);
      } else {
        console.log(`[Processing] ✓ Found section "${id}"`);
      }
      return { id, sec };
    })
    .filter(({ sec }) => sec !== null);
  
  console.log(`[Processing] Found ${validSections.length} sections to process`);
  
  // Open all sections in parallel
  const openPromises = validSections.map(async ({ id, sec }) => {
    try {
      const root = await openAccordion(sec, perfMetrics);
      return { id, sec, root };
    } catch (error) {
      console.error(`[Processing] Error opening ${id}:`, error);
      return null;
    }
  });
  
  const openedSections = (await Promise.all(openPromises)).filter(s => s !== null);
  console.log(`[Processing] Opened ${openedSections.length} sections`);
  
  overlay.setText('Processing sections...');
  
  // Process sections with multiple passes to catch all checkboxes
  let passNumber = 1;
  let totalProcessedThisPass = 0;
  const maxPasses = 3; // Maximum number of passes to prevent infinite loops
  
  do {
    totalProcessedThisPass = 0;
    console.log(`[Processing] Starting pass ${passNumber}...`);
    
    for (const { id, root } of openedSections) {
      if (overlay.isCancelled()) break;
      
      try {
        console.log(`[Processing] Pass ${passNumber}, section ${id}...`);
        
        // On first pass, wait for lazy loading. On subsequent passes, don't wait as long
        const toggles = await getCheckedCheckboxes(id, root, storageManager, passNumber === 1);
        if (toggles.length === 0) {
          console.log(`[Processing] Section ${id}: No checkboxes`);
          continue;
        }
        
        console.log(`[Processing] Pass ${passNumber}, section ${id}: Processing ${toggles.length} checkboxes in parallel`);
        
        const checkboxPromises = toggles.map(async (el) => {
          try {
            const before = isChecked(el);
            const label = labelText(root, el, true);
            
            const { changed, method, ok } = await turnOff(el, perfMetrics);
            
            if (TIMING.CLICK_WAIT > 0) await sleep(TIMING.CLICK_WAIT);
            
            const after = isChecked(el);
            
            if (!ok && before) {
              console.warn(`[Processing] ${id}: "${label}" FAILED to uncheck`);
            }
            
            return {
              section: id,
              label,
              before: before ? 'on' : 'off',
              after: after ? 'on' : 'off',
              changed: changed,
              method: method + (ok ? '' : ' (failed)')
            };
          } catch (error) {
            console.error(`[Processing] ${id}: Error on checkbox:`, error);
            return null;
          }
        });
        
        const results = await Promise.all(checkboxPromises);
        const changedCount = results.filter(r => r && r.changed).length;
        totalProcessedThisPass += changedCount;
        console.log(`[Processing] Pass ${passNumber}, section ${id} complete: ${changedCount} changed`);
        
        console.log(`[Processing] Pausing ${TIMING.SECTION_PAUSE}ms for Teal to save...`);
        await sleep(TIMING.SECTION_PAUSE);
        
        results.filter(r => r !== null).forEach(result => {
          rows.push(result);
          if (result.changed) perfMetrics.checkboxCount++;
        });
      } catch (error) {
        console.error(`[Processing] Error processing section ${id}:`, error);
      }
    }
    
    console.log(`[Processing] Pass ${passNumber} complete: ${totalProcessedThisPass} checkboxes changed`);
    passNumber++;
    
    // If we processed checkboxes this pass, wait a bit and try again
    if (totalProcessedThisPass > 0 && passNumber <= maxPasses) {
      console.log(`[Processing] Waiting before next pass to catch any newly loaded checkboxes...`);
      await sleep(500);
    }
  } while (totalProcessedThisPass > 0 && passNumber <= maxPasses);
  
  if (passNumber > maxPasses && totalProcessedThisPass > 0) {
    console.warn(`[Processing] Reached maximum passes (${maxPasses}), some checkboxes may remain`);
  }
  
  // Process extra IDs
  if (!overlay.isCancelled()) {
    overlay.setText('Processing extra checkboxes...');
    for (const ex of EXTRA_IDS) {
      if (overlay.isCancelled()) break;
      const el = document.getElementById(ex);
      if (!el) continue;
      
      if (!shouldToggle(el, 'extra', storageManager)) continue;
      if (!isChecked(el)) continue;
      
      const before = isChecked(el);
      const { changed, method, ok } = await turnOff(el, perfMetrics);
      rows.push({
        section: 'extra',
        label: '#' + ex,
        before: before ? 'on' : 'off',
        after: isChecked(el) ? 'on' : 'off',
        changed,
        method: method + (ok ? '' : ' (failed)')
      });
      
      perfMetrics.checkboxCount++;
    }
  }
  
  // Process skill-* checkboxes
  if (!overlay.isCancelled()) {
    overlay.setText('Processing software tools...');
    const allElements = document.querySelectorAll('[id^="skill-"]');
    
    for (const el of allElements) {
      if (overlay.isCancelled()) break;
      
      const isCheckboxEl = el.matches('input[type="checkbox"]') || 
                         el.getAttribute('role') === 'checkbox' ||
                         el.getAttribute('role') === 'switch';
      
      if (!isCheckboxEl) continue;
      if (!shouldToggle(el, 'software-tools', storageManager)) continue;
      if (!isChecked(el)) continue;
      
      const before = isChecked(el);
      const label = el.id.replace('skill-', '');
      const { changed, method, ok } = await turnOff(el, perfMetrics);
      
      rows.push({
        section: 'software-tools',
        label: label,
        before: before ? 'on' : 'off',
        after: isChecked(el) ? 'on' : 'off',
        changed,
        method: method + (ok ? '' : ' (failed)')
      });
      
      perfMetrics.checkboxCount++;
      
      if (TIMING.CLICK_WAIT > 0) await sleep(TIMING.CLICK_WAIT);
    }
  }
  
  perfMetrics.totalTime = performance.now() - perfMetrics.startTime;
  
  return { rows, perfMetrics };
}

