import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Layers,
  Calendar,
  Clock,
  Library,
  RefreshCw,
} from "lucide-react";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  enrollInUnit,
  fetchAllUnits,
  fetchEnrolledCourses,
} from "@/lib/contentApi";
import type { CourseUnit } from "@/types/course";

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

function UnitCard({
  unit,
  enrolled,
  onEnroll,
  enrolling,
}: {
  unit: CourseUnit;
  enrolled: boolean;
  onEnroll: (unit: CourseUnit) => void;
  enrolling?: boolean;
}) {
  return (
    <motion.div
      custom={unit.id}
      variants={rise}
      initial="hidden"
      animate="visible"
    >
      <Card className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <Badge variant={enrolled ? "default" : "secondary"}>
              {enrolled ? "Enrolled" : "Not enrolled"}
            </Badge>
          </div>
          <CardTitle className="mt-3 text-lg leading-tight">
            {unit.name}
          </CardTitle>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{unit.code}</Badge>
            {unit.year != null && <Badge variant="outline">Year {unit.year}</Badge>}
            {unit.semester != null && (
              <Badge variant="outline">Semester {unit.semester}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {unit.description || `${unit.courseName} · ${unit.code}`}
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-4 w-4" />
              {unit.credits != null ? `${unit.credits} credits` : unit.courseCode}
            </div>
            {enrolled ? (
              <Button asChild size="sm">
                <Link to={`/courses/${unit.id}`}>
                  <Layers className="mr-2 h-4 w-4" />
                  View content
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEnroll(unit)}
                disabled={enrolling}
              >
                {enrolling ? "Enrolling…" : "Enroll"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function StudentCourses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [enrolled, setEnrolled] = useState<CourseUnit[]>([]);
  const [allUnits, setAllUnits] = useState<CourseUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [mine, all] = await Promise.all([
        fetchEnrolledCourses(user.uid),
        fetchAllUnits(),
      ]);
      setEnrolled(mine);
      setAllUnits(all);
    } catch {
      setEnrolled([]);
      setAllUnits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleEnroll = async (unit: CourseUnit) => {
    if (!user) return;
    setEnrollingId(unit.id);
    try {
      await enrollInUnit(user.uid, unit.id);
      await load();
      toast({
        title: "Enrolled",
        description: `You are now enrolled in ${unit.code}`,
      });
    } catch (error) {
      toast({
        title: "Could not enroll",
        description:
          (error as Error).message || "There was an error enrolling.",
        variant: "destructive",
      });
    } finally {
      setEnrollingId(null);
    }
  };

  const enrolledIds = new Set(enrolled.map((u) => u.id));
  const available = allUnits.filter((u) => !enrolledIds.has(u.id));

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />

      <main className="container mx-auto px-4 pb-24 pt-8 md:pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Library className="h-4 w-4" />
              <span>Course Materials</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold">My Courses</h1>
            <p className="text-sm text-muted-foreground">
              Browse your enrolled course units and access lecture notes,
              readings and resources.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </motion.div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                Enrolled Units ({enrolled.length})
              </h2>
            </div>
            {enrolled.length === 0 ? (
              <Card className="p-8 text-center">
                <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-3 text-base font-semibold">
                  No enrolled courses yet
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enroll from the available units below to start viewing course
                  materials.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {enrolled.map((unit) => (
                  <UnitCard key={unit.id} unit={unit} enrolled />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Available Units</h2>
          </div>
          {available.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                You are enrolled in all available course units.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  enrolled={false}
                  onEnroll={handleEnroll}
                  enrolling={enrollingId === unit.id}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <StudentBottomNav />
    </div>
  );
}