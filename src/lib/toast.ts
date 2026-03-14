/**
 * Simple toast notification — drop-in replacement for alert().
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
