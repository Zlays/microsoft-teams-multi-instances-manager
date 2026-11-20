import React, { useEffect, useState } from 'react';
import Profile from './components/Profile';
import ErrorBox from './components/ErrorBox';
import inputValidator from './utils/Validator';
import type { Settings } from './types/teams-api';
import { Checkbox } from './components/ui/checkbox';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';

export const Main = () => {
  const [settings, setSettings] = useState<Settings>();
  const [error, setError] = useState<string>('');
  const [profiles, setProfiles] = useState<string[]>([]);
  const [profileNameBox, setProfileNameBox] = useState<string>('');

  function showError(text: string) {
    setError(text);
    setTimeout(() => setError(''), 5000);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      if (typeof window === 'undefined' || !window.teamsManagerAPI) {
        return;
      }

      try {
        const [loadedSettings, loadedProfiles] = await Promise.all([
          window.teamsManagerAPI.getSettings(),
          window.teamsManagerAPI.getProfiles(),
        ]);

        if (!isMounted) return;

        setSettings(loadedSettings);
        setProfiles(loadedProfiles);

        if (loadedSettings?.onStartup && Array.isArray(loadedProfiles)) {
          for (const profile of loadedProfiles) {
            window.teamsManagerAPI.launchProfile(profile);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          showError('Failed to load initial data');
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function addProfile() {
    const profileName = profileNameBox.trim();

    if (!profileName) {
      return;
    }

    if (profiles.includes(profileName)) {
      showError('Name of the profile already used');
      return;
    }

    if (typeof window !== 'undefined' && window.teamsManagerAPI) {
      try {
        const res = await window.teamsManagerAPI.createProfile(profileName);
        if (!res.success) {
          showError(res.error || 'Failed to create profile');
          return;
        }
        setProfiles((prev) => [...prev, profileName]);
        setProfileNameBox('');
      } catch (err: unknown) {
        showError((err as Error).message || 'Failed to create profile');
      }
    }
  }

  function handleProfileNameBox({ target }: React.ChangeEvent<HTMLInputElement>) {
    setProfileNameBox(() => inputValidator(target.value));
  }

  async function onDelete(profile: string) {
    if (typeof window !== 'undefined' && window.teamsManagerAPI) {
      try {
        const res = await window.teamsManagerAPI.deleteProfile(profile);
        if (!res.success) {
          showError(res.error || 'Please close Teams before deleting the profile');
          return;
        }
        setProfiles((prev) => prev.filter((value) => value !== profile));
      } catch (err: unknown) {
        showError('Please close Teams before deleting the profile');
      }
    }
  }

  async function onRun(profile: string) {
    if (typeof window !== 'undefined' && window.teamsManagerAPI) {
      try {
        const res = await window.teamsManagerAPI.launchProfile(profile);
        if (!res.success) {
          showError(res.error || 'Failed to launch profile');
        }
      } catch (err: unknown) {
        showError((err as Error).message || 'Failed to launch profile');
      }
    }
  }

  async function handleOnStartup({ target }: React.ChangeEvent<HTMLInputElement>) {
    if (!settings) return;
    const newSettings: Settings = {
      ...settings,
      onStartup: target.checked,
    };
    setSettings(newSettings);
    if (typeof window !== 'undefined' && window.teamsManagerAPI) {
      try {
        await window.teamsManagerAPI.updateSettings(newSettings);
      } catch (err: unknown) {
        showError('Failed to update settings');
      }
    }
  }

  async function handleAutoLaunch({ target }: React.ChangeEvent<HTMLInputElement>) {
    if (!settings) return;
    const newSettings: Settings = {
      ...settings,
      autoLaunch: target.checked,
    };
    setSettings(newSettings);
    if (typeof window !== 'undefined' && window.teamsManagerAPI) {
      try {
        await window.teamsManagerAPI.updateSettings(newSettings);
      } catch (err: unknown) {
        showError('Failed to update settings');
      }
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden select-none">
      <ErrorBox text={error} onClose={() => setError('')} />

      {settings ? (
        <header className="p-3 border-b border-border bg-card/40 flex items-center justify-between gap-4">
          <Checkbox
            id="onStartup"
            checked={settings.onStartup}
            onChange={handleOnStartup}
            label="Run instances on startup"
          />
          <Checkbox
            id="autoLaunch"
            checked={settings.autoLaunch}
            onChange={handleAutoLaunch}
            label="Run app on startup"
          />
        </header>
      ) : null}

      <section className="flex gap-2 p-3 border-b border-border">
        <Input
          type="text"
          name="profileNameBox"
          placeholder="Enter profile name here..."
          value={profileNameBox}
          onChange={handleProfileNameBox}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addProfile();
            }
          }}
          className="flex-1"
        />
        <Button type="button" onClick={addProfile} variant="default">
          Add profile
        </Button>
      </section>

      <main className="flex-1 overflow-y-auto p-3 space-y-2">
        {profiles.map((profile) => (
          <Profile
            key={profile}
            text={profile}
            onRun={onRun}
            onDelete={onDelete}
          />
        ))}
      </main>
    </div>
  );
};

export default function App() {
  return <Main />;
}
