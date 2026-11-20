import { contextBridge, ipcRenderer } from 'electron';
import type { Settings, TeamsManagerAPI } from './types/teams-api';

const teamsManagerAPI: TeamsManagerAPI = {
  getProfiles: () => ipcRenderer.invoke('profiles:list'),
  createProfile: (name: string) => ipcRenderer.invoke('profiles:create', name),
  deleteProfile: (name: string) => ipcRenderer.invoke('profiles:delete', name),
  launchProfile: (name: string) => ipcRenderer.invoke('profiles:launch', name),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: Settings) =>
    ipcRenderer.invoke('settings:update', settings),
};

contextBridge.exposeInMainWorld('teamsManagerAPI', teamsManagerAPI);
