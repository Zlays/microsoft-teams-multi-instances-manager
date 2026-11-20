export interface Settings {
  onStartup: boolean;
  autoLaunch: boolean;
}

export interface TeamsManagerAPI {
  getProfiles(): Promise<string[]>;
  createProfile(name: string): Promise<{ success: boolean; error?: string }>;
  deleteProfile(name: string): Promise<{ success: boolean; error?: string }>;
  launchProfile(name: string): Promise<{ success: boolean; error?: string }>;
  getSettings(): Promise<Settings>;
  updateSettings(settings: Settings): Promise<void>;
}

declare global {
  interface Window {
    teamsManagerAPI: TeamsManagerAPI;
  }
}
