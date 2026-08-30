import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Printer, GraduationCap, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { getResultsShareUrl } from "@/lib/config";
import { useToast } from "@/components/ui/use-toast";

import jsPDF from "jspdf";

// Simple helper function to create a table in PDF
function createPDFTable(
  doc: jsPDF,
  startY: number,
  headers: string[],
  rows: (string | number)[][],
  options: {
    colWidths?: number[];
    margin?: number;
    headerBg?: number[];
    bottomMargin?: number;
  } = {},
) {
  const margin = options.margin || 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = options.bottomMargin || 20;
  const colCount = headers.length;
  const colWidths =
    options.colWidths ||
    Array(colCount).fill((pageWidth - margin * 2) / colCount);

  let yPos = startY;
  const rowHeight = 6;

  const drawHeader = () => {
    doc.setFillColor(51, 65, 85);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");

    let headerX = margin;
    headers.forEach((header, i) => {
      doc.rect(headerX, yPos, colWidths[i], rowHeight, "F");
      doc.text(header, headerX + 2, yPos + 4.5, { maxWidth: colWidths[i] - 4 });
      headerX += colWidths[i];
    });

    yPos += rowHeight;
  };

  drawHeader();

  // Draw rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  rows.forEach((row, rowIndex) => {
    if (yPos + rowHeight > pageHeight - bottomMargin) {
      doc.addPage();
      yPos = margin;
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
    }

    if (rowIndex % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos, pageWidth - margin * 2, rowHeight, "F");
    }

    let xPos = margin;
    row.forEach((cell, colIndex) => {
      doc.text(String(cell), xPos + 2, yPos + 4.5, {
        maxWidth: colWidths[colIndex] - 4,
      });
      doc.setDrawColor(226, 232, 240);
      doc.rect(xPos, yPos, colWidths[colIndex], rowHeight);
      xPos += colWidths[colIndex];
    });

    yPos += rowHeight;
  });

  return yPos;
}
interface ResultCourse {
  title: string;
  code: string;
  credits: number | null;
}

interface ExamResultRow {
  id: string;
  course_id: string;
  academic_year: string;
  semester: string;
  marks: number;
  grade: string | null;
  grade_point: number | null;
  semester_remark?: string;
  remarks?: string | null;
  courses?: ResultCourse;
}

interface QuizResult {
  id: string;
  quiz_id: string;
  quiz_title: string;
  score: number;
  total_points: number;
  percentage: number;
  completed_at: string;
  time_taken: number;
  status: string;
  semester?: string;
  academic_year?: string;
  year_of_study?: number;
  course_code?: string;
  course_title?: string;
}

interface TermResult {
  term: string;
  gpa: number;
  cgpa: number;
  totalCredits: number;
  remark?: string;
  entries: Array<
    ExamResultRow & { courseTitle: string; courseCode: string; credits: number }
  >;
  quizResults: QuizResult[];
}

const getGradeColor = (grade: string | null | undefined) => {
  if (!grade) return "text-gray-700";
  const gradeUpper = grade.toUpperCase();
  if (gradeUpper.startsWith("A")) return "text-emerald-700";
  if (gradeUpper.startsWith("B")) return "text-blue-700";
  if (gradeUpper.startsWith("C")) return "text-amber-700";
  if (gradeUpper.startsWith("D")) return "text-orange-700";
  return "text-red-700";
};

const calculateSemesterRemark = (gp: number, grade: string | null): string => {
  if (!grade) return "—";
  if (gp >= 3.5) return "Excellent";
  if (gp >= 3.0) return "Very Good";
  if (gp >= 2.5) return "Good";
  if (gp >= 2.0) return "Satisfactory";
  if (gp >= 1.0) return "Pass";
  return "Fail";
};

