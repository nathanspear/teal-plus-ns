/**
 * UI Components for Teal+ Extension
 */

import { SUBSCRIPTION_PLANS, TIMING } from './config.js';

export class TriggerButton {
  constructor(onClick, onRightClick) {
    this.button = document.createElement('button');
    this.button.id = '__auto_off_trigger';
    this.onClick = onClick;
    this.onRightClick = onRightClick;
    this.init();
  }

  init() {
    Object.assign(this.button.style, {
      position: 'fixed',
      right: '18px',
      bottom: '18px',
      zIndex: '2147483646',
      padding: '11px 16px',
      font: '600 13px system-ui,sans-serif',
      border: 'none',
      borderRadius: '10px',
      color: '#fff',
      cursor: 'pointer',
      boxShadow: '0 6px 20px rgba(0,0,0,.25)',
      transition: 'transform .15s ease,opacity .3s',
      background: 'linear-gradient(135deg,#14b8a6,#0d9488)'
    });
    
    this.button.textContent = 'Auto OFF';
    this.button.title = 'Run Auto-OFF (Unlimited)';
    
    this.button.onmouseenter = () => this.button.style.transform = 'scale(1.06)';
    this.button.onmouseleave = () => this.button.style.transform = 'scale(1)';
    this.button.onclick = () => this.onClick();
    this.button.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.onRightClick();
    });
    
    document.body.appendChild(this.button);
    this.setupScrollBehavior();
  }

  setupScrollBehavior() {
    let hideTimer;
    let lastScroll = window.scrollY;
    
    document.addEventListener('scroll', () => {
      const dy = Math.abs(window.scrollY - lastScroll);
      lastScroll = window.scrollY;
      if (dy < 8) return;
      this.button.style.opacity = '0';
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => this.button.style.opacity = '1', 350);
    }, { passive: true });
  }

  setDisabled(disabled) {
    this.button.disabled = disabled;
    this.button.style.opacity = disabled ? '0.5' : '1';
  }

  update(isPremium, currentPlan, usageCount, trialLimit) {
    // Currently showing unlimited
    this.button.textContent = 'Auto OFF';
    this.button.title = 'Run Auto-OFF (Unlimited)';
  }
}

export class ProgressOverlay {
  constructor(showProgress = true) {
    this.showProgress = showProgress;
    this.overlay = null;
    this.textEl = null;
    this.barEl = null;
    this.cancelBtn = null;
    this.cancelled = false;
  }

  show() {
    this.overlay = document.createElement('div');
    this.overlay.id = '__auto_off_overlay';
    this.overlay.innerHTML = `
      <style>
        #__auto_off_overlay {
          position: fixed; inset: 0; z-index: 2147483647;
          backdrop-filter: blur(6px);
          background: rgba(0,0,0,.35);
          display: flex; align-items: center; justify-content: center;
          animation: fadeIn .25s ease-out;
        }
        #__auto_off_dialog {
          background: #fff; border-radius: 16px; padding: 32px 40px;
          box-shadow: 0 12px 32px rgba(0,0,0,.35); font: 600 18px system-ui;
          color: #111; display: flex; flex-direction: column; gap: 18px;
          width: 300px; max-width: 80vw; text-align: center;
          animation: popIn .25s ease-out;
        }
        .loading-container {
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .progress {
          height: 6px; width: 100%; background: #e5e7eb; border-radius: 4px; overflow: hidden;
        }
        .progress>div {
          height: 100%; width: 0; background: #0d9488; transition: width .2s ease;
        }
        .auto-btn {
          background: #ef4444; color: #fff; border: none; padding: 8px 12px;
          border-radius: 6px; font: 600 12px system-ui; cursor: pointer;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn { 0% { transform: scale(.92); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
      </style>
      <div id="__auto_off_dialog">
        <div class="loading-container">
          <l-newtons-cradle size="78" speed="1.4" color="#0d9488"></l-newtons-cradle>
          <div id="__auto_off_text">Preparing…</div>
          ${this.showProgress ? '<div class="progress"><div></div></div>' : ''}
          <button class="auto-btn" id="__auto_off_cancel">Cancel</button>
        </div>
      </div>
      <script type="module" src="https://cdn.jsdelivr.net/npm/ldrs/dist/auto/newtonsCradle.js"></script>
    `;
    document.body.appendChild(this.overlay);
    
    this.textEl = this.overlay.querySelector('#__auto_off_text');
    this.barEl = this.overlay.querySelector('.progress>div');
    this.cancelBtn = this.overlay.querySelector('#__auto_off_cancel');
    this.cancelBtn.onclick = () => this.cancelled = true;
    
    const escapeHandler = (e) => { if (e.key === 'Escape') this.cancelled = true; };
    window.addEventListener('keydown', escapeHandler);
    this.escapeHandler = escapeHandler;
  }

  updateProgress(current, total, passNumber = 1) {
    const passText = passNumber > 1 ? ` (Pass ${passNumber})` : '';
    this.textEl.textContent = `Filtering ${current} / ${total}${passText}`;
    if (this.barEl) this.barEl.style.width = `${(current / total * 100).toFixed(1)}%`;
  }

  setText(text) {
    this.textEl.textContent = text;
  }

  isCancelled() {
    return this.cancelled;
  }

  remove() {
    if (this.escapeHandler) {
      window.removeEventListener('keydown', this.escapeHandler);
    }
    this.overlay?.remove();
  }
}

export const showToast = (msg) => {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed',
    left: '18px',
    bottom: '18px',
    zIndex: '2147483646',
    background: '#111',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '8px',
    font: '500 13px system-ui',
    boxShadow: '0 4px 14px rgba(0,0,0,.3)',
    opacity: '0',
    transition: 'opacity .25s'
  });
  document.body.appendChild(t);
  requestAnimationFrame(() => t.style.opacity = '1');
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 3200);
};

