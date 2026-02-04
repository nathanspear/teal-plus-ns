document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements
    const runAutoOffBtn = document.getElementById('run-auto-off');
    const openSettingsBtn = document.getElementById('open-settings');
    const upgradeBtn = document.getElementById('upgrade-btn');
    const trialStatus = document.getElementById('trial-status');
    const operationsCount = document.getElementById('operations-count');
    const trialLabel = document.getElementById('trial-label');
    const statusBadge = document.getElementById('status-badge');
    const totalOperations = document.getElementById('total-operations');
    const checkboxesProcessed = document.getElementById('checkboxes-processed');

    // Load status from Chrome storage
    async function loadStatus() {
        try {
            const result = await chrome.storage.local.get([
                'teal_auto_usage',
                'teal_license_key',
                'teal_current_plan',
                'teal_settings',
                'teal_total_operations',
                'teal_checkboxes_processed',
                'teal_last_performance'
            ]);
            
            const usageCount = result.teal_auto_usage || 0;
            const isPremium = result.teal_license_key === 'TEAL_PREMIUM_2025';
            const currentPlan = result.teal_current_plan || 'basic';
            const totalOps = result.teal_total_operations || 0;
            const checkboxes = result.teal_checkboxes_processed || 0;
            const lastPerformance = result.teal_last_performance || null;
            
            console.log('Loaded status:', { usageCount, isPremium, currentPlan, totalOps, checkboxes, lastPerformance });
            updateUI(usageCount, isPremium, currentPlan, totalOps, checkboxes, lastPerformance);
        } catch (error) {
            console.error('Failed to load status:', error);
            updateUI(0, false, 'basic', 0, 0, null);
        }
    }

    // Update UI based on status (ns: unlimited use — no trial limit)
    function updateUI(usageCount, isPremium, currentPlan, totalOps, checkboxes, lastPerformance) {
        if (isPremium) {
            // Premium user - hide trial status, show pro status
            statusBadge.textContent = currentPlan.toUpperCase();
            statusBadge.style.background = 'rgba(139, 92, 246, 0.3)';
            
            // Hide trial status completely for pro users
            trialStatus.style.display = 'none';
            
            runAutoOffBtn.textContent = '🚀 Run Auto-OFF';
            runAutoOffBtn.disabled = false;
            runAutoOffBtn.className = 'btn btn-primary';
            
            // Hide upgrade button for pro users
            upgradeBtn.style.display = 'none';
            
            // Show pro message instead of trial status
            const proMessage = document.createElement('div');
            proMessage.className = 'pro-status';
            proMessage.style.cssText = `
                background: linear-gradient(135deg, #f0fdf4, #dcfce7);
                border: 1px solid #bbf7d0;
                border-radius: 16px;
                padding: 20px;
                text-align: center;
                margin-bottom: 20px;
                position: relative;
                overflow: hidden;
            `;
            proMessage.innerHTML = `
                <div style="
                    font-size: 36px; font-weight: 800; margin-bottom: 8px;
                    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                ">PRO</div>
                <div style="font-size: 14px; color: #059669; font-weight: 500;">
                    ${currentPlan.toUpperCase()} Plan Active - Unlimited Operations
                </div>
            `;
            
            // Insert pro message before features card
            const featuresCard = document.querySelector('.features-card');
            if (featuresCard && !document.querySelector('.pro-status')) {
                featuresCard.parentNode.insertBefore(proMessage, featuresCard);
            }
            
        } else {
            // Free user — unlimited use (ns version)
            statusBadge.textContent = 'Free';
            statusBadge.style.background = 'rgba(255,255,255,0.2)';
            
            trialStatus.style.display = 'block';
            const proMessage = document.querySelector('.pro-status');
            if (proMessage) proMessage.remove();
            
            trialStatus.className = 'trial-status active';
            operationsCount.textContent = '∞';
            operationsCount.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            operationsCount.style.webkitBackgroundClip = 'text';
            operationsCount.style.webkitTextFillColor = 'transparent';
            operationsCount.style.backgroundClip = 'text';
            
            trialLabel.textContent = 'Unlimited use';
            trialLabel.style.color = '#059669';
            
            runAutoOffBtn.textContent = '🚀 Run Auto-OFF';
            runAutoOffBtn.disabled = false;
            runAutoOffBtn.className = 'btn btn-primary';
            
            upgradeBtn.textContent = '💎 Upgrade to Pro';
            upgradeBtn.className = 'btn btn-premium';
            upgradeBtn.style.display = 'block';
        }
        
        // Update statistics
        totalOperations.textContent = totalOps.toLocaleString();
        checkboxesProcessed.textContent = checkboxes.toLocaleString();
        
        // Update performance metrics
        const performanceCard = document.getElementById('performance-card');
        const executionTimeEl = document.getElementById('execution-time');
        const successRateEl = document.getElementById('success-rate');
        const lastCheckboxesEl = document.getElementById('last-checkboxes');
        
        if (lastPerformance && lastPerformance.executionTime) {
            performanceCard.style.display = 'block';
            executionTimeEl.textContent = `${(lastPerformance.executionTime / 1000).toFixed(1)}s`;
            successRateEl.textContent = `${lastPerformance.successRate.toFixed(1)}%`;
            lastCheckboxesEl.textContent = lastPerformance.checkboxesProcessed.toLocaleString();
            
            // Color code success rate
            if (lastPerformance.successRate >= 95) {
                successRateEl.style.color = '#10b981';
            } else if (lastPerformance.successRate >= 80) {
                successRateEl.style.color = '#f59e0b';
            } else {
                successRateEl.style.color = '#ef4444';
            }
        } else {
            performanceCard.style.display = 'none';
        }
        
        // Add slide-in animation
        setTimeout(() => {
            document.querySelectorAll('.slide-in').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
        }, 100);
    }

    // Event listeners
    runAutoOffBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab.url && tab.url.includes('app.tealhq.com')) {
                await chrome.tabs.sendMessage(tab.id, { action: 'runAutoOff' });
                window.close();
            } else {
                showError('Please navigate to the Teal app to use this feature.');
            }
        } catch (error) {
            console.error('Failed to run Auto-OFF:', error);
            showError('Failed to run Auto-OFF. Please refresh the page and try again.');
        }
    });

    openSettingsBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab.url && tab.url.includes('app.tealhq.com')) {
                await chrome.tabs.sendMessage(tab.id, { action: 'openSettings' });
                window.close();
            } else {
                showError('Please navigate to the Teal app to access settings.');
            }
        } catch (error) {
            console.error('Failed to open settings:', error);
            showError('Failed to open settings. Please refresh the page and try again.');
        }
    });

    upgradeBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab.url && tab.url.includes('app.tealhq.com')) {
                await chrome.tabs.sendMessage(tab.id, { action: 'showPaymentModal' });
                window.close();
            } else {
                showError('Please navigate to the Teal app to upgrade.');
            }
        } catch (error) {
            console.error('Failed to show payment modal:', error);
            showError('Failed to show upgrade options. Please refresh the page and try again.');
        }
    });

    // Show error message
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            text-align: center;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 4000);
    }

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            // Check if any of our tracked values changed
            const relevantChanges = [
                'teal_auto_usage',
                'teal_license_key', 
                'teal_current_plan',
                'teal_total_operations',
                'teal_checkboxes_processed',
                'teal_last_performance'
            ].some(key => changes[key]);
            
            if (relevantChanges) {
                // Reload status when storage changes
                loadStatus();
            }
        }
    });

    // Add reset stats button for testing (only in development)
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.protocol === 'chrome-extension:';
        if (isLocal) {
            const resetBtn = document.createElement('button');
            resetBtn.textContent = '🔄 Reset Stats (Dev)';
            resetBtn.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                background: #ef4444;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 11px;
                cursor: pointer;
                z-index: 1000;
            `;
            resetBtn.onclick = async () => {
                try {
                    await chrome.storage.local.set({
                        'teal_total_operations': 0,
                        'teal_checkboxes_processed': 0,
                        'teal_auto_usage': 0
                    });
                    loadStatus();
                    showError('Stats reset to 0');
                } catch (error) {
                    showError('Failed to reset stats');
                }
            };
            document.body.appendChild(resetBtn);
        }
    } catch (_) { 
        // ignore errors in development mode detection
    }

    // Add refresh stats button
    const refreshStatsBtn = document.createElement('button');
    refreshStatsBtn.textContent = '📊 Refresh Stats';
    refreshStatsBtn.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: #10b981;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        z-index: 1000;
        transition: all 0.3s ease;
    `;
    refreshStatsBtn.onmouseenter = () => {
        refreshStatsBtn.style.background = '#059669';
        refreshStatsBtn.style.transform = 'scale(1.05)';
    };
    refreshStatsBtn.onmouseleave = () => {
        refreshStatsBtn.style.background = '#10b981';
        refreshStatsBtn.style.transform = 'scale(1)';
    };
    refreshStatsBtn.onclick = () => {
        loadStatus();
        refreshStatsBtn.textContent = '✅ Refreshed!';
        refreshStatsBtn.style.background = '#059669';
        setTimeout(() => {
            refreshStatsBtn.textContent = '📊 Refresh Stats';
            refreshStatsBtn.style.background = '#10b981';
        }, 1500);
    };
    document.body.appendChild(refreshStatsBtn);

    // Add test button for debugging
    const testBtn = document.createElement('button');
    testBtn.textContent = '🧪 Test Pro';
    testBtn.style.cssText = `
        position: fixed;
        bottom: 50px;
        right: 10px;
        background: #f59e0b;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        z-index: 1000;
        transition: all 0.3s ease;
    `;
    testBtn.onclick = async () => {
        try {
            // Test setting pro status
            await chrome.storage.local.set({
                'teal_license_key': 'TEAL_PREMIUM_2025',
                'teal_current_plan': 'pro'
            });
            showError('Pro status set! Refreshing...');
            setTimeout(() => loadStatus(), 1000);
        } catch (error) {
            showError('Failed to set pro status');
        }
    };
    // Only show test buttons in local/dev
    if (window.location.hostname === 'localhost') {
        document.body.appendChild(testBtn);
    }

    // Add test button for trial status
    const testTrialBtn = document.createElement('button');
    testTrialBtn.textContent = '🧪 Test Trial';
    testTrialBtn.style.cssText = `
        position: fixed;
        bottom: 50px;
        left: 10px;
        background: #3b82f6;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        z-index: 1000;
        transition: all 0.3s ease;
    `;
    testTrialBtn.onclick = async () => {
        try {
            // Test setting trial status
            await chrome.storage.local.set({
                'teal_license_key': '',
                'teal_current_plan': 'basic',
                'teal_auto_usage': 0
            });
            showError('Trial status set! Refreshing...');
            setTimeout(() => loadStatus(), 1000);
        } catch (error) {
            showError('Failed to set trial status');
        }
    };
    if (window.location.hostname === 'localhost') {
        document.body.appendChild(testTrialBtn);
    }

    // Initial load
    loadStatus();

    // Add some interactive effects
    document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.features-card, .stats-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });
    });

    document.addEventListener('mouseleave', () => {
        const cards = document.querySelectorAll('.features-card, .stats-card');
        cards.forEach(card => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
        });
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !runAutoOffBtn.disabled) {
            runAutoOffBtn.click();
        } else if (e.key === 's' || e.key === 'S') {
            openSettingsBtn.click();
        } else if (e.key === 'u' || e.key === 'U') {
            upgradeBtn.click();
        }
    });

    // Add tooltips
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
            position: absolute;
            background: #1f2937;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 1000;
            transform: translateY(-40px);
        `;
        
        if (btn.id === 'run-auto-off') {
            tooltip.textContent = 'Run Auto-OFF on current page (Enter)';
        } else if (btn.id === 'open-settings') {
            tooltip.textContent = 'Open settings panel (S)';
        } else if (btn.id === 'upgrade-btn') {
            tooltip.textContent = 'Upgrade to premium (U)';
        }
        
        btn.appendChild(tooltip);
        
        btn.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
        });
        
        btn.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });
    });
});
