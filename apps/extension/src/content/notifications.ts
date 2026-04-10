type ToastType = 'error' | 'success' | 'info';

const TOAST_CONTAINER_ID = 'rt-toast-container';

function ensureContainer(): HTMLElement {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (container) return container;

  container = document.createElement('div');
  container.id = TOAST_CONTAINER_ID;
  Object.assign(container.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: '2147483647',
    pointerEvents: 'none',
  } as CSSStyleDeclaration);
  document.body.appendChild(container);
  return container;
}

function getBackgroundColor(type: ToastType): string {
  if (type === 'success') return '#0f9d58';
  if (type === 'info') return '#1a73e8';
  return '#d93025';
}

export function showToast(message: string, type: ToastType = 'error') {
  const container = ensureContainer();
  const toast = document.createElement('div');
  toast.textContent = message;

  Object.assign(toast.style, {
    minWidth: '260px',
    maxWidth: '360px',
    padding: '10px 12px',
    borderRadius: '10px',
    color: '#fff',
    backgroundColor: getBackgroundColor(type),
    boxShadow: '0 8px 20px rgba(0,0,0,0.24)',
    fontSize: '13px',
    lineHeight: '1.35',
    pointerEvents: 'auto',
    opacity: '1',
    transition: 'opacity 220ms ease',
  } as CSSStyleDeclaration);

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
      if (!container.childElementCount) {
        container.remove();
      }
    }, 220);
  }, 3200);
}
