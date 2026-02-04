/**
 * Modals for Teal+ Extension (Payment & Settings)
 */

import { SUBSCRIPTION_PLANS, LICENSE } from './config.js';
import { showToast } from './ui-components.js';

export function showPaymentModal(storageManager, updateTrigger, showSettings) {
  const modal = document.createElement('div');
  modal.id = '__payment_modal';
  let currentPlan = storageManager.currentPlan;
  
  modal.innerHTML = `
    <style>
      #__payment_modal {
        position: fixed; inset: 0; z-index: 2147483648;
        backdrop-filter: blur(8px);
        background: rgba(0,0,0,.6);
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn .3s ease-out;
        padding: 20px;
      }
      .payment-dialog {
        background: #fff; border-radius: 20px; padding: 40px;
        box-shadow: 0 20px 40px rgba(0,0,0,.4);
        font: 600 16px system-ui; color: #111;
        display: flex; flex-direction: column; gap: 24px;
        width: 800px; max-width: 95vw; max-height: 90vh; overflow-y: auto;
        animation: popIn .3s ease-out;
      }
      .plans-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px; margin: 20px 0;
      }
      .plan-card {
        border: 2px solid #e5e7eb; border-radius: 16px; padding: 24px;
        text-align: center; transition: all .3s; cursor: pointer;
        position: relative;
      }
      .plan-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,.15); }
      .plan-card.selected { border-color: #059669; background: #f0fdf4; }
      .plan-card.selected::before {
        content: '✓'; position: absolute; top: -10px; right: -10px;
        background: #059669; color: white; width: 24px; height: 24px;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        font-weight: bold;
      }
      .plan-name { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
      .plan-price {
        font-size: 28px; font-weight: 800; color: #059669; margin-bottom: 16px;
      }
      .plan-features { text-align: left; margin: 16px 0; }
      .plan-features li {
        margin: 6px 0; padding-left: 16px; position: relative; font-size: 14px;
      }
      .plan-features li:before {
        content: '✓'; position: absolute; left: 0; color: #059669; font-weight: bold;
      }
      .payment-btn {
        background: linear-gradient(135deg, #059669, #047857);
        color: #fff; border: none; padding: 16px 24px;
        border-radius: 12px; font: 600 16px system-ui;
        cursor: pointer; transition: transform .2s; width: 100%;
      }
      .payment-btn:hover { transform: translateY(-2px); }
      .trial-info {
        background: #f3f4f6; padding: 16px; border-radius: 12px;
        font-size: 14px; color: #6b7280; text-align: center;
      }
      .close-btn {
        position: absolute; top: 16px; right: 16px;
        background: none; border: none; font-size: 24px;
        cursor: pointer; color: #9ca3af;
      }
      .plan-badge {
        position: absolute; top: 16px; left: 16px;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: #fff; padding: 4px 8px; border-radius: 12px;
        font-size: 10px; font-weight: 700;
      }
      @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes popIn { 0% { transform: scale(.9); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
    </style>
    <div class="payment-dialog">
      <button class="close-btn" onclick="this.closest('#__payment_modal').remove()">&times;</button>
      <div class="plan-badge">PREMIUM PLANS</div>
      <h2 style="margin: 0; font-size: 28px; text-align: center;">Choose Your Plan</h2>
      <div class="trial-info">
        <strong>Unlimited use</strong> (ns version)
      </div>
      
      <div class="plans-grid">
        ${Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => `
          <div class="plan-card ${key === currentPlan ? 'selected' : ''}" 
               data-plan="${key}">
            <div class="plan-name">${plan.name}</div>
            <div class="plan-price">$${plan.price}<span style="font-size: 14px;">/month</span></div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 16px;">
              ${plan.maxCheckboxes === Infinity ? 'Unlimited checkboxes' : `${plan.maxCheckboxes.toLocaleString()} checkboxes max`}
            </div>
            <ul class="plan-features">
              ${plan.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
      
      <button class="payment-btn" id="payment-btn">
        Subscribe to ${SUBSCRIPTION_PLANS[currentPlan].name} - $${SUBSCRIPTION_PLANS[currentPlan].price}/month
      </button>
      
      <div style="font-size: 12px; color: #9ca3af; text-align: center;">
        Secure payment powered by Stripe • Cancel anytime • 30-day money-back guarantee
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  const paymentBtn = modal.querySelector('#payment-btn');
  const planCards = modal.querySelectorAll('.plan-card');
  
  planCards.forEach(card => {
    card.addEventListener('click', () => {
      currentPlan = card.dataset.plan;
      planCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      paymentBtn.textContent = `Subscribe to ${SUBSCRIPTION_PLANS[currentPlan].name} - $${SUBSCRIPTION_PLANS[currentPlan].price}/month`;
    });
  });
  
  paymentBtn.addEventListener('click', () => processPayment(modal, storageManager, currentPlan, updateTrigger, showSettings));
}

async function processPayment(modal, storageManager, currentPlan, updateTrigger, showSettings) {
  modal.innerHTML = `
    <style>
      #__payment_modal {
        position: fixed; inset: 0; z-index: 2147483648;
        backdrop-filter: blur(8px);
        background: rgba(0,0,0,.6);
        display: flex; align-items: center; justify-content: center;
      }
      .payment-dialog {
        background: #fff; border-radius: 20px; padding: 40px;
        box-shadow: 0 20px 40px rgba(0,0,0,.4);
        text-align: center; width: 400px;
      }
      .loading-container {
        display: flex; flex-direction: column; align-items: center; gap: 20px;
      }
      .loading-text { font-size: 18px; font-weight: 600; color: #374151; margin: 0; }
      .loading-subtitle { font-size: 14px; color: #6b7280; margin: 0; }
    </style>
    <div class="payment-dialog">
      <div class="loading-container">
        <l-mirage size="60" speed="2.5" color="#059669"></l-mirage>
        <div class="loading-text">Processing Payment...</div>
        <div class="loading-subtitle">Please wait while we complete your ${SUBSCRIPTION_PLANS[currentPlan].name} subscription.</div>
      </div>
    </div>
    <script type="module" src="https://cdn.jsdelivr.net/npm/ldrs/dist/auto/mirage.js"></script>
  `;
  
  try {
    const customerId = 'teal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const response = await fetch('http://localhost:3000/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: currentPlan, customerId })
    });
    
    if (!response.ok) throw new Error('Failed to create payment intent');
    
    const { clientSecret, paymentIntentId } = await response.json();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const confirmResponse = await fetch('http://localhost:3000/api/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId, customerId, plan: currentPlan })
    });
    
    if (!confirmResponse.ok) throw new Error('Payment confirmation failed');
    
    const { licenseKey } = await confirmResponse.json();
    await storageManager.validateLicense(licenseKey, currentPlan);
    modal.remove();
    showToast(`🎉 ${SUBSCRIPTION_PLANS[currentPlan].name} subscription activated!`);
    updateTrigger();
    showSettings();
  } catch (error) {
    console.error('Payment error:', error);
    modal.innerHTML = `
      <div class="payment-dialog">
        <div class="error-icon" style="color: #ef4444; font-size: 48px; margin-bottom: 16px;">❌</div>
        <h3>Payment Failed</h3>
        <p>${error.message}</p>
        <button class="retry-btn" style="background: #059669; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin-top: 16px;">Retry Payment</button>
        <button class="retry-btn" onclick="this.closest('#__payment_modal').remove()" style="background: #6b7280; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin-top: 16px; margin-left: 8px;">Cancel</button>
      </div>
    `;
  }
}

