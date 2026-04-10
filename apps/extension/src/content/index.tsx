import { createRoot, type Root } from 'react-dom/client';
import { Modal } from '../ui/modal/Modal';
import { resolveCreatorWallet } from '../core/identity-client.js';
import { injectBadge } from '../ui/badge/Badge.js';
import { YouTubeAdapter } from './youtube';
import { XAdapter } from './x';
import { TwitchAdapter } from './twitch';
import type { CreatorIdentity, PlatformAdapter } from '../../../../packages/shared-types/creator';

const adapters: PlatformAdapter[] = [
  new YouTubeAdapter(),
  new XAdapter(),
  new TwitchAdapter(),
];

let currentAdapter: PlatformAdapter | null = null;
let currentCreator: CreatorIdentity | null = null;
let modalRoot: HTMLDivElement | null = null;
let reactRoot: Root | null = null;

async function extractDomainFromCreator(creator: CreatorIdentity): Promise<string> {
  if (currentAdapter?.extractDomain) {
    const domain = await currentAdapter.extractDomain();
    if (domain) return domain;
  }

  // Fallback for platforms or when profile lookup fails.
  try {
    const hostname = new URL(creator.url).hostname.replace(/^www\./, '');
    if (hostname) return hostname;
  } catch {
    // Ignore malformed URLs and fallback to platform defaults.
  }

  if (creator.platform === 'youtube') return 'youtube.com';
  if (creator.platform === 'x') return 'x.com';
  return 'twitch.tv';
}

function injectCreatorBadge(creator: CreatorIdentity, wallet: string) {
  if (!creator.badgeTarget) {
    console.warn('No badge target found for', creator.platform);
    return;
  }

  injectBadge(creator.badgeTarget, {
    creatorWallet: wallet,
    creatorName: creator.displayName || creator.identifier,
    platform: creator.platform,
  });
}

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

  const handleSuccess = (signature: string, tier: unknown) => {
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

async function detectPlatform() {
  const url = location.href;
  const adapter = adapters.find((candidate) => candidate.match(url));
  if (adapter) {
    currentAdapter = adapter;
    currentCreator = adapter.extractCreator();
    console.log('[Royalty Trojan] Platform detected:', currentCreator);

    if (currentCreator) {
      // Attempt to resolve wallet and inject badge on creator pages.
      const creator = currentCreator;
      const domain = await extractDomainFromCreator(creator);
      const wallet = await resolveCreatorWallet(domain, creator.identifier);
      if (currentCreator === creator && wallet) {
        injectCreatorBadge(creator, wallet);
      }
    }

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
    async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const creator = currentCreator;
      if (!creator) {
        console.warn('No creator detected');
        return;
      }

      const domain = await extractDomainFromCreator(creator);

      const wallet = await resolveCreatorWallet(domain, creator.identifier);
      if (!wallet) {
        alert('Creator has not set up Bags payments yet.');
        return;
      }

      injectCreatorBadge(creator, wallet);

      showModal(creator.displayName || creator.identifier, wallet);
    },
    true
  );
}

let observer: MutationObserver | null = null;

function startObserving() {
  if (observer) observer.disconnect();
  observer = new MutationObserver(() => {
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

void detectPlatform();

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      void detectPlatform();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });

export { currentCreator, currentAdapter };