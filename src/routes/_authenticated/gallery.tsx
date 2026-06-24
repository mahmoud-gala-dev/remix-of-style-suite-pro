import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, Surface } from "@/components/shell/page";
import { DataState } from "@/components/shell/data-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentBranch } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Trash2, Upload } from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/shell/route-error";
import { supabase } from "@/integrations/supabase/client";
import {
  createGalleryUploadUrl, listServicePhotos, recordServicePhoto, deleteServicePhoto,
} from "@/lib/photos.functions";

export const Route = createFileRoute("/_authenticated/gallery")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  ssr: false,
  head: () => ({ meta: [{ title: "Photo Gallery" }] }),
  component: () => (<AppShell><Page /></AppShell>),
});

function Page() {
  const t = useT();
  const branch = useCurrentBranch();
  const qc = useQueryClient();
  const listFn = useServerFn(listServicePhotos);
  const signFn = useServerFn(createGalleryUploadUrl);
  const recordFn = useServerFn(recordServicePhoto);
  const delFn = useServerFn(deleteServicePhoto);

  const [caption, setCaption] = useState("");
  const [kind, setKind] = useState<"before" | "after" | "portfolio">("after");
  const [busy, setBusy] = useState(false);

  const photosQ = useQuery({
    queryKey: ["service_photos", branch.id],
    queryFn: () => listFn({ data: { branchId: branch.id } }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["service_photos", branch.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function onUpload(file: File) {
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const sig = await signFn({ data: { branchId: branch.id, scope: "service", ext } });
      const { error: upErr } = await supabase.storage
        .from("gallery")
        .uploadToSignedUrl(sig.path, sig.token, file, { contentType: file.type });
      if (upErr) throw upErr;
      await recordFn({
        data: {
          branchId: branch.id,
          storagePath: sig.path,
          kind,
          caption: caption || null,
          isPublic: false,
        },
      });
      toast.success(t("uploaded"));
      setCaption("");
      qc.invalidateQueries({ queryKey: ["service_photos", branch.id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={t("gallery")} subtitle={t("gallery_sub")} />
      <Surface className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-muted-foreground">{t("kind")}</label>
            <select
              className="block border rounded px-2 py-1 text-sm bg-background"
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
            >
              <option value="before">{t("before")}</option>
              <option value="after">{t("after")}</option>
              <option value="portfolio">{t("portfolio")}</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">{t("caption")}</label>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
          <label className="inline-flex">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
            <Button asChild disabled={busy}>
              <span className="cursor-pointer">
                <Upload className="h-4 w-4 me-1" />
                {busy ? t("uploading") : t("upload")}
              </span>
            </Button>
          </label>
        </div>
      </Surface>

      <Surface className="p-4 mt-4">
        <DataState
          loading={photosQ.isLoading}
          error={photosQ.error}
          empty={!photosQ.data?.length}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(photosQ.data ?? []).map((p: any) => (
              <div key={p.id} className="border rounded overflow-hidden group relative">
                {p.url ? (
                  <img src={p.url} alt={p.caption ?? ""} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-muted" />
                )}
                <div className="p-2 text-xs">
                  <div className="font-medium capitalize">{p.kind}</div>
                  {p.caption && <div className="text-muted-foreground">{p.caption}</div>}
                </div>
                <button
                  className="absolute top-1 end-1 opacity-0 group-hover:opacity-100 bg-destructive text-destructive-foreground rounded p-1"
                  onClick={() => delMut.mutate(p.id)}
                  aria-label="delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </DataState>
      </Surface>
    </>
  );
}