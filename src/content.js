(() => {
  /* abort if already injected */
  if (window.__autoOffLoaded) return;
  window.__autoOffLoaded = true;

  /* ── configuration ─────────────────────────────────────────────── */
  const SECTION_IDS = [
    'skills', 
    'interests', 
    'certifications', 
    'memberships', 
    'membership',
    'projects', 
    'activities', 
    'publications',
    'software',
    'software-tools',
    'tools',
    'tools-and-platforms',
    'career-highlights',
    'highlights',
    'technical-skills',
    'languages',
    'frameworks'
  ];
  const EXTRA_IDS = [
    'education-additional-information-994ca3e3-8454-4f8a-bcfa-54727b6ca182'
  ];
  const CLICK_WAIT   = 10;   // ms after each click (reliable delay for DOM update)
  const YIELD_EVERY  = 25;   // yield to browser frequently
  const YIELD_MS     = 10;   // ms yield duration
  const WAIT_SETTLE  = 150;  // ms to wait and verify checkbox state changed
  const BATCH_SIZE   = 5;    // very small batches for reliability
  const PROGRESS_UPDATE_INTERVAL = 25; // update progress every N checkboxes
  const ACCORDION_WAIT = 800; // ms to wait for accordion to fully open (INCREASED)
  const CONTENT_SETTLE_WAIT = 800; // ms to wait for content to settle after opening (INCREASED)
  const LAZY_LOAD_WAIT = 1500; // ms to wait for lazy-loaded content (INCREASED)
  const SECTION_PAUSE = 1000; // ms to pause between sections (let Teal save)

  /* ── licensing & payment system (ns: unlimited use) ────────────── */
  const LICENSE_KEY = 'TEAL_PREMIUM_2025';
  const TRIAL_LIMIT = Infinity; // unlimited
  
  const SUBSCRIPTION_PLANS = {
    basic: {
      name: 'Basic',
      price: 4.99,
      monthly: true,
      features: [
        '8,000 checkboxes unselected',
        'Basic filtering options',
        'Email support',
        'Standard processing speed'
      ],
      color: '#14b8a6',
      maxCheckboxes: 8000
    },
    pro: {
      name: 'Pro',
      price: 9.99,
      monthly: true,
      features: [
        'Unlimited checkboxes',
        'Advanced filtering & targeting',
        'Export to CSV/JSON',
        'Priority processing speed',
        'Priority support',
        'Custom section targeting',
        'Bulk operations'
      ],
      color: '#8b5cf6',
      maxCheckboxes: Infinity
    }
  };
  
  let usageCount = 0;
  let isPremium = false;
  let currentPlan = 'basic';
  let trialExpired = false;
  let settings = {};

  // Load settings from Chrome storage
  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get([
        'teal_auto_usage',
        'teal_license_key',
        'teal_current_plan',
        'teal_settings'
      ]);
      
      usageCount = result.teal_auto_usage || 0;
      isPremium = result.teal_license_key === LICENSE_KEY;
      currentPlan = result.teal_current_plan || 'basic';
      trialExpired = usageCount >= TRIAL_LIMIT;
      settings = result.teal_settings || {};
      
      // Merge with defaults
      const defaultSettings = {
        autoSave: true,
        showProgress: true,
        enableKeyboardShortcuts: true,
        enableRightClick: true,
        customSections: [],
        preserveSelected: [],
        excludeSections: [],
        theme: 'auto',
        language: 'en'
      };
      
      Object.keys(defaultSettings).forEach(key => {
        if (settings[key] === undefined) {
          settings[key] = defaultSettings[key];
        }
      });
      
      // Initialize lists
      preserveList = new Set(settings.preserveSelected);
      excludeList = new Set(settings.excludeSections);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // Save settings to Chrome storage
  const saveSettings = async () => {
    try {
      await chrome.storage.local.set({
        teal_auto_usage: usageCount,
        teal_license_key: isPremium ? LICENSE_KEY : null,
        teal_current_plan: currentPlan,
        teal_settings: settings
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const checkLicense = () => {
    if (isPremium) return true;
    if (!trialExpired) return true;
    return false;
  };

  const incrementUsage = async () => {
    usageCount++;
    trialExpired = usageCount >= TRIAL_LIMIT;
    await saveSettings();
  };

  const validateLicense = async (key, plan = 'basic') => {
    if (key === LICENSE_KEY) {
      isPremium = true;
      currentPlan = plan;
      await saveSettings();
      return true;
    }
    return false;
  };

  /* ── advanced features ─────────────────────────────────────────── */
  let isCtrlPressed = false;
  let isShiftPressed = false;
  let preserveList = new Set();
  let excludeList = new Set();

  // Track modifier keys
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Control') isCtrlPressed = true;
    if (e.key === 'Shift') isShiftPressed = true;
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Control') isCtrlPressed = false;
    if (e.key === 'Shift') isShiftPressed = false;
  });

  // Enhanced toggle logic
  const shouldToggle = (el, section) => {
    const elementId = el.id || el.getAttribute('data-id');
    
    // Ctrl+click: Force unselect
    if (isCtrlPressed && !isShiftPressed) {
      return true;
    }
    
    // Ctrl+Shift+click: Preserve (don't toggle)
    if (isCtrlPressed && isShiftPressed) {
      preserveList.add(elementId);
      settings.preserveSelected = Array.from(preserveList);
      saveSettings();
      toast(`Preserved: ${labelText(document, el)}`);
      return false;
    }
    
    // Normal behavior
    if (preserveList.has(elementId)) {
      return false;
    }
    
    if (excludeList.has(section)) {
      return false;
    }
    
    return true;
  };

  /* ── helpers ───────────────────────────────────────────────────── */
  const sleep  = ms => new Promise(r => setTimeout(r, ms));
  const dedupe = a  => [...new Set(a)];

  const cur = el =>
        el.matches?.('input[type="checkbox"]')
          ? el.checked
          : el.getAttribute?.('aria-checked') === 'true'
            || el.getAttribute?.('aria-pressed') === 'true';

  // Click and verify - balanced approach
  const turnOff = async (el, perfMetrics = null) => {
    const turnOffStart = performance.now();
    
    // Quick check first - skip if already unchecked
    const before = cur(el);
    if (!before) {
      if (perfMetrics) perfMetrics.totalTime += performance.now() - turnOffStart;
      return {changed:false,method:'noop',ok:true};
    }
    
    // Click the element
    el.click();
    
    // Wait for DOM to settle and verify
    if (WAIT_SETTLE > 0) {
      await sleep(WAIT_SETTLE);
    }
    
    // Verify it actually unchecked
    const after = cur(el);
    const success = !after; // Should be unchecked now
    
    if (perfMetrics) {
      perfMetrics.totalTime += performance.now() - turnOffStart;
      perfMetrics.methodCounts['click'] = (perfMetrics.methodCounts['click'] || 0) + 1;
      if (success) {
        perfMetrics.successCount++;
      } else {
        perfMetrics.failureCount++;
      }
    }
    
    return {changed:before !== after, method:'click', ok:success};
  };

  // Optimized labelText - cache results and avoid expensive queries when not needed
  const labelTextCache = new WeakMap();
  const labelText = (root, el, useCache = true) => {
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

  // Optimized openAccordion - fast but reliable
  const openAccordion = async (sec, perfMetrics = null) => {
    const accordionStart = performance.now();
    const btn = sec.querySelector('h3 button[aria-controls]');
    const rid = btn?.getAttribute('aria-controls');
    const reg = rid ? document.getElementById(rid) : sec.querySelector('[role="region"]');
    
    console.log(`[Accordion] Opening section: ${sec.id || 'unknown'}`);
    
    // Check if already open before waiting
    const isExpanded = btn?.getAttribute('aria-expanded') === 'true';
    const isVisible = reg && !reg.hidden;
    
    if (btn && (!isExpanded || !isVisible)) {
      console.log(`[Accordion] Section ${sec.id} needs to be opened`);
      btn.click();
      
      // Use MutationObserver for fast detection
      const expansionStart = performance.now();
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
        }, ACCORDION_WAIT);
        
        if (reg) {
          // Watch for hidden attribute changes
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
          
          // Watch for aria-expanded on button
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
          // No region element, just wait briefly
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
      
      // Reduced wait for content to settle
      await sleep(CONTENT_SETTLE_WAIT);
      console.log(`[Accordion] Section ${sec.id} content settled`);
      
      if (perfMetrics) perfMetrics.accordionTime += performance.now() - expansionStart;
    } else {
      console.log(`[Accordion] Section ${sec.id} already open`);
    }
    
    if (perfMetrics) perfMetrics.accordionTime += performance.now() - accordionStart;
    return reg || sec;
  };

  // Helper function to find section for a checkbox
  const findSection = (checkbox) => {
    // Look for common section identifiers
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
    
    // Fallback: look for parent with specific classes
    const parent = checkbox.closest('[class*="section"], [class*="accordion"], [class*="panel"]');
    return parent ? (parent.id || parent.className || 'unknown') : 'unknown';
  };

  // Initialize usage statistics if they don't exist
  const initializeStats = async () => {
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
  };

  /* ── UI elements ───────────────────────────────────────────────── */
  /* floating trigger */
  const trigger = document.createElement('button');
  trigger.id = '__auto_off_trigger';
  
  const updateTriggerButton = () => {
    // Unlimited usage for now
    trigger.textContent = `Auto OFF`;
    trigger.title = `Run Auto-OFF (Unlimited)`;
    trigger.style.background = 'linear-gradient(135deg,#14b8a6,#0d9488)';
  };
  
  Object.assign(trigger.style, {
    position:'fixed',right:'18px',bottom:'18px',zIndex:'2147483646',
    padding:'11px 16px',font:'600 13px system-ui,sans-serif',border:'none',
    borderRadius:'10px',color:'#fff',cursor:'pointer',boxShadow:'0 6px 20px rgba(0,0,0,.25)',
    transition:'transform .15s ease,opacity .3s'
  });
  
  trigger.onmouseenter = () => trigger.style.transform='scale(1.06)';
  trigger.onmouseleave = () => trigger.style.transform='scale(1)';
  document.body.appendChild(trigger);

  /* hide / show on scroll for cleanliness */
  let hideTimer; let lastScroll = window.scrollY;
  document.addEventListener('scroll', () => {
    const dy = Math.abs(window.scrollY - lastScroll);
    lastScroll = window.scrollY;
    if (dy < 8) return;
    trigger.style.opacity = '0';
    clearTimeout(hideTimer);
    hideTimer = setTimeout(()=>trigger.style.opacity='1',350);
  }, {passive:true});

  /* overlay + dialog creator */
  const makeOverlay = () => {
    const ov = document.createElement('div');
    ov.id = '__auto_off_overlay';
    ov.innerHTML = `
      <style>
        #__auto_off_overlay{
          position:fixed;inset:0;z-index:2147483647;
          backdrop-filter:blur(6px);
          background:rgba(0,0,0,.35);
          display:flex;align-items:center;justify-content:center;
          animation:fadeIn .25s ease-out;
        }
        #__auto_off_dialog{
          background:#fff;border-radius:16px;padding:32px 40px;
          box-shadow:0 12px 32px rgba(0,0,0,.35);font:600 18px system-ui;
          color:#111;display:flex;flex-direction:column;gap:18px;
          width:300px;max-width:80vw;text-align:center;
          animation:popIn .25s ease-out;
        }
        .loading-container {
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .progress{
          height:6px;width:100%;background:#e5e7eb;border-radius:4px;overflow:hidden;
        }
        .progress>div{
          height:100%;width:0;background:#0d9488;transition:width .2s ease;
        }
        .auto-btn{
          background:#ef4444;color:#fff;border:none;padding:8px 12px;
          border-radius:6px;font:600 12px system-ui;cursor:pointer;
        }
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes popIn{0%{transform:scale(.92);opacity:0}100%{transform:scale(1);opacity:1}}
      </style>
      <div id="__auto_off_dialog">
        <div class="loading-container">
          <l-newtons-cradle size="78" speed="1.4" color="#0d9488"></l-newtons-cradle>
          <div id="__auto_off_text">Preparing…</div>
          ${settings.showProgress ? '<div class="progress"><div></div></div>' : ''}
          <button class="auto-btn" id="__auto_off_cancel">Cancel</button>
        </div>
      </div>
      <script type="module" src="https://cdn.jsdelivr.net/npm/ldrs/dist/auto/newtonsCradle.js"></script>
    `;
    document.body.appendChild(ov);
    return ov;
  };

  /* toast banner */
  const toast = msg => {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style,{
      position:'fixed',left:'18px',bottom:'18px',zIndex:'2147483646',
      background:'#111',color:'#fff',padding:'10px 14px',borderRadius:'8px',
      font:'500 13px system-ui',boxShadow:'0 4px 14px rgba(0,0,0,.3)',opacity:'0',
      transition:'opacity .25s'
    });
    document.body.appendChild(t);
    requestAnimationFrame(()=>t.style.opacity='1');
    setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 3200);
  };

  // Helper function to find and uncheck ALL "full-time" checkboxes on the page
  const uncheckFullTimeInPosition = async (perfMetrics = null) => {
    try {
      console.log('[Auto-OFF] Searching for all "Full-time" checkboxes on the page...');
      
      // Search entire document for all labels with "Full-time" text
      const allLabels = document.querySelectorAll('label');
      console.log(`[Auto-OFF] Found ${allLabels.length} labels on page`);
      
      const results = [];
      
      for (const label of allLabels) {
        const labelTextValue = label.textContent?.trim().toLowerCase() || '';
        // Match "Full-time" exactly or variations
        if (labelTextValue === 'full-time' || labelTextValue === 'fulltime' || labelTextValue.includes('full-time')) {
          const checkboxId = label.getAttribute('for');
          console.log(`[Auto-OFF] Found label with "Full-time" text, for="${checkboxId}", text="${label.textContent?.trim()}"`);
          
          if (checkboxId) {
            const checkbox = document.getElementById(checkboxId);
            if (checkbox) {
              // Check if it's a checkbox element
              const isCheckbox = checkbox.matches('input[type="checkbox"]') || 
                                 checkbox.hasAttribute('aria-checked') || 
                                 checkbox.getAttribute('role') === 'checkbox' ||
                                 checkbox.getAttribute('role') === 'switch';
              
              if (isCheckbox) {
                const isCheckedValue = cur(checkbox);
                console.log(`[Auto-OFF] Found full-time checkbox: id="${checkboxId}", checked=${isCheckedValue}`);
                
                if (isCheckedValue) {
                  // Always uncheck full-time, regardless of other settings
                  const before = cur(checkbox);
                  const {changed, method, ok} = await turnOff(checkbox, perfMetrics);
                  
                  console.log(`[Auto-OFF] Attempted to uncheck full-time: changed=${changed}, method=${method}, ok=${ok}`);
                  
                  // turnOff already handles perfMetrics, just track checkbox count
                  if (perfMetrics) {
                    perfMetrics.checkboxCount++;
                  }
                  
                  results.push({
                    section: 'position-type',
                    label: label.textContent?.trim() || 'full-time',
                    before: before ? 'on' : 'off',
                    after: cur(checkbox) ? 'on' : 'off',
                    changed: changed,
                    method: method + (ok ? '' : ' (failed)')
                  });
                } else {
                  console.log(`[Auto-OFF] Full-time checkbox "${checkboxId}" already unchecked`);
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
  };

  /* ── main routine ───────────────────────────────────────────────── */
  async function runAutoOff() {
    // Initialize performance metrics
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

    trigger.disabled = true; trigger.style.opacity='0.5';

    const ov = makeOverlay();
    const txt = ov.querySelector('#__auto_off_text');
    const bar = ov.querySelector('.progress>div');
    const cancelBtn = ov.querySelector('#__auto_off_cancel');
    let cancelled = false;
    cancelBtn.onclick = () => cancelled = true;
    const escapeHandler = (e) => { if (e.key==='Escape') cancelled = true; };
    window.addEventListener('keydown', escapeHandler);

    const rows = [];
    let processed = 0, total = 0;
    let lastProgressUpdate = 0;

    // Throttled progress update function
    const updateProgress = (current, totalCount, passNumber = 1) => {
      const now = performance.now();
      if (now - lastProgressUpdate > 50 || current === totalCount) { // Update max every 50ms
        const passText = passNumber > 1 ? ` (Pass ${passNumber})` : '';
        txt.textContent = `Filtering ${current} / ${totalCount}${passText}`;
        if (bar) bar.style.width = `${(current/totalCount*100).toFixed(1)}%`;
        lastProgressUpdate = now;
      }
    };

    // Combine default sections with custom sections
    const allSections = [...SECTION_IDS, ...settings.customSections];

    // Function to get all checked checkboxes from a section (fresh query, no caching)
    const getCheckedCheckboxes = async (id, root, isFirstPass = false) => {
      console.log(`[Checkboxes] Querying section: ${id}, firstPass: ${isFirstPass}`);
      
      // More comprehensive selector to catch all checkbox types
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
      
      // ALWAYS do multiple queries to catch lazy-loaded content
      if (isFirstPass) {
        console.log(`[Checkboxes] Waiting for lazy-loaded content in ${id}...`);
        await sleep(LAZY_LOAD_WAIT);
        
        // Query multiple times to catch progressively loaded content
        let previousCount = toggles.length;
        let stableCount = 0;
        const maxAttempts = 3;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const additionalToggles = dedupe([...root.querySelectorAll(checkboxSelector)]);
          console.log(`[Checkboxes] Query ${attempt + 1} found ${additionalToggles.length} checkboxes in ${id}`);
          
          // Merge new checkboxes
          additionalToggles.forEach(toggle => {
            if (!toggles.includes(toggle)) {
              toggles.push(toggle);
            }
          });
          
          // Check if count is stable
          if (toggles.length === previousCount) {
            stableCount++;
            if (stableCount >= 2) {
              console.log(`[Checkboxes] Checkbox count stable at ${toggles.length}, stopping queries`);
              break;
            }
          } else {
            stableCount = 0;
            previousCount = toggles.length;
          }
          
          // Wait between queries if not the last attempt
          if (attempt < maxAttempts) {
            await sleep(500);
          }
        }
        
        console.log(`[Checkboxes] Final total after all queries: ${toggles.length} checkboxes in ${id}`);
      }
      
      // Filter for checked checkboxes that should be toggled
      const checkedToggles = toggles.filter(el => {
        if (!shouldToggle(el, id)) return false;
        return cur(el); // Only process checked ones
      });
      
      console.log(`[Checkboxes] Section ${id}: ${checkedToggles.length} checked checkboxes to process`);
      return checkedToggles;
    };

    // Helper: Discover all sections on the page with IDs
    const discoverAllSections = () => {
      console.group('🔍 Section Discovery');
      const allElementsWithIds = document.querySelectorAll('[id]');
      const sectionsFound = [];
      
      allElementsWithIds.forEach(el => {
        const id = el.id;
        // Look for elements that might be sections (have accordion buttons or checkboxes)
        const hasAccordion = el.querySelector('h3 button[aria-controls]');
        const hasCheckboxes = el.querySelectorAll('input[type="checkbox"], [role="checkbox"]').length > 0;
        
        if (hasAccordion || hasCheckboxes) {
          sectionsFound.push({id, hasAccordion: !!hasAccordion, checkboxCount: el.querySelectorAll('input[type="checkbox"], [role="checkbox"]').length});
        }
      });
      
      console.log('Found sections on page:', sectionsFound);
      console.groupEnd();
      return sectionsFound;
    };
    
    // Process ALL sections in parallel simultaneously - MAXIMUM SPEED!
    const processAllSectionsInParallel = async () => {
      txt.textContent = 'Preparing...';
      console.log(`[Processing] Waiting for page to be ready...`);
      
      // Wait longer for page to be fully loaded
      await sleep(1000);
      
      txt.textContent = 'Opening all sections...';
      console.log(`[Processing] Opening and processing ALL sections in parallel!`);
      
      // Discover what sections actually exist on the page
      discoverAllSections();
      
      // Debug: Show which sections we're looking for
      console.log(`[Processing] Looking for sections:`, allSections);
      
      // Get all valid sections
      const validSections = allSections
        .filter(id => !excludeList.has(id))
        .map(id => {
          const sec = document.getElementById(id);
          if (!sec) {
            console.log(`[Processing] ⚠️ Section "${id}" not found on page`);
          } else {
            console.log(`[Processing] ✓ Found section "${id}"`);
          }
          return { id, sec };
        })
        .filter(({sec}) => sec !== null);
      
      console.log(`[Processing] Found ${validSections.length} sections to process: ${validSections.map(s => s.id).join(', ')}`);
      
      // Explicit verification: report whether key sections were found on the page
      const keySectionIds = ['skills', 'projects', 'publications', 'certifications'];
      const validIds = new Set(validSections.map(s => s.id));
      const keyStatus = keySectionIds.map(id => `${id}=${validIds.has(id) ? 'found' : 'not found'}`).join(', ');
      console.log(`[Processing] Verified sections: ${keyStatus}`);
      
      // Open all sections in parallel
      const openPromises = validSections.map(async ({id, sec}) => {
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
      
      txt.textContent = 'Processing sections sequentially...';
      
      // Process sections ONE AT A TIME to avoid overwhelming Teal's server
      const allResults = [];
      for (const {id, root} of openedSections) {
        try {
          console.log(`[Processing] Starting section ${id} in parallel...`);
          
          // Get all checked checkboxes
          const toggles = await getCheckedCheckboxes(id, root, true);
          if (toggles.length === 0) {
            console.log(`[Processing] Section ${id}: No checkboxes`);
            continue;
          }
          
          console.log(`[Processing] Section ${id}: Processing ${toggles.length} checkboxes in parallel`);
          
          // Process ALL checkboxes in this section in parallel!
          const checkboxPromises = toggles.map(async (el) => {
            try {
              const before = cur(el);
              const label = labelText(root, el, true);
              
              // Click and verify
              const {changed, method, ok} = await turnOff(el, perfMetrics);
              
              // Wait a tiny bit for click delay
              if (CLICK_WAIT > 0) await sleep(CLICK_WAIT);
              
              const after = cur(el);
              
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
          console.log(`[Processing] Section ${id} complete: ${results.filter(r => r).length} processed`);
          
          // Pause to let Teal save changes to server
          console.log(`[Processing] Pausing ${SECTION_PAUSE}ms for Teal to save...`);
          await sleep(SECTION_PAUSE);
          
          allResults.push(...results.filter(r => r !== null));
        } catch (error) {
          console.error(`[Processing] Error processing section ${id}:`, error);
        }
      }
      
      // Process results
      allResults.forEach(result => {
        rows.push(result);
        if (result.changed) processed++;
        perfMetrics.checkboxCount++;
      });
      
      console.log(`[Processing] All sections complete: ${allResults.length} total checkboxes processed`);
      return allResults.length;
    };

    // Special handling: Always uncheck ALL "full-time" checkboxes on the page (before main processing)
    if (!cancelled) {
      txt.textContent = 'Processing Full-Time checkboxes...';
      console.log('[Processing] Starting full-time checkbox processing...');
      const fullTimeResults = await uncheckFullTimeInPosition(perfMetrics);
      if (fullTimeResults && fullTimeResults.length > 0) {
        fullTimeResults.forEach(result => rows.push(result));
        processed += fullTimeResults.length;
        console.log(`[Processing] Full-time processing complete: ${fullTimeResults.length} checkboxes`);
      }
    }

    // Main parallel processing - ALL sections at once!
    if (!cancelled) {
      console.log('[Processing] Starting parallel section processing...');
      await processAllSectionsInParallel();
      console.log('[Processing] All parallel processing complete');
    }

    /* extra single ids - process these once at the end */
    if (!cancelled) {
      txt.textContent = 'Processing extra checkboxes...';
      for (const ex of EXTRA_IDS) {
        if (cancelled) break;
        const el = document.getElementById(ex);
        if (!el) continue;
        
        if (!shouldToggle(el, 'extra')) continue;
        if (!cur(el)) continue; // Skip if already unchecked
        
        const before = cur(el);
        const {changed, method, ok} = await turnOff(el, perfMetrics);
        rows.push({
          section: 'extra',
          label: '#' + ex,
          before: before ? 'on' : 'off',
          after: cur(el) ? 'on' : 'off',
          changed,
          method: method + (ok ? '' : ' (failed)')
        });
        
        // turnOff already handles perfMetrics
        perfMetrics.checkboxCount++;
        if (changed) {
          processed++;
        }
      }
    }
    
    /* Find all skill-* and tool-* checkboxes (Software & Platforms & Tools / AI Tools & Platforms) */
    if (!cancelled) {
      txt.textContent = 'Processing software tools & platforms...';
      const toolPrefixes = ['skill-', 'tool-', 'platform-'];
      
      for (const prefix of toolPrefixes) {
        if (cancelled) break;
        console.log(`[Processing] Searching for ${prefix}* checkboxes...`);
        const allElements = document.querySelectorAll(`[id^="${prefix}"]`);
        console.log(`[Processing] Found ${allElements.length} elements with id starting with "${prefix}"`);
        
        for (const el of allElements) {
          if (cancelled) break;
          
          const isCheckbox = el.matches('input[type="checkbox"]') ||
                             el.getAttribute('role') === 'checkbox' ||
                             el.getAttribute('role') === 'switch';
          
          if (!isCheckbox) continue;
          if (!shouldToggle(el, 'software-tools')) continue;
          if (!cur(el)) continue;
          
          const before = cur(el);
          const label = el.id.replace(new RegExp('^' + prefix.replace(/-/g, '\\-')), '');
          const {changed, method, ok} = await turnOff(el, perfMetrics);
          
          console.log(`[Processing] Tools & Platforms "${label}": ${ok ? 'SUCCESS' : 'FAILED'}`);
          
          rows.push({
            section: 'software-tools',
            label: label,
            before: before ? 'on' : 'off',
            after: cur(el) ? 'on' : 'off',
            changed,
            method: method + (ok ? '' : ' (failed)')
          });
          
          perfMetrics.checkboxCount++;
          if (changed) processed++;
          if (CLICK_WAIT > 0) await sleep(CLICK_WAIT);
        }
      }
      console.log('[Processing] Software tools & platforms processing complete');
    }

    window.removeEventListener('keydown', escapeHandler);
    ov.remove();
    trigger.disabled = false; trigger.style.opacity='1';

    if (cancelled) {
      toast('Auto‑OFF cancelled');
      return;
    }

    // Calculate final metrics
    perfMetrics.totalTime = performance.now() - perfMetrics.startTime;
    const changed = rows.filter(r=>r.changed).length;
    
    // Log performance metrics
    console.group('🚀 Auto-OFF Performance Metrics');
    console.log(`Total execution time: ${perfMetrics.totalTime.toFixed(2)}ms`);
    console.log(`Total checkboxes processed: ${perfMetrics.checkboxCount}`);
    
    if (perfMetrics.checkboxCount > 0) {
      const successRate = (perfMetrics.successCount / perfMetrics.checkboxCount) * 100;
      console.log(`Success rate: ${successRate.toFixed(1)}%`);
      console.log(`Average time per checkbox: ${(perfMetrics.totalTime / perfMetrics.checkboxCount).toFixed(2)}ms`);
    } else {
      console.log('Success rate: N/A (no checkboxes processed)');
    }
    
    if (perfMetrics.totalTime > 0) {
      console.log(`Time spent waiting: ${perfMetrics.waitTime.toFixed(2)}ms (${((perfMetrics.waitTime / perfMetrics.totalTime) * 100).toFixed(1)}%)`);
      console.log(`Time spent on accordions: ${perfMetrics.accordionTime.toFixed(2)}ms (${((perfMetrics.accordionTime / perfMetrics.totalTime) * 100).toFixed(1)}%)`);
    }
    
    console.log(`Processing time: ${perfMetrics.processingTime.toFixed(2)}ms`);
    console.log('Method distribution:', perfMetrics.methodCounts);
    console.log('Section times:', perfMetrics.sectionTimes);
    console.groupEnd();
    
    // Group results by section for better readability
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
    
    // Post-run summary: key sections found + processed vs not found
    const keySectionIds = ['skills', 'projects', 'publications', 'certifications'];
    console.group('📋 Verified sections (post-run)');
    keySectionIds.forEach(id => {
      const sectionRows = sectionGroups[id];
      const status = sectionRows
        ? `found + processed (${sectionRows.length} checkbox(es), ${sectionRows.filter(r => r.changed).length} changed)`
        : 'not found';
      console.log(`${id}: ${status}`);
    });
    console.groupEnd();
    
    console.info(`[auto‑off] scanned=${rows.length} • changed=${changed} • success=${perfMetrics.successCount} • failed=${perfMetrics.failureCount}`);
    
    // Store performance metrics
    try {
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
    } catch (error) {
      console.error('Failed to store performance metrics:', error);
    }
    
    // Update usage statistics
    try {
      const result = await chrome.storage.local.get([
        'teal_total_operations',
        'teal_checkboxes_processed',
        'teal_auto_usage'
      ]);
      
      const totalOps = (result.teal_total_operations || 0) + 1;
      const totalCheckboxes = (result.teal_checkboxes_processed || 0) + changed;
      
      await chrome.storage.local.set({
        'teal_total_operations': totalOps,
        'teal_checkboxes_processed': totalCheckboxes,
      });
      
      console.log(`Usage stats updated: ${totalOps} operations, ${totalCheckboxes} checkboxes`);
    } catch (error) {
      console.error('Failed to update usage stats:', error);
    }
    
    const executionTimeSec = (perfMetrics.totalTime / 1000).toFixed(1);
    const successRate = perfMetrics.checkboxCount > 0 
      ? ((perfMetrics.successCount / perfMetrics.checkboxCount) * 100).toFixed(0)
      : '100';
    const successMsg = `Auto‑OFF complete! ${changed} items switched off in ${executionTimeSec}s (${successRate}% success)`;
    toast(successMsg);
  }

  /* ── wire trigger ───────────────────────────────────────────────── */
  trigger.onclick = () => { 
    if (!trigger.disabled) {
      runAutoOff();
    }
  };

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (!settings.enableKeyboardShortcuts) return;
    
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      runAutoOff();
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
    
    if (request.action === 'storageChanged') {
      // Reload settings when storage changes
      loadSettings().then(() => {
        updateTriggerButton();
      });
      sendResponse({ status: 'updated' });
      return true;
    }
  });

  // Initialize the extension
  const init = async () => {
    await loadSettings();
    updateTriggerButton();
    await initializeStats(); // Initialize usage statistics
    console.log('Teal+ v1.1.0 initialized');
  };

  // Start the extension
  init();
})();

