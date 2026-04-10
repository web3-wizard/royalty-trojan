interface CreatorIdentity {
  platform: string;
  identifier: string;
  displayName?: string;
  url: string;
  badgeTarget?: HTMLElement | null;
}

interface PlatformAdapter {
  match(url: string): boolean;
  extractCreator(): CreatorIdentity | null;
  extractDomain?(): Promise<string | null>;
  findSubscribeButtons(): HTMLElement[];
}

export class XAdapter implements PlatformAdapter {
  match(url: string): boolean {
    return url.includes('x.com') || url.includes('twitter.com');
  }

  async extractDomain(): Promise<string | null> {
    // Look for the website link in profile bio/header.
    const websiteLink = document.querySelector('a[data-testid="UserProfileHeader_website"]') as HTMLAnchorElement | null;
    if (websiteLink?.href) {
      try {
        return new URL(websiteLink.href).hostname.replace(/^www\./, '');
      } catch {
        // Ignore malformed links and continue.
      }
    }

    // Also check links inside the bio text.
    const bioLinks = document.querySelectorAll('[data-testid="UserDescription"] a');
    for (const link of bioLinks) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('http')) {
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
    // Get handle from URL or profile page
    const path = location.pathname;
    const handleMatch = path.match(/^\/([^\/]+)$/);
    const handle = handleMatch ? handleMatch[1] : null;
    if (!handle) return null;

    const displayName = document.querySelector('[data-testid="UserName"]')?.textContent?.trim();
    const badgeTarget = document.querySelector('[data-testid="UserName"]')?.parentElement as HTMLElement;

    return {
      platform: 'x',
      identifier: handle,
      displayName: displayName || undefined,
      url: location.href,
      badgeTarget,
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