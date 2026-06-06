import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

type SettingsState = {
  emailNotifications: boolean;
  leaveAlerts: boolean;
  interviewReminders: boolean;
  compactSidebar: boolean;
  displayName: string;
};

const storageKey = "hrms_settings";

const defaultSettings: SettingsState = {
  emailNotifications: true,
  leaveAlerts: true,
  interviewReminders: true,
  compactSidebar: false,
  displayName: "",
};

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setSettings((current) => ({
        ...current,
        displayName: user?.first_name || user?.username || "",
      }));
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      setSettings({
        ...defaultSettings,
        ...parsed,
        displayName: parsed.displayName || user?.first_name || user?.username || "",
      });
    } catch {
      setSettings({
        ...defaultSettings,
        displayName: user?.first_name || user?.username || "",
      });
    }
  }, [user?.first_name, user?.username]);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const saveSettings = () => {
    localStorage.setItem(storageKey, JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const resetSettings = () => {
    const next = {
      ...defaultSettings,
      displayName: user?.first_name || user?.username || "",
    };
    setSettings(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-teal-600">Preferences</p>
          <h2 className="mt-2 text-3xl font-semibold">Settings</h2>
          <p className="mt-2 text-slate-500">Theme, notification, and profile preferences that actually persist in your browser.</p>
        </div>
        <Badge className="w-fit bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">{theme} mode</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Profile Preferences</h3>
              <p className="mt-1 text-sm text-slate-500">Personalize the app without needing a backend round-trip.</p>
            </div>
            <Button type="button" variant="secondary" className="rounded-full" onClick={toggleTheme}>
              Toggle {theme === "dark" ? "Light" : "Dark"} Theme
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Display Name</p>
              <Input
                className="mt-2"
                value={settings.displayName}
                onChange={(e) => updateSetting("displayName", e.target.value)}
                placeholder="Display name"
              />
            </div>
            <div>
              <p className="text-sm font-medium">Account Email</p>
              <Input className="mt-2" value={user?.email ?? ""} disabled />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div>
                <p className="font-medium">Email notifications</p>
                <p className="text-xs text-slate-500">Receive important HR updates by email.</p>
              </div>
              <Switch checked={settings.emailNotifications} onCheckedChange={(checked) => updateSetting("emailNotifications", checked)} />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div>
                <p className="font-medium">Leave alerts</p>
                <p className="text-xs text-slate-500">Show reminders for new leave requests and approvals.</p>
              </div>
              <Switch checked={settings.leaveAlerts} onCheckedChange={(checked) => updateSetting("leaveAlerts", checked)} />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div>
                <p className="font-medium">Interview reminders</p>
                <p className="text-xs text-slate-500">Keep interview scheduling prompts enabled.</p>
              </div>
              <Switch
                checked={settings.interviewReminders}
                onCheckedChange={(checked) => updateSetting("interviewReminders", checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div>
                <p className="font-medium">Compact sidebar</p>
                <p className="text-xs text-slate-500">Use a tighter sidebar layout when navigating.</p>
              </div>
              <Switch checked={settings.compactSidebar} onCheckedChange={(checked) => updateSetting("compactSidebar", checked)} />
            </label>
          </div>

          {saved ? <p className="text-sm text-emerald-600">Preferences saved locally.</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={saveSettings}>
              Save Preferences
            </Button>
            <Button type="button" variant="secondary" onClick={resetSettings}>
              Reset
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 card-gradient">
          <h3 className="text-lg font-semibold">What is active now</h3>
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <p>
              Theme: <span className="font-medium">{theme}</span>
            </p>
            <p>
              Notifications: <span className="font-medium">{settings.emailNotifications ? "enabled" : "disabled"}</span>
            </p>
            <p>
              Leave alerts: <span className="font-medium">{settings.leaveAlerts ? "enabled" : "disabled"}</span>
            </p>
            <p>
              Interview reminders: <span className="font-medium">{settings.interviewReminders ? "enabled" : "disabled"}</span>
            </p>
            <p>
              Sidebar layout: <span className="font-medium">{settings.compactSidebar ? "compact" : "regular"}</span>
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            These settings are saved in the browser for now. If you want, we can back them with a Django endpoint next.
          </p>
        </Card>
      </div>
    </div>
  );
}