export default function Results() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [resultsLoading, setResultsLoading] = useState(true);
  const [termResults, setTermResults] = useState<TermResult[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [cgpa, setCgpa] = useState(0);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const loadResults = async () => {
      try {
        setResultsLoading(true);

        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
        const MESSAGING_URL =
          import.meta.env.VITE_WEBMAIL_API_BASE_URL || "http://localhost:8084";

        // Fetch exam results from NAP-Backend (port 8000)
        let examData: any[] = [];
        try {
          const resp = await fetch(
            `${API_BASE_URL}/api/students/${user.uid}/results/`
          );
          if (resp.ok) {
            const resultsData = await resp.json();
            examData = resultsData.exam_results || [];
          }
        } catch {
          console.log("NAP-Backend unavailable, loading quiz results only");
        }

        // Fetch quiz results from Lecturer-Backend (port 8084)
        let quizData: any[] = [];
        try {
          const quizResp = await fetch(
            `${MESSAGING_URL}/api/quiz-attempts/?student_id=${user.uid}`
          );
          if (quizResp.ok) {
            const attempts = await quizResp.json();
            // Fetch quiz titles
            const quizIds = [...new Set(attempts.map((a: any) => a.quiz_id))];
            const quizMetaMap: Record<string, any> = {};
            for (const qid of quizIds) {
              try {
                const qResp = await fetch(`${MESSAGING_URL}/api/quizzes/${qid}/`);
                if (qResp.ok) {
                  const qData = await qResp.json();
                  quizMetaMap[String(qid)] = {
                    title: qData.title || "Quiz",
                    semester: qData.semester,
                    academic_year: qData.academic_year,
                    year_of_study: qData.year_of_study,
                    course_code: qData.course_code,
                    course_title: qData.course_title,
                  };
                }
              } catch {}
            }
            quizData = attempts.map((a: any) => ({
              id: String(a.id),
              quiz_id: String(a.quiz_id),
              quiz_title: quizMap[String(a.quiz_id)] || "Quiz",
              score: a.score,
              total_points: a.total_points,
              percentage: a.percentage,
              completed_at: a.completed_at,
              time_taken: a.time_taken,
              passed: a.passed,
              status: a.status,
              semester: quizMetaMap[String(a.quiz_id)]?.semester,
              academic_year: quizMetaMap[String(a.quiz_id)]?.academic_year,
              year_of_study: quizMetaMap[String(a.quiz_id)]?.year_of_study,
              course_code: quizMetaMap[String(a.quiz_id)]?.course_code,
              course_title: quizMetaMap[String(a.quiz_id)]?.course_title,
            }));
          }
        } catch {
          console.log("Failed to fetch quiz results");
        }

        if (examData.length === 0) {
          console.log("No exam grade data found for student");
          setTermResults([]);
          setCgpa(0);
          setQuizResults(quizData);
          return;
        }

        // Process exam results by term
        const termMap = new Map<string, TermResult>();
        examData.forEach((row: any) => {
          const term = `${row.academic_year} · ${row.semester}`;
          const existing = termMap.get(term) || {
            term,
            gpa: 0,
            cgpa: 0,
            totalCredits: 0,
            entries: [],
            quizResults: [],
          };

          const credits = row.credits || 3;
          const gradePoint = row.grade_point ?? 0;
          existing.entries.push({
            ...row,
            courseTitle: row.course_title,
            courseCode: row.course_code,
          });
          existing.totalCredits += credits;
          existing.gpa += gradePoint * credits;
          termMap.set(term, existing);
        });

        // Add quiz results to their respective terms
        quizData.forEach((qr: QuizResult) => {
          if (qr.academic_year && qr.semester) {
            const term = `${qr.academic_year} · ${qr.semester}`;
            if (!termMap.has(term)) {
              termMap.set(term, {
                term,
                gpa: 0,
                cgpa: 0,
                totalCredits: 0,
                entries: [],
                quizResults: [],
              });
            }
            termMap.get(term)!.quizResults.push(qr);
          }
        });

        const terms = Array.from(termMap.values()).map((t) => {
          const gpa = t.totalCredits
            ? Number((t.gpa / t.totalCredits).toFixed(2))
            : 0;
          return {
            ...t,
            gpa,
            remark: calculateSemesterRemark(gpa, t.entries[0]?.grade || null),
          };
        });

        const totalCredits = terms.reduce((sum, t) => sum + t.totalCredits, 0);
        const totalPoints = terms.reduce(
          (sum, t) => sum + t.gpa * t.totalCredits,
          0
        );
        const computedCgpa = totalCredits
          ? Number((totalPoints / totalCredits).toFixed(2))
          : 0;

        setTermResults(terms);
        setCgpa(computedCgpa);
        setQuizResults(quizData);
      } catch (error: any) {
        console.error("Error loading results:", error);
        toast({
          title: "Error",
          description: "Failed to load results",
          variant: "destructive",
        });
      } finally {
        setResultsLoading(false);
      }
    };

    loadResults();
  }, [user, profile]);

  const getPerformanceLevel = (
    gpa: number,
  ): { label: string; color: string; bgColor: string } => {
    if (gpa >= 4.5)
      return {
        label: "Excellent",
        color: "text-emerald-700",
        bgColor: "bg-emerald-50",
      };
    if (gpa >= 4.0)
      return {
        label: "Very Good",
        color: "text-blue-700",
        bgColor: "bg-blue-50",
      };
    if (gpa >= 3.5)
      return { label: "Good", color: "text-cyan-700", bgColor: "bg-cyan-50" };
    if (gpa >= 3.0)
      return {
        label: "Satisfactory",
        color: "text-amber-700",
        bgColor: "bg-amber-50",
      };
    return {
      label: "Needs Improvement",
      color: "text-orange-700",
      bgColor: "bg-orange-50",
    };
  };

  // ─── PDF Download ────────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // ── Header bar ──
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 28, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("OFFICIAL ACADEMIC TRANSCRIPT", pageWidth / 2, 12, {
        align: "center",
      });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Generated on ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`,
        pageWidth / 2,
        20,
        { align: "center" },
      );

      yPos = 36;

      // ── Student Info Box ──
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 32, 2, 2, "FD");

      const col1X = margin + 6;
      const col2X = pageWidth / 2 + 6;

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139); // slate-500

      doc.text("FULL NAME", col1X, yPos + 8);
      doc.text("STUDENT NUMBER", col2X, yPos + 8);
      doc.text("PROGRAMME", col1X, yPos + 22);
      doc.text("DEPARTMENT", col2X, yPos + 22);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);

      doc.text(profile?.full_name || "Not Available", col1X, yPos + 15);
      doc.text(profile?.student_number || "Not Available", col2X, yPos + 15);
      doc.text(profile?.programme || "Not Available", col1X, yPos + 29);
      doc.text(profile?.department || "Not Available", col2X, yPos + 29);

      yPos += 40;

      // ── Per-term tables ──
      termResults.forEach((term, termIdx) => {
        // Check if we need a new page
        const estimatedHeight = 14 + term.entries.length * 9 + 20;
        if (yPos + estimatedHeight > pageHeight - 25) {
          doc.addPage();
          yPos = margin;
        }

        // Term heading
        doc.setFillColor(30, 41, 59); // slate-800
        doc.rect(margin, yPos, pageWidth - margin * 2, 9, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(term.term, margin + 4, yPos + 6.2);
        yPos += 9;

        // Table
        yPos = createPDFTable(
          doc,
          yPos,
          ["Code", "Course Title", "Mark", "CUs", "Grade", "GD Pt", "Remark"],
          term.entries.map((c) => [
            c.courseCode || "—",
            c.courseTitle,
            c.marks?.toFixed(1) ?? "0.0",
            String(c.credits),
            c.grade || "—",
            c.grade_point?.toFixed(1) ?? "0.0",
            c.semester_remark || "—",
          ]),
          {
            margin,
            colWidths: [22, 45, 16, 12, 16, 16, 24],
            bottomMargin: 20,
          },
        );
        yPos += 3;

        if (yPos + 12 > pageHeight - 20) {
          doc.addPage();
          yPos = margin;
        }

        // GPA / CGPA summary strip
        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, yPos, pageWidth - margin * 2, 12, "FD");

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("Semester Remark:", margin + 4, yPos + 5);
        doc.text("GPA:", margin + 60, yPos + 5);
        doc.text("CGPA:", margin + 95, yPos + 5);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.text(term.remark || "NP", margin + 36, yPos + 5);

        doc.setTextColor(37, 99, 235); // blue-600
        doc.text(term.gpa.toFixed(2), margin + 73, yPos + 5);

        doc.setTextColor(79, 70, 229); // violet-600
        doc.text(cgpa.toFixed(2), margin + 110, yPos + 5);

        yPos += 18;
      });

      // ── Final CGPA banner ──
      if (yPos + 22 > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFillColor(15, 23, 42);
      doc.rect(margin, yPos, pageWidth - margin * 2, 18, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Cumulative GPA (CGPA): ${cgpa.toFixed(2)}`,
        pageWidth / 2,
        yPos + 7,
        { align: "center" },
      );
      const perf = getPerformanceLevel(cgpa);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(`Overall Performance: ${perf.label}`, pageWidth / 2, yPos + 14, {
        align: "center",
      });

      // ── Footer on every page ──
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text(
          "This transcript is computer-generated and is valid without a signature.",
          margin,
          pageHeight - 7,
        );
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - margin,
          pageHeight - 7,
          { align: "right" },
        );
      }

      doc.save(
        `academic-transcript-${profile?.student_number || user?.uid || "student"}.pdf`,
      );
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <StudentHeader />

      <main className="container py-4 sm:py-6 md:py-8 max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 sm:space-y-6"
        >
          {/* Header Section with Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                Academic Transcript
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your complete academic record and grades
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none gap-2"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">Print</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleDownloadPDF}
                disabled={isDownloading || termResults.length === 0}
              >
                <Download
                  className={`h-4 w-4 ${isDownloading ? "animate-bounce" : ""}`}
                />
                <span className="hidden sm:inline">
                  {isDownloading ? "Generating..." : "Download"}
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none gap-2"
                onClick={() => setShowQRModal(true)}
              >
                <QrCode className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">QR Code</span>
              </Button>
            </div>
          </div>

          {resultsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 animate-pulse h-96 bg-muted/20" />
              ))}
            </div>
          ) : termResults.length === 0 && quizResults.length === 0 ? (
            <Card className="p-12 text-center">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                No results available yet. Check back soon!
              </p>
            </Card>
          ) : (
            <div className="space-y-8" ref={transcriptRef}>
              {/* Student Information Card */}
              <Card className="p-4 md:p-6 border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Full Name
                    </p>
                    <p className="font-semibold text-foreground mt-1">
                      {profile?.full_name || "Not Available"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Student Number
                    </p>
                    <p className="font-semibold text-foreground mt-1">
                      {profile?.student_number || "Not Available"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Programme
                    </p>
                    <p className="font-semibold text-foreground mt-1">
                      {profile?.programme || "Not Available"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Department
                    </p>
                    <p className="font-semibold text-foreground mt-1">
                      {profile?.department || "Not Available"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Transcript Results */}
              {termResults.map((term, idx) => (
                <motion.div
                  key={term.term}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="space-y-2"
                >
                  {/* Semester Header */}
                  <h2 className="text-base md:text-lg font-bold text-foreground">
                    {term.term}
                  </h2>

                  {/* Responsive Table Container */}
                  <div className="overflow-x-auto">
                    <Card className="p-0 border">
                      {/* Desktop Table */}
                      <div className="hidden sm:block">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/50 bg-muted/30">
                              <th className="px-4 py-2 text-left font-bold text-xs uppercase text-muted-foreground">
                                Code
                              </th>
                              <th className="px-4 py-2 text-left font-bold text-xs uppercase text-muted-foreground">
                                Title
                              </th>
                              <th className="px-4 py-2 text-center font-bold text-xs uppercase text-muted-foreground">
                                Mark
                              </th>
                              <th className="px-4 py-2 text-center font-bold text-xs uppercase text-muted-foreground">
                                CUs
                              </th>
                              <th className="px-4 py-2 text-center font-bold text-xs uppercase text-muted-foreground">
                                Grade
                              </th>
                              <th className="px-4 py-2 text-center font-bold text-xs uppercase text-muted-foreground">
                                GD Pt
                              </th>
                              <th className="px-4 py-2 text-center font-bold text-xs uppercase text-muted-foreground">
                                Remark
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {term.entries.map((course) => (
                              <tr key={course.id} className="hover:bg-muted/50">
                                <td className="px-4 py-3 font-mono text-xs font-bold text-primary">
                                  {course.courseCode}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {course.courseTitle}
                                </td>
                                <td className="px-4 py-3 text-center font-semibold">
                                  {course.marks.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-center font-semibold">
                                  {course.credits}
                                </td>
                                <td
                                  className={`px-4 py-3 text-center font-bold ${getGradeColor(
                                    course.grade,
                                  )}`}
                                >
                                  {course.grade || "—"}
                                </td>
                                <td className="px-4 py-3 text-center font-semibold">
                                  {course.grade_point?.toFixed(1) || "0.0"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-xs font-bold text-emerald-600">
                                    {course.semester_remark || "—"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card Layout */}
                      <div className="sm:hidden divide-y divide-border/30">
                        {term.entries.map((course) => (
                          <div key={course.id} className="p-4 space-y-3">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-primary font-mono uppercase tracking-wide">
                                  {course.courseCode}
                                </p>
                                <p className="font-semibold text-sm text-foreground mt-1 leading-tight">
                                  {course.courseTitle}
                                </p>
                              </div>
                              <div className={`text-right flex-shrink-0`}>
                                <div
                                  className={`font-bold text-lg ${getGradeColor(
                                    course.grade,
                                  )}`}
                                >
                                  {course.grade || "—"}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {course.grade_point?.toFixed(1) || "0.0"} pts
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div className="text-center p-2 bg-muted/30 rounded-lg">
                                <p className="text-muted-foreground font-medium">
                                  Mark
                                </p>
                                <p className="font-bold text-base mt-1">
                                  {course.marks.toFixed(1)}
                                </p>
                              </div>
                              <div className="text-center p-2 bg-muted/30 rounded-lg">
                                <p className="text-muted-foreground font-medium">
                                  Credits
                                </p>
                                <p className="font-bold text-base mt-1">
                                  {course.credits}
                                </p>
                              </div>
                              <div className="text-center p-2 bg-muted/30 rounded-lg">
                                <p className="text-muted-foreground font-medium">
                                  Remark
                                </p>
                                <p className="font-bold text-emerald-600 text-xs mt-1">
                                  {course.semester_remark || "—"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* Semester Summary */}
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 text-sm bg-muted/30 rounded-lg p-4">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        Semester Remark
                      </p>
                      <p className="font-semibold text-emerald-600 mt-1">
                        {term.remark || "NP"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        GPA
                      </p>
                      <p className="font-bold text-lg text-primary mt-1">
                        {term.gpa.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        CGPA
                      </p>
                      <p className="font-bold text-lg text-secondary mt-1">
                        {cgpa.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Quiz Results for this term */}
                  {term.quizResults.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
                        Quiz Results
                      </h4>
                      <div className="grid gap-3">
                        {term.quizResults.map((quiz) => (
                          <Card key={quiz.id} className="p-3 bg-muted/20">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{quiz.quiz_title}</p>
                                {quiz.course_code && (
                                  <p className="text-xs text-muted-foreground">
                                    {quiz.course_code} - {quiz.course_title}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {new Date(quiz.completed_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground">Score</p>
                                  <p className="font-bold text-primary">
                                    {quiz.score}/{quiz.total_points} ({quiz.percentage}%)
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground">Time</p>
                                  <p className="font-medium">
                                    {Math.floor(quiz.time_taken / 60)}:{(quiz.time_taken % 60).toString().padStart(2, "0")}
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    quiz.percentage >= 70
                                      ? "bg-emerald-100 text-emerald-700"
                                      : quiz.percentage >= 50
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {quiz.percentage >= 70
                                    ? "Passed"
                                    : quiz.percentage >= 50
                                      ? "Average"
                                      : "Failed"}
                                </span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Unassigned Quiz Results (no term) */}
              {(() => {
                const unassignedQuizzes = quizResults.filter(
                  (qr) => !qr.academic_year || !qr.semester,
                );
                if (unassignedQuizzes.length === 0) return null;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <h2 className="text-xl font-bold text-foreground border-b border-border pb-2">
                      Quiz Results (Unassigned)
                    </h2>

                    <div className="grid gap-4">
                      {unassignedQuizzes.map((quiz, idx) => (
                      <motion.div
                        key={quiz.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="p-4">
                          <div className="flex flex-col gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground text-base">
                                {quiz.quiz_title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Completed on{" "}
                                {new Date(
                                  quiz.completed_at,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              <div className="text-center">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Score
                                </p>
                                <p className="text-xl font-bold text-primary mt-1">
                                  {quiz.score}/{quiz.total_points}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {quiz.percentage}%
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Time Taken
                                </p>
                                <p className="text-lg font-semibold mt-1">
                                  {Math.floor(quiz.time_taken / 60)}:
                                  {(quiz.time_taken % 60)
                                    .toString()
                                    .padStart(2, "0")}
                                </p>
                              </div>
                              <div className="text-center col-span-2 sm:col-span-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Status
                                </p>
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                                    quiz.percentage >= 70
                                      ? "bg-emerald-100 text-emerald-800"
                                      : quiz.percentage >= 50
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {quiz.percentage >= 70
                                    ? "Passed"
                                    : quiz.percentage >= 50
                                      ? "Average"
                                      : "Failed"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
                );
              })()}
            </div>
          )}
        </motion.div>
      </main>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">
                  Share Results
                </h2>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-white rounded-xl p-3 flex items-center justify-center mb-4 border border-border">
                <div ref={qrRef} className="w-full max-w-[200px]">
                  <QRCodeSVG
                    value={getResultsShareUrl(user?.uid || "")}
                    size={200}
                    level="H"
                    includeMargin={true}
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
                Scan this QR code to view academic results for{" "}
                <strong>{profile?.full_name || "this student"}</strong>
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowQRModal(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => {
                    const svgEl = qrRef.current?.querySelector("svg");
                    if (!svgEl) return;
                    const svgData = new XMLSerializer().serializeToString(
                      svgEl,
                    );
                    const canvas = document.createElement("canvas");
                    canvas.width = 256;
                    canvas.height = 256;
                    const ctx = canvas.getContext("2d");
                    const img = new Image();
                    img.onload = () => {
                      ctx?.drawImage(img, 0, 0);
                      const link = document.createElement("a");
                      link.href = canvas.toDataURL("image/png");
                      link.download = `results-qr-${user?.uid}.png`;
                      link.click();
                    };
                    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download QR
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <StudentBottomNav />
    </div>
  );
}
