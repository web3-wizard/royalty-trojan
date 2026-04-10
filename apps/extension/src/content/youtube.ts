import type { CreatorIdentity, PlatformAdapter } from '../../../../packages/shared-types/creator';

export class YouTubeAdapter implements PlatformAdapter {
  match(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  extractCreator(): CreatorIdentity | null {
    // Try to get channel info from meta tags or URL
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    const channelId = this.extractChannelIdFromUrl(canonical || location.href);
    const channelName = document.querySelector('yt-formatted-string#text.ytd-channel-name')?.textContent?.trim()
      || document.querySelector('#owner #channel-name a')?.textContent?.trim();

    if (!channelId) return null;

    // Find channel header container for badge
    let badgeTarget: HTMLElement | null = null;
    if (location.pathname.startsWith('/@') || location.pathname.startsWith('/channel/') || location.pathname.startsWith('/c/')) {
      // Channel page: target the channel name area
      badgeTarget = document.querySelector('#channel-header #channel-name yt-formatted-string')?.parentElement as HTMLElement;
      if (!badgeTarget) {
        badgeTarget = document.querySelector('#owner #channel-name') as HTMLElement;
      }
    } else {
      // Video page: target the owner section under video
      badgeTarget = document.querySelector('#owner #channel-name') as HTMLElement;
    }

    return {
      platform: 'youtube',
      identifier: channelId,
      displayName: channelName || undefined,
      url: location.href,
      badgeTarget,
    };
  }

  findSubscribeButtons(): HTMLElement[] {
    const buttons: HTMLElement[] = [];
    
    // Primary subscribe button (appears on channel pages and under videos)
    const subscribeButton = document.querySelector('#subscribe-button tp-yt-paper-button') as HTMLElement;
    if (subscribeButton) buttons.push(subscribeButton);

    // Also look for any "Subscribe" text buttons
    document.querySelectorAll('ytd-subscribe-button-renderer').forEach(el => {
      const btn = el.querySelector('button') as HTMLElement;
      if (btn) buttons.push(btn);
    });

    return buttons;
  }

  private extractChannelIdFromUrl(url: string): string | null {
    // Matches /channel/UCxxxx or /@handle or /c/name
    const patterns = [
      /youtube\.com\/channel\/(UC[\w-]+)/,
      /youtube\.com\/@([\w-]+)/,
      /youtube\.com\/c\/([\w-]+)/,
      /youtube\.com\/user\/([\w-]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    // Try to get from meta tag (canonical may not include channel id)
    const channelMeta = document.querySelector('meta[itemprop="channelId"]')?.getAttribute('content');
    if (channelMeta) return channelMeta;

    return null;
  }
}