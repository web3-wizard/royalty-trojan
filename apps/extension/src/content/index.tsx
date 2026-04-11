import { resolveCreatorWallet } from '../core/identity-client.js';
import { showToast } from './notifications';
import { YouTubeAdapter } from './youtube';
import { XAdapter } from './x';
import { TwitchAdapter } from './twitch';
import type { ReactElement } from 'react';
import type { CreatorIdentity, PlatformAdapter } from '../../../../packages/shared-types/creator';

const adapters: PlatformAdapter[] = [
  new YouTubeAdapter(),
  new XAdapter(),
  new TwitchAdapter(),
];

let currentAdapter: PlatformAdapter | null = null;
let currentCreator: CreatorIdentity | null = null;
let modalRoot: HTMLDivElement | null = null;
let reactRoot: { render(node: unknown): void; unmount(): void } | null = null;
let createRootFn: ((container: HTMLElement) => { render(node: unknown): void; unmount(): void }) | null = null;
let ModalComponent: ((props: {
  creatorName: string;
  recipientWallet: string;
  onClose: () => void;
  onSuccess: (signature: string, tier: unknown) => void;
}) => ReactElement) | null = null;
let injectBadgeFn: ((
  container: HTMLElement,
  props: { creatorWallet: string; creatorName: string; platform: string }
) => void) | null = null;

type CreatorWithWallet = CreatorIdentity & { wallet?: string };

async function ensureModalRuntime() {
  if (createRootFn && ModalComponent) return;

  const [{ createRoot }, modalModule] = await Promise.all([
    import('react-dom/client'),
    import('../ui/modal/Modal'),
  ]);

  createRootFn = createRoot as typeof createRootFn;
  ModalComponent = modalModule.Modal as typeof ModalComponent;
}

async function ensureBadgeRuntime() {
  if (injectBadgeFn) return;

  const badgeModule = await import('../ui/badge/Badge.js');
  injectBadgeFn = badgeModule.injectBadge;
}

async function extractDomainFromCreator(): Promise<string | null> {
  if (currentAdapter?.extractDomain) {
    return currentAdapter.extractDomain();
  }
  return null;
}

async function injectCreatorBadge(creator: CreatorIdentity, wallet: string) {
  if (!creator.badgeTarget) {
    console.warn('No badge target found for', creator.platform);
    showToast('Could not place creator badge on this page.', 'info');
    return;
  }

  await ensureBadgeRuntime();
  if (!injectBadgeFn) return;

  injectBadgeFn(creator.badgeTarget, {
    creatorWallet: wallet,
    creatorName: creator.displayName || creator.identifier,
    platform: creator.platform,
  });
}

async function showModal(creatorName: string, recipientWallet: string) {
  await ensureModalRuntime();
  if (!createRootFn || !ModalComponent) return;

  if (modalRoot) {
    reactRoot?.unmount();
    modalRoot.remove();
    modalRoot = null;
    reactRoot = null;
  }

  modalRoot = document.createElement('div');
  modalRoot.id = 'royalty-trojan-modal';
  document.body.appendChild(modalRoot);

  reactRoot = createRootFn(modalRoot);

  const Modal = ModalComponent;

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
      try {
        let domain: string | null = null;
        if ('extractDomain' in currentAdapter && currentAdapter.extractDomain) {
          domain = await extractDomainFromCreator();
        }

        const handle = currentCreator.identifier;
        const wallet = await resolveCreatorWallet(domain || undefined, handle);
        if (wallet) {
          await injectCreatorBadge(currentCreator, wallet);
          (currentCreator as CreatorWithWallet).wallet = wallet;
        } else {
          console.log('No Bags wallet found for creator');
        }
      } catch (error) {
        console.error('Failed to resolve creator wallet during detection:', error);
        showToast('Unable to verify creator wallet right now. Please try again.', 'error');
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
        showToast('Creator was not detected on this page.', 'error');
        return;
      }

      const creatorWithWallet = creator as CreatorWithWallet;
      let wallet = creatorWithWallet.wallet;

      try {
        if (!wallet) {
          const domain = await extractDomainFromCreator();
          wallet = await resolveCreatorWallet(domain || undefined, creator.identifier);
          if (wallet) {
            creatorWithWallet.wallet = wallet;
            await injectCreatorBadge(creator, wallet);
          }
        }
      } catch (error) {
        console.error('Failed to resolve wallet for subscription:', error);
        showToast('Could not contact wallet resolver. Try again in a moment.', 'error');
        return;
      }

      if (!wallet) {
        showToast('Creator has not set up Bags payments yet.', 'info');
        return;
      }

      const recipientWallet = wallet;
      await showModal(creator.displayName || creator.identifier, recipientWallet);
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