"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Button,
  Card,
  Description,
  Input,
  Label,
  Tab,
  Tabs,
  TextField,
} from "@heroui/react";
import { PageHeader } from "@/components/ui/page-header";
import {
  getSettingsAction,
  updateSettingsBatchAction,
} from "@/actions/settings";

type SettingItem = {
  key: string;
  value: string;
  category: string;
  label: string;
  description?: string;
  isSecret?: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  paths: "Paths",
  services: "Windows Services",
  general: "General",
  ports: "Port Configuration",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, SettingItem[]>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>("paths");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getSettingsAction().then((data) => {
      const grouped = data as Record<string, SettingItem[]>;
      setSettings(grouped);
      const first = Object.keys(grouped)[0];
      if (first) setActiveTab(first);
    });
  }, []);

  function handleChange(key: string, value: string) {
    setEdited((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const updates = Object.entries(edited).map(([key, value]) => ({ key, value }));
    if (updates.length === 0) return;

    startTransition(async () => {
      const result = await updateSettingsBatchAction(updates);
      if (result.success) {
        setMessage({ type: "success", text: "Settings saved successfully" });
        setEdited({});
        const data = await getSettingsAction();
        setSettings(data as Record<string, SettingItem[]>);
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to save" });
      }
    });
  }

  const categories = Object.keys(settings);

  return (
    <div className="p-6">
      <PageHeader
        title="Settings"
        description="Configure all platform paths and service settings. Super Admin only."
        actions={
          Object.keys(edited).length > 0 ? (
            <Button variant="primary" onPress={handleSave} isDisabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          ) : undefined
        }
      />

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-950/50 text-green-400"
              : "bg-red-950/50 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(String(key))}>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Settings categories">
            {categories.map((category) => (
              <Tab key={category} id={category}>
                {CATEGORY_LABELS[category] ?? category}
              </Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        {categories.map((category) => (
          <Tabs.Panel key={category} id={category}>
            <Card className="acdm-card mt-4">
              <Card.Header>
                <Card.Title className="text-lg acdm-card-title">
                  {CATEGORY_LABELS[category] ?? category}
                </Card.Title>
              </Card.Header>
              <Card.Content className="gap-4 flex flex-col">
                {settings[category]?.map((setting) => (
                  <div key={setting.key}>
                    <TextField
                      value={edited[setting.key] ?? setting.value}
                      onChange={(v) => handleChange(setting.key, v)}
                      className="w-full"
                    >
                      <Label>{setting.label}</Label>
                      <Input className="font-mono text-sm" />
                      {setting.description && (
                        <Description>{setting.description}</Description>
                      )}
                    </TextField>
                    <p className="text-xs text-slate-600 mt-1 font-mono">
                      {setting.key}
                    </p>
                  </div>
                ))}
              </Card.Content>
            </Card>
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  );
}
