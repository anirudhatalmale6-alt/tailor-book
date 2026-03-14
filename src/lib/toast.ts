/**
 * Toast notifications and confirm dialogs — drop-in replacements for alert()/confirm().
 * Works anywhere without React context/hooks.
 */

let container: HTMLDivElement | null = null;

function getContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.style.cssText =
    'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;width:90%;max-width:360px;pointer-events:none';
  document.body.appendChild(container);
  return container;
}

export function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const c = getContainer();
  const el = document.createElement('div');
  const bg =
    type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#1e293b';
  el.style.cssText = `padding:12px 16px;border-radius:12px;font-size:14px;font-weight:500;color:#fff;background:${bg};box-shadow:0 4px 12px rgba(0,0,0,0.3);pointer-events:auto;opacity:0;transform:translateY(-12px);transition:all 0.25s ease-out`;
  el.textContent = message;
  c.appendChild(el);

  // Trigger animation
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  // Auto-dismiss
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-12px)';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

/**
 * Custom confirm dialog — replaces browser confirm().
 * Returns a Promise<boolean>.
 */
export function appConfirm(message: string, confirmLabel = 'Yes', cancelLabel = 'Cancel'): Promise<boolean> {
  return new Promise((resolve) => {
    // Overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;transition:opacity 0.2s ease-out';

    // Dialog box
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background:#2a1e3f;border-radius:16px;padding:24px;max-width:320px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.4);transform:scale(0.95);transition:transform 0.2s ease-out';

    // Message
    const msg = document.createElement('p');
    msg.style.cssText = 'color:#fff;font-size:15px;line-height:1.5;margin:0 0 20px 0;font-weight:500';
    msg.textContent = message;

    // Button container
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;gap:10px';

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = 'flex:1;padding:12px;border-radius:12px;background:#352650;color:rgba(255,255,255,0.7);font-size:14px;font-weight:600;border:none;cursor:pointer';
    cancelBtn.textContent = cancelLabel;

    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.style.cssText = 'flex:1;padding:12px;border-radius:12px;background:linear-gradient(to right,#d4a932,#e8c547);color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer';
    confirmBtn.textContent = confirmLabel;

    function cleanup(result: boolean) {
      overlay.style.opacity = '0';
      dialog.style.transform = 'scale(0.95)';
      setTimeout(() => { overlay.remove(); resolve(result); }, 200);
    }

    cancelBtn.onclick = () => cleanup(false);
    confirmBtn.onclick = () => cleanup(true);
    overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(confirmBtn);
    dialog.appendChild(msg);
    dialog.appendChild(btnContainer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      dialog.style.transform = 'scale(1)';
    });
  });
}
