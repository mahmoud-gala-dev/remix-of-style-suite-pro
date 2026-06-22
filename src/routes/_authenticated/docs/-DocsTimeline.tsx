import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, type DocModule } from "./modules-data";

export function DocsTimeline({ items }: { items: DocModule[] }) {
  if (items.length === 0) {
    return <div className="text-center text-muted-foreground py-12">لا توجد نتائج مطابقة</div>;
  }
  return (
    <div className="relative">
      <div className="absolute end-6 md:end-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
      <div className="space-y-12">
        {items.map((m, i) => {
          const color = CATEGORIES[m.category];
          const onRight = i % 2 === 0;
          return (
            <div key={m.id} className="relative">
              <div className="absolute end-6 md:end-1/2 translate-x-1/2 -top-1 z-10">
                <div className={`size-4 rounded-full ${color.dot} ring-4 ring-background`} />
                <div className={`absolute inset-0 size-4 rounded-full ${color.dot} animate-ping opacity-40`} />
              </div>
              <div className={`hidden md:block absolute top-0 ${onRight ? "start-1/2 ms-10" : "end-1/2 me-10 text-end"}`}>
                <div className="font-display text-5xl text-muted-foreground/20 leading-none">
                  {String(i + 1).padStart(2, "0")}
                </div>
              </div>
              <div className={`pe-14 md:pe-0 ${onRight ? "md:ps-12 md:pe-[calc(50%+2rem)]" : "md:pe-12 md:ps-[calc(50%+2rem)]"}`}>
                <Card className={`p-6 ring-1 ${color.ring} ${color.glow} hover:-translate-y-0.5 transition-all duration-300 bg-card/80 backdrop-blur`}>
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 size-16 rounded-xl border border-border grid place-items-center text-foreground bg-gradient-to-br from-background to-muted/40 ${color.glow}`}>
                      {m.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] tracking-wider uppercase">{color.label}</Badge>
                        {m.table && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">{m.table}</span>
                        )}
                      </div>
                      <h3 className="mt-2 font-display text-xl text-foreground">{m.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{m.description}</p>
                      {m.fields.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {m.fields.map((f) => (
                            <span key={f} className="text-[11px] px-2 py-1 rounded-md bg-muted/60 text-foreground/80 border border-border/50">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                      {m.link && (
                        <Link to={m.link} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                          فتح الوحدة
                          <ArrowLeft className="size-3.5" />
                          <ExternalLink className="size-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}