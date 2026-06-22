import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CATEGORIES, type DocCategory } from "./modules-data";

type Props = { q: string; onQueryChange: (v: string) => void };

export function DocsNav({ q, onQueryChange }: Props) {
  return (
    <div className="relative overflow-hidden border-b border-border bg-gradient-to-bl from-primary/10 via-background to-background">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary))_1px,transparent_0)] [background-size:24px_24px]" />
      <div className="relative px-6 md:px-12 py-12 max-w-6xl mx-auto">
        <div className="text-[11px] tracking-[0.25em] text-primary uppercase font-semibold">Vanguard · Documentation</div>
        <h1 className="mt-3 font-display text-4xl md:text-5xl text-foreground">توثيق النظام الشامل</h1>
        <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
          دليل تفاعلي على شكل خط زمني تدريجي يستعرض كل وحدة وجدول داخل نظام إدارة الصالون، مع شرح كامل بالعربية، رابط مباشر للوحدة، ورمز توضيحي خاص بكل قسم.
        </p>
        <div className="mt-6 max-w-md relative">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="ابحث في الوحدات والجداول…"
            className="pe-10"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          {(Object.keys(CATEGORIES) as DocCategory[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card">
              <span className={`size-2 rounded-full ${CATEGORIES[k].dot}`} />
              {CATEGORIES[k].label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}