import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Settings</h2>
        <p className="mt-2 text-slate-500">Profile settings, dark mode toggle, and notification preferences.</p>
      </div>
      <Card className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="font-semibold">Profile Settings</h3>
          <p className="mt-2 text-sm text-slate-500">Manage your profile photo, display name, and password.</p>
        </div>
        <div className="flex items-start justify-end gap-3">
          <Button variant="secondary">Dark Mode</Button>
          <Button>Save Changes</Button>
        </div>
      </Card>
    </div>
  );
}
