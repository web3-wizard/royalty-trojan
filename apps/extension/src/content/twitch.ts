interface CreatorIdentity {
  platform: string;
  identifier: string;
  displayName: string;
  url: string;
  badgeTarget?: HTMLElement | null;
}

interface PlatformAdapter {
  match(url: string): boolean;
  extractCreator(): CreatorIdentity | null;
  extractDomain?(): Promise<string | null>;
  findSubscribeButtons(): HTMLElement[];
}

export class TwitchAdapter implements PlatformAdapter {
  match(url: string): boolean {
    return url.includes('twitch.tv');
  }

  async extractDomain(): Promise<string | null> {
    // Look for website link in channel panels.
    const panels = document.querySelectorAll('.channel-panels-container a');
    for (const panel of panels) {
      const href = panel.getAttribute('href');
      if (href && href.startsWith('http') && !href.includes('twitch.tv')) {
        try {
          return new URL(href).hostname.replace(/^www\./, '');
        } catch {
          // Ignore malformed links and continue.
        }
      }
    }
    return null;
  }

  extractCreator(): CreatorIdentity | null {
    const path = location.pathname;
    const channelMatch = path.match(/^\/([^\/]+)$/);
    const channelName = channelMatch ? channelMatch[1] : null;
    if (!channelName || channelName === 'directory' || channelName === 'downloads') return null;

    const displayName = document.querySelector('.channel-info-content h1')?.textContent?.trim();
    const badgeTarget = document.querySelector('.channel-info-content h1')?.parentElement as HTMLElement;

    return {
      platform: 'twitch',
      identifier: channelName,
      displayName: displayName || channelName,
      url: location.href,
      badgeTarget,
    };
  }

  findSubscribeButtons(): HTMLElement[] {
    const buttons: HTMLElement[] = [];
    // Primary subscribe button (appears when not subscribed)
    const subButton = document.querySelector('[data-a-target="subscribe-button"]') as HTMLElement;
    if (subButton) buttons.push(subButton);
    // Also the "Subscribe" button inside the channel page
    document.querySelectorAll('button[data-test-selector="subscribe-button"]').forEach(el => {
      if (el instanceof HTMLElement) buttons.push(el);
    });
    return buttons;
  }
}