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

async function openCurrentCreatorTip(): Promise<boolean> {
  const creator = currentCreator;
  if (!creator) {
    showToast('Creator was not detected on this page.', 'error');
    return false;
  }

  const creatorWithWallet = creator as CreatorWithWallet;
  let wallet: string | undefined = creatorWithWallet.wallet;

  try {
    if (!wallet) {
      const domain = await extractDomainFromCreator();
      wallet = await resolveCreatorWallet(domain ?? undefined, creator.identifier);
      if (wallet) {
        creatorWithWallet.wallet = wallet;
      }
    }
  } catch (error) {
    console.error('Failed to resolve wallet for quick tip:', error);
    showToast('Could not contact wallet resolver. Try again in a moment.', 'error');
    return false;
  }

  if (!wallet) {
    showToast('Creator has not set up Bags payments yet.', 'info');
    return false;
  }

  await showModal(creator.displayName || creator.identifier, wallet);
  return true;
}

async function resolveCurrentCreatorWallet(): Promise<string | null> {
  const creator = currentCreator;
  if (!creator) return null;

  const creatorWithWallet = creator as CreatorWithWallet;
  if (creatorWithWallet.wallet) return creatorWithWallet.wallet;

  const domain = await extractDomainFromCreator();
  const wallet = await resolveCreatorWallet(domain ?? undefined, creator.identifier);
  if (wallet) {
    creatorWithWallet.wallet = wallet;
  }
  return wallet;
}

async function quickTipCurrentCreator(amount: number): Promise<{ success: boolean; signature?: string; error?: string }> {
  const creator = currentCreator;
  if (!creator) {
    return { success: false, error: 'Creator was not detected on this page.' };
  }

  let wallet: string | null = null;

  try {
    wallet = await resolveCurrentCreatorWallet();
  } catch (error) {
    console.error('Failed to resolve wallet for quick tip:', error);
    return { success: false, error: 'Could not resolve creator wallet.' };
  }

  if (!wallet) {
    return { success: false, error: 'Creator has not set up Bags payments yet.' };
  }

  return await new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'CREATE_STREAM',
        payload: {
          recipient: wallet,
          amount,
          tier: 'Quick Tip',
        },
      },
      (response: { success?: boolean; signature?: string; error?: string | { message?: string } }) => {
        if (response?.success) {
          resolve({ success: true, signature: response.signature });
          return;
        }

        const errorMessage =
          typeof response?.error === 'string'
            ? response.error
            : response?.error?.message || 'Quick tip failed';

        resolve({ success: false, error: errorMessage });
      }
    );
  });
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
      let wallet: string | null | undefined = creatorWithWallet.wallet;

      try {
        if (!wallet) {
          const domain = await extractDomainFromCreator();
          wallet = await resolveCreatorWallet(domain ?? undefined, creator.identifier);
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'OPEN_CURRENT_CREATOR_TIP') {
    void openCurrentCreatorTip().then((success) => {
      sendResponse({ success });
    });
    return true;
  }

  if (message?.type === 'GET_CURRENT_PAGE_STATUS') {
    void (async () => {
      const creator = currentCreator;
      if (!creator) {
        sendResponse({
          success: true,
          supported: true,
          creatorDetected: false,
          bagsEnabled: false,
        });
        return;
      }

      try {
        const wallet = await resolveCurrentCreatorWallet();
        sendResponse({
          success: true,
          supported: true,
          creatorDetected: true,
          bagsEnabled: Boolean(wallet),
          creatorName: creator.displayName || creator.identifier,
          wallet,
          platform: creator.platform,
        });
      } catch (error) {
        console.error('Failed to build current page status:', error);
        sendResponse({
          success: false,
          supported: true,
          creatorDetected: true,
          bagsEnabled: false,
          error: 'Failed to resolve creator wallet',
        });
      }
    })();
    return true;
  }

  if (message?.type === 'QUICK_TIP_CURRENT_CREATOR') {
    const amount = typeof message?.payload?.amount === 'number' ? message.payload.amount : 5;
    void quickTipCurrentCreator(amount).then((result) => {
      sendResponse(result);
    });
    return true;
  }

  return false;
});

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