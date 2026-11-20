import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import AutoLaunch from 'auto-launch';
import log from 'electron-log';
import inputValidator from '../utils/Validator';
import { profilesPath, configPath, teamsPath } from '../utils/ResourcesPath';
import type { Settings } from '../types/teams-api';

const APP_NAME = 'microsoft-teams-instances-manager';

const autoLauncher = new AutoLaunch({
  name: APP_NAME,
});

const DEFAULT_SETTINGS: Settings = {
  onStartup: true,
  autoLaunch: true,
};

const CONFIG_FILE = path.join(configPath, 'file.config');

export interface LauncherInfo {
  type: 'edge' | 'chrome' | 'classic';
  name: string;
  executable: string;
}

export function findTeamsLauncher(): LauncherInfo | null {
  const edgeCandidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const candidate of edgeCandidates) {
    if (fs.existsSync(candidate)) {
      return { type: 'edge', name: 'Microsoft Edge', executable: candidate };
    }
  }

  const chromeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const candidate of chromeCandidates) {
    if (fs.existsSync(candidate)) {
      return { type: 'chrome', name: 'Google Chrome', executable: candidate };
    }
  }

  const teamsClassicExecutable = path.join(teamsPath, 'current', 'Teams.exe');
  if (fs.existsSync(teamsClassicExecutable)) {
    return {
      type: 'classic',
      name: 'Teams Classic',
      executable: teamsClassicExecutable,
    };
  }

  return null;
}

