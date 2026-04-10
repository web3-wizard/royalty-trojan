export interface CreatorIdentity {
  platform: 'youtube' | 'x' | 'twitch';
  identifier: string; // e.g., channel ID, handle, username
  displayName?: string;
  url: string;
}

export interface PlatformAdapter {
  match(url: string): boolean;
  extractCreator(): CreatorIdentity | null;
  findSubscribeButtons(): HTMLElement[];
}