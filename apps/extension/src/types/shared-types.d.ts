declare module '@shared-types/creator' {
  export interface CreatorIdentity {
    platform: string;
    identifier: string;
    displayName?: string;
    url: string;
    wallet?: string;
    domain?: string;
  }

  export interface PlatformAdapter {
    match(url: string): boolean;
    extractCreator(): CreatorIdentity | null;
    findSubscribeButtons(): HTMLElement[];
  }
}
