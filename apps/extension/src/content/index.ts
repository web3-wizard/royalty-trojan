import React from 'react';
import { createRoot } from 'react-dom/client';
import { Modal } from '../ui/modal/Modal';
import { YouTubeAdapter } from './youtube';
import { XAdapter } from './x';
import { TwitchAdapter } from './twitch';
import type { CreatorIdentity, PlatformAdapter } from '@shared-types/creator';

const adapters: PlatformAdapter[] = [
  new YouTubeAdapter(),
  new XAdapter(),
  new TwitchAdapter(),
];

let currentAdapter: PlatformAdapter | null = null;
let currentCreator: CreatorIdentity | null = null;
let modalRoot: HTMLDivElement | null = null;
let reactRoot: ReturnType<typeof createRoot> | null = null;

function showModal(creatorName: string, recipientWallet: string) {
  if (modalRoot) {
    reactRoot?.unmount();
    modalRoot.remove();
    modalRoot = null;
    reactRoot = null;
  }

  modalRoot = document.createElement('div');
  modalRoot.id = 'royalty-trojan-modal';
  document.body.appendChild(modalRoot);

  reactRoot = createRoot(modalRoot);

  const closeModal = () => {
    if (!modalRoot) return;
    reactRoot?.unmount();
    modalRoot.remove();
    modalRoot = null;
    reactRoot = null;
  };

  const handleSuccess = (signature: string, tier: any) => {
    console.log('Stream created!', signature, tier);
    setTimeout(closeModal, 3000);
  };

  reactRoot.render(
    <Modal
      creatorName={creatorName}
      recipientWallet={recipientWallet}
      onClose={closeModal}
      onSuccess={handleSuccess}
    />
  );
}

function detectPlatform() {
  const url = location.href;
  const adapter = adapters.find(a => a.match(url));
  if (adapter) {
    currentAdapter = adapter;
    currentCreator = adapter.extractCreator();
    console.log('[Royalty Trojan] Platform detected:', currentCreator);
    scanForButtons();
    startObserving();
  } else {
    currentAdapter = null;
    currentCreator = null;
  }
}

function scanForButtons() {
  if (!currentAdapter) return;
  const buttons = currentAdapter.findSubscribeButtons();
  console.log(`[Royalty Trojan] Found ${buttons.length} subscribe button(s)`);
  buttons.forEach(attachInterceptor);
}

function attachInterceptor(button: HTMLElement) {
  if (button.hasAttribute('data-rt-intercepted')) return;
  button.setAttribute('data-rt-intercepted', 'true');

  button.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      const creator = currentCreator;
      if (!creator) {
        console.warn('No creator detected');
        return;
      }

      const mockWallet = '5X9yG3qWj...';
      showModal(creator.displayName || creator.identifier, mockWallet);
    },
    true
  );
}

let observer: MutationObserver | null = null;

function startObserving() {
  if (observer) observer.disconnect();
  observer = new MutationObserver(() => {
    // Re-scan periodically; for performance we debounce
    requestAnimationFrame(() => {
      if (currentAdapter) {
        scanForButtons();
      }
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Initial detection
detectPlatform();

// Handle SPA navigation (YouTube, X)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Small delay for new content to load
    setTimeout(() => {
      detectPlatform();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// Export for potential use by other modules
export { currentCreator, currentAdapter };