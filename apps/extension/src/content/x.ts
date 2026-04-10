import type { CreatorIdentity, PlatformAdapter } from '@shared-types/creator';

export class XAdapter implements PlatformAdapter {
  match(url: string): boolean {
    return url.includes('x.com') || url.includes('twitter.com');
  }

  extractCreator(): CreatorIdentity | null {
    // Get handle from URL or profile page
    const path = location.pathname;
    const handleMatch = path.match(/^\/([^\/]+)$/);
    const handle = handleMatch ? handleMatch[1] : null;
    if (!handle) return null;

    const displayName = document.querySelector('[data-testid="UserName"]')?.textContent?.trim();

    return {
      platform: 'x',
      identifier: handle,
      displayName: displayName || undefined,
      url: location.href,
    };
  }

  findSubscribeButtons(): HTMLElement[] {
    const buttons: HTMLElement[] = [];
    // "Subscribe" button for X Premium (formerly Super Follows)
    // Also consider "Follow" as the equivalent action (will be intercepted later)
    document.querySelectorAll('[data-testid$="-follow"], [data-testid$="-subscribe"]').forEach(el => {
      if (el instanceof HTMLElement) buttons.push(el);
    });
    return buttons;
  }
}