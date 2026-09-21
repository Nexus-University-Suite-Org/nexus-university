import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  FolderOpen,
  Globe,
  Hash,
  Loader2,
  ExternalLink,
  Download,
  Info,
} from "lucide-react";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useToast } from "@/components/ui/use-toast";
import { fetchUnit, fetchUnitContent } from "@/lib/contentApi";
import type { ContentItem, CourseUnit } from "@/types/course";

const typeMeta: Record<
  ContentItem["type"],
  { label: string; icon: typeof FileText; color: string; bg: string }
> = {
  FILE: { label: "File", icon: FileText, color: "text-blue-600", bg: "bg-blue-100" },
  PAGE: { label: "Notes", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-100" },
  URL: { label: "Link", icon: Globe, color: "text-purple-600", bg: "bg-purple-100" },
  BOOK: { label: "Book", icon: FolderOpen, color: "text-amber-600", bg: "bg-amber-100" },
  LABEL: { label: "Notice", icon: Info, color: "text-orange-600", bg: "bg-orange-100" },
};

function ResourceRow({ item }: { item: ContentItem }) {
  const meta = typeMeta[item.type];
  const Icon = meta.icon;
  const isInteractable = item.type === "FILE" || item.type === "URL" || item.type === "PAGE";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-start gap-4 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.color}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold leading-tight">{item.title}</h4>
            <Badge variant="outline" className="text-[10px]">
              {meta.label}
            </Badge>
          </div>
          {item.fileName && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              {item.fileName}
            </p>
          )}

          {item.type === "LABEL" && item.content && (
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {item.content}
            </p>
          )}

          {item.type === "BOOK" && item.content && (
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {item.content}
            </p>
          )}

          {isInteractable && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.type === "URL" && item.url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open link
                  </a>
                </Button>
              )}
              {item.type === "FILE" && (
                <>
                  {item.fileUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={item.fileUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </a>
                    </Button>
                  )}
                  {item.fileUrl && (
                    <Button size="sm" asChild>
                      <a href={item.fileUrl} download>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {item.type === "PAGE" && (
          <Hash className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </CardContent>
    </Card>
  );
}

function PageContent({ item }: { item: ContentItem }) {
  if (!item.content) return null;
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <div dangerouslySetInnerHTML={{ __html: item.content }} />
    </div>
  );
}

export default function CourseContent() {
  const { unitId } = useParams<{ unitId: string }>();
  const { toast } = useToast();
  const [unit, setUnit] = useState<CourseUnit | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!unitId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [u, content] = await Promise.all([
          fetchUnit(unitId),
          fetchUnitContent(unitId),
        ]);
        setUnit(u);
        setItems(content);
      } catch (error) {
        toast({
          title: "Could not load course",
          description:
            (error as Error).message || "There was an error loading this course.",
          variant: "destructive",
        });
        setUnit(null);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [unitId, toast]);

  const sections: { name: string; items: ContentItem[] }[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (!last || last.name !== item.section) {
      sections.push({ name: item.section, items: [item] });
    } else {
      last.items.push(item);
    }
  }

  const interactables = items.filter((i) =>
    ["FILE", "URL", "PAGE", "BOOK"].includes(i.type)
  );
  const progress =
    interactables.length === 0
      ? 0
      : Math.round((readIds.size / interactables.length) * 100);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <StudentHeader />

      <main className="container mx-auto px-4 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/courses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All courses
            </Link>
          </Button>

          {loading ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading course content…
            </div>
          ) : unit ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    <BookOpen className="h-4 w-4" />
                    {unit.courseName}
                  </div>
                  <h1 className="mt-1 text-2xl font-bold">{unit.name}</h1>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{unit.code}</Badge>
                    {unit.year != null && <Badge variant="outline">Year {unit.year}</Badge>}
                    {unit.semester != null && (
                      <Badge variant="outline">Semester {unit.semester}</Badge>
                    )}
                    {unit.credits != null && (
                      <Badge variant="outline">{unit.credits} credits</Badge>
                    )}
                  </div>
                  {unit.description && (
                    <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                      {unit.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                  <ProgressRing progress={progress} size={64} strokeWidth={6} />
                  <div>
                    <p className="text-xs text-muted-foreground">Course progress</p>
                    <p className="text-lg font-bold">{progress}%</p>
                    <p className="text-xs text-muted-foreground">
                      {readIds.size} of {interactables.length} resources viewed
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {sections.length === 0 ? (
                <Card className="p-10 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-3 font-semibold">No content yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Course materials for this unit will appear here once they are
                    uploaded.
                  </p>
                </Card>
              ) : (
                <div className="space-y-8">
                  {sections.map((section) => (
                    <section key={section.name}>
                      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        {section.name}
                      </h2>
                      <div className="space-y-3">
                        {section.items.map((item) =>
                          item.type === "PAGE" ? (
                            <Card key={item.id}>
                              <CardContent className="flex items-start gap-4 p-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                                  <BookOpen className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-semibold">
                                      {item.title}
                                    </h4>
                                    <Badge variant="outline" className="text-[10px]">
                                      Notes
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="ml-auto h-7 px-2 text-xs"
                                      onClick={() => {
                                        const next = new Set(readIds);
                                        next.add(item.id);
                                        setReadIds(next);
                                      }}
                                    >
                                      {readIds.has(item.id) ? "Viewed" : "Mark as read"}
                                    </Button>
                                  </div>
                                  <PageContent item={item} />
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            <ResourceRow key={item.id} item={item} />
                          )
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Card className="p-10 text-center">
              <h3 className="font-semibold">Course unit not found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                <Link className="text-primary underline" to="/courses">
                  Back to courses
                </Link>
              </p>
            </Card>
          )}
        </motion.div>
      </main>

      <StudentBottomNav />
    </div>
  );
}