export function registerIpcHandlers(): void {
  // profiles:list
  ipcMain.handle('profiles:list', async (): Promise<string[]> => {
    try {
      if (!fs.existsSync(profilesPath)) {
        await fs.promises.mkdir(profilesPath, { recursive: true });
      }
      const entries = await fs.promises.readdir(profilesPath, {
        withFileTypes: true,
      });
      const profileNames = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

      log.info(`[IPC] profiles:list found ${profileNames.length} profiles`);
      return profileNames;
    } catch (error) {
      log.error('[IPC] profiles:list error:', error);
      return [];
    }
  });

  // profiles:create
  ipcMain.handle(
    'profiles:create',
    async (
      _event,
      name: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const trimmed = (name || '').trim();
        const validated = inputValidator(trimmed);

        if (!trimmed || validated !== trimmed) {
          return { success: false, error: 'Invalid profile name' };
        }

        if (!fs.existsSync(profilesPath)) {
          await fs.promises.mkdir(profilesPath, { recursive: true });
        }

        const profileDir = path.join(profilesPath, validated);

        if (fs.existsSync(profileDir)) {
          return { success: false, error: 'Name of the profile already used' };
        }

        await fs.promises.mkdir(profileDir, { recursive: true });
        await fs.promises.mkdir(path.join(profileDir, 'downloads'), {
          recursive: true,
        });

        log.info(`[IPC] profiles:create created profile: ${validated}`);
        return { success: true };
      } catch (error) {
        log.error('[IPC] profiles:create error:', error);
        return {
          success: false,
          error: (error as Error).message || 'Failed to create profile',
        };
      }
    }
  );

  // profiles:delete
  ipcMain.handle(
    'profiles:delete',
    async (
      _event,
      name: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const trimmed = (name || '').trim();
        const validated = inputValidator(trimmed);

        if (!trimmed || validated !== trimmed) {
          return { success: false, error: 'Invalid profile name' };
        }

        const profileDir = path.join(profilesPath, validated);

        if (!fs.existsSync(profileDir)) {
          return { success: false, error: 'Profile not found' };
        }

        try {
          await fs.promises.rm(profileDir, { recursive: true, force: true });
          log.info(`[IPC] profiles:delete deleted profile: ${validated}`);
          return { success: true };
        } catch (rmError) {
          log.error(`[IPC] profiles:delete error for ${validated}:`, rmError);
          return {
            success: false,
            error: 'Please close Teams before deleting the profile',
          };
        }
      } catch (error) {
        log.error('[IPC] profiles:delete error:', error);
        return {
          success: false,
          error: 'Please close Teams before deleting the profile',
        };
      }
    }
  );

  // profiles:launch
  ipcMain.handle(
    'profiles:launch',
    async (
      _event,
      name: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const trimmed = (name || '').trim();
        const validated = inputValidator(trimmed);

        if (!trimmed || validated !== trimmed) {
          return { success: false, error: 'Invalid profile name' };
        }

        const profileDir = path.join(profilesPath, validated);
        const downloadDir = path.join(profileDir, 'downloads');

        if (!fs.existsSync(downloadDir)) {
          await fs.promises.mkdir(downloadDir, { recursive: true });
        }

        const launcher = findTeamsLauncher();

        if (!launcher) {
          log.error(
            '[IPC] profiles:launch error: No compatible Teams browser/executable found'
          );
          return {
            success: false,
            error: 'No compatible Teams browser/executable found',
          };
        }

        log.info(
          `[IPC] Launching Teams profile "${validated}" using ${launcher.name} (${launcher.executable}) with profileDir="${profileDir}"`
        );

        const child =
          launcher.type === 'classic'
            ? spawn('powershell', [`start '${launcher.executable}'`], {
                env: {
                  ...process.env,
                  USERPROFILE: profileDir,
                },
                detached: true,
                stdio: 'ignore',
              })
            : spawn(
                launcher.executable,
                [
                  '--app=https://teams.microsoft.com',
                  `--user-data-dir=${profileDir}`,
                  '--no-first-run',
                  '--no-default-browser-check',
                ],
                {
                  detached: true,
                  stdio: 'ignore',
                }
              );

        child.unref();

        return { success: true };
      } catch (error) {
        log.error('[IPC] profiles:launch error:', error);
        return {
          success: false,
          error: (error as Error).message || 'Failed to launch profile',
        };
      }
    }
  );

  // settings:get
  ipcMain.handle('settings:get', async (): Promise<Settings> => {
    try {
      if (!fs.existsSync(configPath)) {
        await fs.promises.mkdir(configPath, { recursive: true });
      }

      if (!fs.existsSync(CONFIG_FILE)) {
        return DEFAULT_SETTINGS;
      }

      const data = await fs.promises.readFile(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(data);

      return {
        onStartup:
          typeof parsed.onStartup === 'boolean'
            ? parsed.onStartup
            : DEFAULT_SETTINGS.onStartup,
        autoLaunch:
          typeof parsed.autoLaunch === 'boolean'
            ? parsed.autoLaunch
            : DEFAULT_SETTINGS.autoLaunch,
      };
    } catch (error) {
      log.error('[IPC] settings:get error:', error);
      return DEFAULT_SETTINGS;
    }
  });

  // settings:update
  ipcMain.handle(
    'settings:update',
    async (_event, settings: Settings): Promise<void> => {
      try {
        if (!fs.existsSync(configPath)) {
          await fs.promises.mkdir(configPath, { recursive: true });
        }

        const cleanSettings: Settings = {
          onStartup: !!settings.onStartup,
          autoLaunch: !!settings.autoLaunch,
        };

        await fs.promises.writeFile(
          CONFIG_FILE,
          JSON.stringify(cleanSettings, null, 2),
          'utf8'
        );
        log.info('[IPC] settings:update updated file.config:', cleanSettings);

        try {
          const isEnabled = await autoLauncher.isEnabled();
          if (isEnabled && !cleanSettings.autoLaunch) {
            await autoLauncher.disable();
            log.info('[IPC] AutoLaunch disabled');
          } else if (!isEnabled && cleanSettings.autoLaunch) {
            await autoLauncher.enable();
            log.info('[IPC] AutoLaunch enabled');
          }
        } catch (autoLaunchError) {
          log.error('[IPC] autoLauncher sync error:', autoLaunchError);
        }
      } catch (error) {
        log.error('[IPC] settings:update error:', error);
        throw error;
      }
    }
  );
}
