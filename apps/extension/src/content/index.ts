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
  buttons.forEach((btn: HTMLElement, i: number) => {
    // Mark for later interception (will be handled in next phase)
    btn.setAttribute('data-rt-detected', 'true');
    console.log(`[Royalty Trojan] Button ${i+1}:`, btn);
  });
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