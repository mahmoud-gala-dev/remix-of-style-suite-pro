import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/shell/page";
import { useT } from "@/lib/i18n";
import { SettingsGeneral } from "./settings/SettingsGeneral";
import { SettingsLayout } from "./settings/SettingsLayout";
import { SettingsData } from "./settings/SettingsData";
import { SettingsNotifications } from "./settings/SettingsNotifications";
import { SettingsBilling } from "./settings/SettingsBilling";
import { Settings2FA } from "./settings/Settings2FA";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  head: () => ({ meta: [{ title: "Settings" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const t = useT();
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <PageHeader title={t("settings")} subtitle={t("configurePreferences")} />
      <SettingsGeneral />
      <SettingsLayout />
      <SettingsNotifications />
      <SettingsBilling />
      <Settings2FA />
      <SettingsData />
    </div>
  );
}
