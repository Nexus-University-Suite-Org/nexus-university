import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Download,
  Upload,
  Filter,
  Search,
  TrendingUp,
  Award,
  AlertCircle,
  Save,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend, postMessagingBackend } from "@/lib/backendApi";

interface StudentGrade {
  id: string;
  student_id: string;
  name: string;
  email: string;
  assignment1: number;
  assignment2: number;
  midterm: number;
  participation: number;
  finalExam: number;
  total: number;
  grade: string;
  gp: number;
  status: "excellent" | "good" | "average" | "warning" | "failing";
  grade_id?: string;
}

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

const calculateGrade = (total: number) => {
  if (total >= 90) return { grade: "A", gp: 4.0 };
  if (total >= 80) return { grade: "B+", gp: 3.3 };
  if (total >= 70) return { grade: "B", gp: 3.0 };
  if (total >= 60) return { grade: "C", gp: 2.0 };
  if (total >= 50) return { grade: "D", gp: 1.0 };
  return { grade: "F", gp: 0 };
};

const calculateSemesterRemark = (gp: number, grade: string): string => {
  if (gp >= 3.5) return "Excellent";
  if (gp >= 3.0) return "Very Good";
  if (gp >= 2.5) return "Good";
  if (gp >= 2.0) return "Satisfactory";
  if (gp >= 1.0) return "Pass";
  return "Fail";
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "excellent":
      return "bg-emerald-500/20 text-emerald-700 border-emerald-300/30";
    case "good":
      return "bg-blue-500/20 text-blue-700 border-blue-300/30";
    case "average":
      return "bg-amber-500/20 text-amber-700 border-amber-300/30";
    case "warning":
      return "bg-orange-500/20 text-orange-700 border-orange-300/30";
    case "failing":
      return "bg-red-500/20 text-red-700 border-red-300/30";
    default:
      return "bg-muted/60";
  }
};

