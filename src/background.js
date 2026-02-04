// Background service worker for Teal Auto-OFF Pro extension

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Teal Auto-OFF Pro extension installed');
        
        // Set default values
        chrome.storage.local.set({
            teal_auto_usage: 0,
            teal_license_key: null,
            teal_current_plan: 'basic',
            teal_settings: {
                autoSave: true,
                showProgress: true,
                enableKeyboardShortcuts: true,
                enableRightClick: true,
                customSections: [],
                preserveSelected: [],
                excludeSections: [],
                theme: 'auto',
                language: 'en'
            }
        });
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Teal Auto-OFF Pro extension started');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getStatus') {
        // Return current extension status
        chrome.storage.local.get([
            'teal_auto_usage',
            'teal_license_key',
            'teal_current_plan'
        ], (result) => {
                    sendResponse({
            usageCount: result.teal_auto_usage || 0,
            isPremium: result.teal_license_key === 'TEAL_PREMIUM_2025',
            currentPlan: result.teal_current_plan || 'basic'
        });
        });
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'updateUsage') {
        // Update usage count
        chrome.storage.local.get(['teal_auto_usage'], (result) => {
            const newCount = (result.teal_auto_usage || 0) + 1;
            chrome.storage.local.set({ teal_auto_usage: newCount });
            sendResponse({ success: true, newCount });
        });
        return true;
    }
    
    if (request.action === 'validateLicense') {
        // Validate license key
        const { key, plan } = request;
        if (key === 'TEAL_PREMIUM_2025') {
            chrome.storage.local.set({
                teal_license_key: key,
                teal_current_plan: plan || 'basic'
            });
            sendResponse({ success: true, plan: plan || 'basic' });
        } else {
            sendResponse({ success: false, error: 'Invalid license key' });
        }
        return true;
    }
});

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && 
        tab.url && 
        tab.url.includes('app.tealhq.com')) {
        
        // Check if content script is already injected
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
                // Content script not injected, inject it
                try {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ['content.js']
                    }).then(() => {
                        console.log('Content script injected successfully');
                    }).catch(err => {
                        console.log('Failed to inject content script:', err);
                    });
                } catch (err) {
                    console.log('Scripting API not available:', err);
                }
            }
        });
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    if (tab.url && tab.url.includes('app.tealhq.com')) {
        // Open popup (this is handled by manifest.json action.default_popup)
        // But we can also handle it programmatically if needed
        console.log('Extension icon clicked on Teal app');
    }
});

// Handle keyboard shortcuts (optional)
// Removed commands listener to prevent service worker crashes
// Commands can be added back later if needed

// Optional: Handle web requests for analytics or external services
// Guard webRequest listener behind try/catch; some environments block it
try {
    chrome.webRequest.onBeforeRequest.addListener(
        (details) => {
            // You can add analytics tracking here
        },
        { urls: ["<all_urls>"] }
    );
} catch (e) {
    console.warn('webRequest API unavailable:', e);
}

// Handle storage changes for cross-tab synchronization
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        // Broadcast changes to all tabs
        chrome.tabs.query({ url: "*://app.tealhq.com/*" }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'storageChanged',
                    changes: changes
                }).catch(() => {
                    // Tab might not have content script loaded yet
                });
            });
        });
    }
});
