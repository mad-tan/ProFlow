"use client";

import { useState } from "react";
import {
  User,
  Palette,
  Brain,
  Database,
  Download,
  Upload,
  Moon,
  Sun,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const [name, setName] = useState("Tanmay");
  const [email, setEmail] = useState("tanmay@example.com");
  const [darkMode, setDarkMode] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [saving, setSaving] = useState(false);

  function handleToggleTheme(checked: boolean) {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    // Simulated save
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
  }

  function handleExport() {
    // Trigger a download of a placeholder JSON
    const data = JSON.stringify(
      {
        exported: new Date().toISOString(),
        message: "Export functionality would serialize all user data.",
      },
      null,
      2
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `productivity-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
      />

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? (
                <Moon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Sun className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">
                  Switch between light and dark themes
                </p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={handleToggleTheme} />
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                <SelectItem value="claude-sonnet">Claude Sonnet</SelectItem>
                <SelectItem value="claude-haiku">Claude Haiku</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline">
            Save AI Settings
          </Button>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Export or import your data for backup or migration.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium text-destructive">Danger Zone</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Deleting your account will permanently remove all data. This
              action cannot be undone.
            </p>
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
