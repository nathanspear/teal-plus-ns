/**
 * Utility functions for Teal+ Extension
 */

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const dedupe = a => [...new Set(a)];

// Check if checkbox is currently checked
export const isChecked = el =>
  el.matches?.('input[type="checkbox"]')
    ? el.checked
    : el.getAttribute?.('aria-checked') === 'true'
      || el.getAttribute?.('aria-pressed') === 'true';

// Cache for label text lookups
const labelTextCache = new WeakMap();

// Get label text for a checkbox element
export const labelText = (root, el, useCache = true) => {
  if (!el) return '';
  
  // Return cached result if available
  if (useCache && labelTextCache.has(el)) {
    return labelTextCache.get(el);
  }
  
  let label = '';
  
  // Fast path: aria-label
  if (el.getAttribute?.('aria-label')) {
    label = el.getAttribute('aria-label');
  }
  // Fast path: id with label[for]
  else if (el.id) {
    const lbl = root.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (lbl) label = lbl.textContent.trim();
  }
  // Slower path: closest label
  if (!label) {
    const near = el.closest('label') || el.parentElement?.querySelector('label');
    if (near) label = near.textContent.trim();
  }
  // Fallback: card text
  if (!label) {
    const card = el.closest('li,div,article,section');
    label = card?.textContent.trim() || '';
  }
  
  // Cache result
  if (useCache && label) {
    labelTextCache.set(el, label);
  }
  
  return label;
};

// Find section for a checkbox
export const findSection = (checkbox) => {
  const sectionSelectors = [
    '[data-section]',
    '[data-testid*="section"]',
    '.section',
    '.accordion',
    '[role="region"]'
  ];
  
  for (const selector of sectionSelectors) {
    const section = checkbox.closest(selector);
    if (section) {
      return section.id || section.className || 'unknown';
    }
  }
  
  // Fallback
  const parent = checkbox.closest('[class*="section"], [class*="accordion"], [class*="panel"]');
  return parent ? (parent.id || parent.className || 'unknown') : 'unknown';
};

// Find section DOM element by id; tries exact id, id prefix, and aliases (e.g. certification for certifications)
export function findSectionElement(sectionId, aliases = {}) {
  let el = document.getElementById(sectionId);
  if (el) return el;
  // Teal may use ids like "certifications-994ca3e3-..." (prefix match)
  try {
    el = document.querySelector(`[id^="${CSS.escape(sectionId)}-"]`);
    if (el) return el;
  } catch (_) {}
  const alts = aliases[sectionId];
  if (alts) {
    for (const alt of alts) {
      el = document.getElementById(alt);
      if (el) return el;
      try {
        el = document.querySelector(`[id^="${CSS.escape(alt)}-"]`);
        if (el) return el;
      } catch (_) {}
    }
  }
  return null;
}

// Discover all sections on the page
export const discoverAllSections = () => {
  console.group('🔍 Section Discovery');
  const allElementsWithIds = document.querySelectorAll('[id]');
  const sectionsFound = [];
  
  allElementsWithIds.forEach(el => {
    const id = el.id;
    const hasAccordion = el.querySelector('h3 button[aria-controls]');
    const hasCheckboxes = el.querySelectorAll('input[type="checkbox"], [role="checkbox"]').length > 0;
    
    if (hasAccordion || hasCheckboxes) {
      sectionsFound.push({
        id, 
        hasAccordion: !!hasAccordion, 
        checkboxCount: el.querySelectorAll('input[type="checkbox"], [role="checkbox"]').length
      });
    }
  });
  
  console.log('Found sections on page:', sectionsFound);
  console.groupEnd();
  return sectionsFound;
};