export default function LecturerGradeBook() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "total" | "grade">("name");
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changedGrades, setChangedGrades] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      console.log("Fetching courses for user:", user.uid);
      fetchLecturerCourses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudentsAndGrades();
    }
  }, [selectedCourse]);

  const fetchLecturerCourses = async () => {
    try {
      if (!user?.uid) return;

      const profiles = await getBackend<any[]>("/api/profiles/?role=lecturer");
      const lecturerProfile = profiles.find(
        (p: any) => p.email === user.email,
      );
      const assignedCourseUnits: string[] =
        lecturerProfile?.assigned_course_units || [];

      const assignedRawCourses: any[] = [];
      if (assignedCourseUnits.length > 0) {
        const courseUnitsData = await getBackend<any[]>("/api/course-units/");
        courseUnitsData.forEach((cu: any) => {
          if (assignedCourseUnits.includes(cu.id) || assignedCourseUnits.includes(cu.course_id)) {
            assignedRawCourses.push({
              id: cu.id || cu.course_id,
              code: cu.code || cu.course_unit_code || "Unknown",
              title: cu.name || cu.course_unit_name || "Unknown Course",
              credits: cu.credits || 3,
            });
          }
        });
      }

      const coursesData: any[] = assignedRawCourses.map((raw) => ({
        id: raw.id || `temp-${Date.now()}`,
        code: raw.code || "Unknown",
        title: raw.title || "Unknown Course",
        credits: raw.credits || 3,
      }));
      setCourses(coursesData);

      // Check if a course is specified in URL parameters
      const courseParam = searchParams.get("course");
      if (
        courseParam &&
        coursesData.some((course) => course.id === courseParam)
      ) {
        setSelectedCourse(courseParam);
      } else if (coursesData.length > 0 && !selectedCourse) {
        setSelectedCourse(coursesData[0].id);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchStudentsAndGrades = async () => {
    if (!selectedCourse || !user) return;

    try {
      setLoading(true);

      // Fetch approved enrollments for this course
      const enrollmentData = await getBackend<any[]>(
        `/api/enrollments/?course_ids=${encodeURIComponent(selectedCourse)}`,
      );
      const approvedEnrollments = enrollmentData.filter(
        (e: any) => e.status === "approved",
      );
      const studentIds = approvedEnrollments.map((e: any) => e.student_id);

      if (studentIds.length === 0) {
        setStudents([]);
        return;
      }

      // Fetch student profiles
      const allProfiles = await getBackend<any[]>("/api/profiles/");
      const profilesMap: Record<string, any> = {};
      allProfiles.forEach((p: any) => {
        if (studentIds.includes(p.id)) {
          profilesMap[p.id] = p;
        }
      });

      // Fetch existing grades for this course
      const gradesData = await getBackend<any[]>("/api/student-grades/");
      const gradesMap: Record<string, any> = {};
      gradesData.forEach((g: any) => {
        if (g.course_id === selectedCourse) {
          gradesMap[g.student_id] = g;
        }
      });

      // Merge data
      const studentsWithGrades: StudentGrade[] = studentIds.map((sid) => {
        const profile = profilesMap[sid];
        const existingGrade = gradesMap[sid];

        const assignment1 = existingGrade?.assignment1 || 0;
        const assignment2 = existingGrade?.assignment2 || 0;
        const midterm = existingGrade?.midterm || 0;
        const participation = existingGrade?.participation || 0;
        const finalExam = existingGrade?.final_exam || 0;
        const total = existingGrade?.total || 0;

        const { grade, gp } = calculateGrade(total);

        let status: StudentGrade["status"] = "average";
        if (total >= 90) status = "excellent";
        else if (total >= 80) status = "good";
        else if (total >= 60) status = "average";
        else if (total >= 50) status = "warning";
        else status = "failing";

        return {
          id: sid,
          student_id: sid,
          name: profile?.full_name || "Unknown",
          email: profile?.email || "",
          assignment1,
          assignment2,
          midterm,
          participation,
          finalExam,
          total,
          grade: existingGrade?.grade || grade,
          gp: existingGrade?.gp || gp,
          status,
          grade_id: existingGrade?.id,
        };
      });

      setStudents(studentsWithGrades);
    } catch (error) {
      console.error("Error fetching students and grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStudentGrade = (
    studentId: string,
    field: keyof StudentGrade,
    value: number,
  ) => {
    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== studentId) return student;

        const updated = { ...student, [field]: value };

        // Recalculate total (weighted: A1=15%, A2=15%, Mid=25%, Part=10%, Final=35%)
        const total =
          updated.assignment1 * 0.15 +
          updated.assignment2 * 0.15 +
          updated.midterm * 0.25 +
          updated.participation * 0.1 +
          updated.finalExam * 0.35;

        const { grade, gp } = calculateGrade(total);

        let status: StudentGrade["status"] = "average";
        if (total >= 90) status = "excellent";
        else if (total >= 80) status = "good";
        else if (total >= 60) status = "average";
        else if (total >= 50) status = "warning";
        else status = "failing";

        return { ...updated, total, grade, gp, status };
      }),
    );

    // Mark this student's grade as changed
    setChangedGrades((prev) => new Set([...prev, studentId]));

    // Auto-save after 2 seconds of no changes
    setTimeout(() => {
      saveSingleStudentGrade(studentId);
    }, 2000);
  };

  const saveSingleStudentGrade = async (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student || !selectedCourse || !user) return;

    try {
      const gradeData = {
        student_id: student.student_id,
        course_id: selectedCourse,
        lecturer_id: user.uid,
        assignment1: student.assignment1,
        assignment2: student.assignment2,
        midterm: student.midterm,
        participation: student.participation,
        final_exam: student.finalExam,
        total: student.total,
        grade: student.grade,
        gp: student.gp,
      };

      await postBackend("/api/student-grades/", gradeData);

      await sendGradeUpdateNotification(student);

      setChangedGrades((prev) => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });

      console.log(`Grade saved for student ${student.name}`);
    } catch (error) {
      console.error("Error saving grade:", error);
    }
  };

  const sendGradeUpdateNotification = async (student: StudentGrade) => {
    if (!selectedCourse || !user) return;

    try {
      const courseData = courses.find((c) => c.id === selectedCourse);
      const courseName = courseData?.title || courseData?.code || "Course";

      await postMessagingBackend("/api/notifications/", {
        user_id: student.student_id,
        type: "grade_update",
        title: "Grade Updated",
        message: `Your grades for ${courseName} have been updated. Total: ${student.total.toFixed(
          1,
        )}%, Grade: ${student.grade}`,
        related_id: selectedCourse,
      });
      console.log(`Notification sent to ${student.name}`);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const saveAllGrades = async () => {
    if (!selectedCourse || !user) return;

    try {
      setSaving(true);

      for (const studentId of Array.from(changedGrades)) {
        await saveSingleStudentGrade(studentId);
      }

      setChangedGrades(new Set());
      alert("Grades saved successfully!");
      fetchStudentsAndGrades();
    } catch (error) {
      console.error("Error saving grades:", error);
      alert("Failed to save some grades. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportGrades = () => {
    if (students.length === 0) {
      alert("No data to export");
      return;
    }

    // Create CSV content
    const headers = [
      "Name",
      "Email",
      "Assignment 1",
      "Assignment 2",
      "Midterm",
      "Participation",
      "Final Exam",
      "Total",
      "Grade",
      "GP",
    ];

    const rows = students.map((student) => [
      student.name,
      student.email,
      student.assignment1.toFixed(2),
      student.assignment2.toFixed(2),
      student.midterm.toFixed(2),
      student.participation.toFixed(2),
      student.finalExam.toFixed(2),
      student.total.toFixed(2),
      student.grade,
      student.gp.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grades_${selectedCourse}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleImportGrades = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      alert("Please select a CSV file");
      return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          alert("CSV file is empty or invalid");
          setImporting(false);
          return;
        }

        // Skip header line
        const dataLines = lines.slice(1);
        const importedStudents: StudentGrade[] = [];

        dataLines.forEach((line, index) => {
          // Handle quoted values
          const values = line
            .match(/"[^"]*"|[^,]+/g)
            ?.map((v) => v.replace(/^"|"$/g, ""));

          if (!values || values.length < 10) {
            console.warn(`Skipping invalid line ${index + 2}`);
            return;
          }

          const [name, email, a1, a2, mid, part, final, total, grade, gp] =
            values;

          const assignment1 = parseFloat(a1);
          const assignment2 = parseFloat(a2);
          const midterm = parseFloat(mid);
          const participation = parseFloat(part);
          const finalExam = parseFloat(final);
          const totalScore = parseFloat(total);
          const gradePoint = parseFloat(gp);

          if (
            isNaN(assignment1) ||
            isNaN(assignment2) ||
            isNaN(midterm) ||
            isNaN(participation) ||
            isNaN(finalExam) ||
            isNaN(totalScore) ||
            isNaN(gradePoint)
          ) {
            console.warn(`Skipping line ${index + 2} due to invalid numbers`);
            return;
          }

          let status: StudentGrade["status"] = "average";
          if (totalScore >= 90) status = "excellent";
          else if (totalScore >= 80) status = "good";
          else if (totalScore >= 60) status = "average";
          else if (totalScore >= 50) status = "warning";
          else status = "failing";

          importedStudents.push({
            id: `imported-${Date.now()}-${index}`,
            student_id: `imported-${Date.now()}-${index}`,
            name: name.trim(),
            email: email.trim(),
            assignment1,
            assignment2,
            midterm,
            participation,
            finalExam,
            total: totalScore,
            grade: grade.trim(),
            gp: gradePoint,
            status,
          });
        });

        if (importedStudents.length === 0) {
          alert("No valid student records found in CSV file");
          setImporting(false);
          return;
        }

        // Match imported students with existing enrolled students by email
        const matchedStudents = importedStudents
          .map((imported) => {
            const existing = students.find(
              (s) => s.email.toLowerCase() === imported.email.toLowerCase(),
            );
            if (existing) {
              return {
                ...existing,
                assignment1: imported.assignment1,
                assignment2: imported.assignment2,
                midterm: imported.midterm,
                participation: imported.participation,
                finalExam: imported.finalExam,
                total: imported.total,
                grade: imported.grade,
                gp: imported.gp,
                status: imported.status,
              };
            }
            return null;
          })
          .filter(Boolean) as StudentGrade[];

        if (matchedStudents.length === 0) {
          alert(
            "No matching students found. Make sure the email addresses in CSV match enrolled students.",
          );
          setImporting(false);
          return;
        }

        // Update the students state with the imported data
        setStudents((prev) =>
          prev.map((student) => {
            const imported = matchedStudents.find((m) => m.id === student.id);
            return imported || student;
          }),
        );

        alert(
          `Successfully imported grades for ${matchedStudents.length} student(s). Click "Save All" to save to database.`,
        );
      } catch (error) {
        console.error("Error importing CSV:", error);
        alert("Failed to import CSV file. Please check the file format.");
      } finally {
        setImporting(false);
        // Reset file input
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      alert("Failed to read file");
      setImporting(false);
    };

    reader.readAsText(file);
  };

  const filteredStudents = students
    .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "total") return b.total - a.total;
      return b.gp - a.gp;
    });

  const stats = {
    classAverage:
      students.length > 0
        ? (
            students.reduce((acc, s) => acc + s.total, 0) / students.length
          ).toFixed(1)
        : "0.0",
    highestScore:
      students.length > 0 ? Math.max(...students.map((s) => s.total)) : 0,
    lowestScore:
      students.length > 0 ? Math.min(...students.map((s) => s.total)) : 0,
    excellentCount: students.filter((s) => s.status === "excellent").length,
    failingCount: students.filter((s) => s.status === "failing").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28">


      <main className="px-3 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 sm:space-y-4"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-lg shrink-0">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold truncate">
                  Grade Book
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                  Track and manage all student grades
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-3 sm:px-4 py-2 rounded-lg border border-border/60 bg-muted/50 text-foreground focus:outline-none text-xs sm:text-sm flex-1 sm:flex-none min-w-0"
              >
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>

              <div className="flex gap-1 sm:gap-2 flex-wrap">
                <Button
                  onClick={saveAllGrades}
                  disabled={saving || students.length === 0}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-500 gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 flex-1 sm:flex-none"
                >
                  <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">
                    {saving ? "Saving..." : "Save All"}
                  </span>
                  <span className="sm:hidden">{saving ? "..." : "Save"}</span>
                </Button>

                <Button
                  variant="outline"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 flex-1 sm:flex-none"
                  onClick={handleExportGrades}
                  disabled={students.length === 0}
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>

                <Button
                  className="bg-gradient-to-r from-primary to-secondary gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 flex-1 sm:flex-none"
                  onClick={() =>
                    document.getElementById("grade-import")?.click()
                  }
                  disabled={importing}
                >
                  <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">
                    {importing ? "Importing..." : "Import"}
                  </span>
                </Button>

                <input
                  id="grade-import"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportGrades}
                />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="pt-3 sm:pt-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      Class Average
                    </p>
                    <p className="text-lg sm:text-2xl font-bold">
                      {stats.classAverage}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-emerald-500/10 border-emerald-300/30">
                <CardContent className="pt-3 sm:pt-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Highest</p>
                    <p className="text-lg sm:text-2xl font-bold text-emerald-600">
                      {stats.highestScore}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="bg-red-500/10 border-red-300/30">
                <CardContent className="pt-3 sm:pt-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Lowest</p>
                    <p className="text-lg sm:text-2xl font-bold text-red-600">
                      {stats.lowestScore}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden sm:block"
            >
              <Card className="bg-blue-500/10 border-blue-300/30">
                <CardContent className="pt-3 sm:pt-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Excellent</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-600">
                      {stats.excellentCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="hidden sm:block"
            >
              <Card className="bg-orange-500/10 border-orange-300/30">
                <CardContent className="pt-3 sm:pt-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Failing</p>
                    <p className="text-lg sm:text-2xl font-bold text-orange-600">
                      {stats.failingCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-xs sm:text-sm"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 sm:px-4 py-2 rounded-lg border border-border/60 bg-muted/50 text-foreground focus:outline-none text-xs sm:text-sm"
            >
              <option value="name">Sort by Name</option>
              <option value="total">Sort by Score</option>
              <option value="grade">Sort by Grade</option>
            </select>
          </div>
        </motion.div>

        {/* Grade Table */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-lg">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">
              {filteredStudents.length} Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs sm:text-sm min-w-max">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold">
                      Student
                    </th>
                    <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap">
                      A1
                    </th>
                    <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap">
                      A2
                    </th>
                    <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap">
                      Mid
                    </th>
                    <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap">
                      Part
                    </th>
                    <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap">
                      Final
                    </th>
                    <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap">
                      Total
                    </th>
                    <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap">
                      Grade
                    </th>
                    <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap">
                      GP
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3 text-center font-semibold whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-6 sm:py-8 text-center text-muted-foreground"
                      >
                        Loading students and grades...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-6 sm:py-8 text-center text-muted-foreground"
                      >
                        {selectedCourse
                          ? "No enrolled students found"
                          : "Please select a course"}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, i) => (
                      <motion.tr
                        key={student.id}
                        variants={rise}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-foreground text-xs sm:text-sm">
                          <div className="flex flex-col">
                            <span className="truncate">{student.name}</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                              {student.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={student.assignment1}
                            onChange={(e) =>
                              updateStudentGrade(
                                student.id,
                                "assignment1",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-12 sm:w-14 px-1 sm:px-2 py-1 text-center text-xs sm:text-sm bg-background border border-border/60 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={student.assignment2}
                            onChange={(e) =>
                              updateStudentGrade(
                                student.id,
                                "assignment2",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-12 sm:w-14 px-1 sm:px-2 py-1 text-center text-xs sm:text-sm bg-background border border-border/60 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={student.midterm}
                            onChange={(e) =>
                              updateStudentGrade(
                                student.id,
                                "midterm",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-12 sm:w-14 px-1 sm:px-2 py-1 text-center text-xs sm:text-sm bg-background border border-border/60 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={student.participation}
                            onChange={(e) =>
                              updateStudentGrade(
                                student.id,
                                "participation",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-12 sm:w-14 px-1 sm:px-2 py-1 text-center text-xs sm:text-sm bg-background border border-border/60 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={student.finalExam}
                            onChange={(e) =>
                              updateStudentGrade(
                                student.id,
                                "finalExam",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-12 sm:w-14 px-1 sm:px-2 py-1 text-center text-xs sm:text-sm bg-background border border-border/60 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center font-bold text-primary text-xs sm:text-sm">
                          {student.total.toFixed(1)}
                        </td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                          <Badge className="bg-primary/20 text-primary text-xs">
                            {student.grade}
                          </Badge>
                        </td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold text-xs sm:text-sm">
                          {student.gp.toFixed(2)}
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 text-center">
                          <Badge className={getStatusColor(student.status)}>
                            {student.status}
                          </Badge>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      <LecturerBottomNav />
    </div>
  );
}
