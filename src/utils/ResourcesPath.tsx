import os from 'os';
import path from 'path';

const userPath = os.homedir();

export const teamsPath = path.join(
  userPath,
  'AppData',
  'Local',
  'Microsoft',
  'Teams'
);

export const homePath = path.join(
  os.tmpdir(),
  'microsoft-teams-instances-manager'
);

export const profilesPath = path.join(
  os.tmpdir(),
  'microsoft-teams-instances-manager',
  'profiles'
);

export const logsPath = path.join(
  os.tmpdir(),
  'microsoft-teams-instances-manager',
  'logs'
);

export const configPath = path.join(
  userPath,
  'AppData',
  'Roaming',
  'microsoft-teams-instances-manager',
  'config'
);