export function showSettingsPanel(storageManager) {
  // Remove existing panel if any
  document.getElementById('__settings_panel')?.remove();
  
  const panel = document.createElement('div');
  panel.id = '__settings_panel';
  panel.innerHTML = `
    <style>
      #__settings_panel {
        position: fixed; inset: 0; z-index: 2147483647;
        backdrop-filter: blur(20px);
        background: rgba(0,0,0,.75);
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn .4s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 20px;
      }
      .settings-dialog {
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border-radius: 24px; padding: 0;
        box-shadow: 0 25px 50px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #ffffff;
        width: 700px; max-width: 95vw; max-height: 85vh; overflow: hidden;
        animation: popIn .4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
      }
      .settings-header {
        background: linear-gradient(135deg, #667eea, #764ba2);
        padding: 32px 40px 24px;
        text-align: center;
        position: relative;
        overflow: hidden;
      }
      .settings-header h2 {
        margin: 0; font-size: 28px; font-weight: 700;
        background: linear-gradient(135deg, #fff, #e2e8f0);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text;
        position: relative; z-index: 1;
      }
      .settings-header p {
        margin: 8px 0 0 0; opacity: 0.8; font-size: 16px;
        position: relative; z-index: 1;
      }
      .settings-content {
        padding: 32px 40px; max-height: 60vh; overflow-y: auto;
        background: linear-gradient(135deg, #1a1a2e, #16213e);
      }
      .settings-section {
        margin: 0 0 32px 0; padding: 24px;
        background: rgba(255,255,255,.05);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 16px;
        transition: all .3s ease;
      }
      .settings-section h3 {
        margin: 0 0 20px 0; color: #ffffff; font-size: 18px; font-weight: 600;
        display: flex; align-items: center; gap: 12px;
      }
      .setting-item {
        display: flex; justify-content: space-between; align-items: center;
        margin: 16px 0; padding: 12px 0;
        border-bottom: 1px solid rgba(255,255,255,.1);
      }
      .setting-item label {
        font-weight: 500; color: #e2e8f0; font-size: 15px;
        flex: 1;
      }
      .toggle-switch {
        position: relative; width: 56px; height: 28px;
        background: rgba(255,255,255,.2); border-radius: 14px; cursor: pointer;
        transition: all .3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .toggle-switch.active { 
        background: linear-gradient(135deg, #10b981, #059669);
      }
      .toggle-switch::after {
        content: ''; position: absolute; top: 2px; left: 2px;
        width: 20px; height: 20px; background: white; border-radius: 50%;
        transition: all .3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .toggle-switch.active::after { transform: translateX(28px); }
      .close-btn {
        position: absolute; top: 20px; right: 20px;
        background: rgba(255,255,255,.1); border: none; font-size: 20px;
        cursor: pointer; color: #ffffff; width: 40px; height: 40px;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        transition: all .3s ease;
      }
      .close-btn:hover { background: rgba(255,255,255,.2); transform: rotate(90deg); }
      @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes popIn { 0% { transform: scale(.9); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
    </style>
    
    <div class="settings-dialog">
      <button class="close-btn" onclick="this.closest('#__settings_panel').remove()">&times;</button>
      
      <div class="settings-header">
        <h2>⚙️ Settings & Configuration</h2>
        <p>Customize your Teal+ experience</p>
      </div>
      
      <div class="settings-content">
        <div class="settings-section">
          <h3>General Settings</h3>
          <div class="setting-item">
            <label>Auto-save settings</label>
            <div class="toggle-switch ${storageManager.settings.autoSave ? 'active' : ''}" 
                 data-setting="autoSave"></div>
          </div>
          <div class="setting-item">
            <label>Show progress bar</label>
            <div class="toggle-switch ${storageManager.settings.showProgress ? 'active' : ''}" 
                 data-setting="showProgress"></div>
          </div>
          <div class="setting-item">
            <label>Enable keyboard shortcuts</label>
            <div class="toggle-switch ${storageManager.settings.enableKeyboardShortcuts ? 'active' : ''}" 
                 data-setting="enableKeyboardShortcuts"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Add event listeners for toggles
  const toggles = panel.querySelectorAll('.toggle-switch');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', async () => {
      const setting = toggle.dataset.setting;
      storageManager.settings[setting] = !storageManager.settings[setting];
      await storageManager.save();
      toggle.classList.toggle('active');
    });
  });
}

