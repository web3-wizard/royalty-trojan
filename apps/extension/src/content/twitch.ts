interface CreatorIdentity {
  platform: string;
  identifier: string;
  displayName: string;
  url: string;
}

interface PlatformAdapter {
  match(url: string): boolean;
  extractCreator(): CreatorIdentity | null;
  findSubscribeButtons(): HTMLElement[];
}

export class TwitchAdapter implements PlatformAdapter {
  match(url: string): boolean {
    return url.includes('twitch.tv');
  }

  extractCreator(): CreatorIdentity | null {
    const path = location.pathname;
    const channelMatch = path.match(/^\/([^\/]+)$/);
    const channelName = channelMatch ? channelMatch[1] : null;
    if (!channelName || channelName === 'directory' || channelName === 'downloads') return null;

    const displayName = document.querySelector('.channel-info-content h1')?.textContent?.trim();

    return {
      platform: 'twitch',
      identifier: channelName,
      displayName: displayName || channelName,
      url: location.href,
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