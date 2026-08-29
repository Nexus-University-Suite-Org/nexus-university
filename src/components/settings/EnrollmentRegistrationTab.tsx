import { useState, useEffect, useRef, ReactNode } from "react";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  GraduationCap,
  ChevronRight,
  Download,
  Eye,
  Printer,
  BookMarked,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getEnrollmentShareUrl, generateQRCodeDataUrl } from "@/lib/config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend, getMessagingBackend } from "@/lib/backendApi";
import { Link } from "react-router-dom";

interface Enrollment {
  id: string;
  status: string;
  enrolled_at: string;
  grade: number | null;
  paper_type: string;
  course: {
    code: string;
    title: string;
    credits: number;
    semester: string;
    year: number;
  };
}

interface CourseUnit {
  title: ReactNode;
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  year: number;
}

export function EnrollmentRegistrationTab() {
  const { user, profile } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courseUnits, setCourseUnits] = useState<CourseUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [fees, setFees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentPercentage, setPaymentPercentage] = useState(0);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchEnrollments();
      fetchPaymentData();
    }
  }, [user]);

  useEffect(() => {
    if (profile?.programme) {
      fetchCourseUnits(profile.programme);
    }
  }, [profile?.programme]);

  const fetchCourseUnits = async (programTitle: string) => {
    try {
      setLoadingUnits(true);
      // Fetch all course units from the messaging backend
      const unitsData = await getMessagingBackend<any[]>(
        `/api/course-units/`,
      );
      const mapped: CourseUnit[] = unitsData.map((u: any) => ({
        id: u.id,
        code: u.code,
        name: u.name,
        credits: u.credits,
        semester: u.semester,
        year: u.year,
        title: u.name,
      }));
      setCourseUnits(mapped);
    } catch (error) {
      console.error("Error fetching course units:", error);
    } finally {
      setLoadingUnits(false);
    }
  };

  const fetchPaymentData = async () => {
    try {
      if (!user) return;
      const feesData = await getBackend<any[]>(
        `/api/student-fees/?student_id=${user.uid}`,
      );

      if (feesData.length > 0) {
        setFees(feesData);
        const totalFees = feesData.reduce(
          (sum: number, fee: any) => sum + (fee.amount || 0),
          0,
        );
        const totalPaid = feesData.reduce(
          (sum: number, fee: any) => sum + (fee.paid_amount || 0),
          0,
        );
        const percentage = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;
        setPaymentPercentage(percentage);
      }
    } catch (error) {
      console.error("Error fetching payment data:", error);
    }
  };

  const fetchEnrollments = async () => {
    try {
      if (!user) return;
      setLoading(true);
      const enrollmentDocs = await getMessagingBackend<any[]>(
        `/api/enrollments/?student_id=${user.uid}`,
      );
      console.log("Enrollment data:", enrollmentDocs);

      if (enrollmentDocs.length === 0) {
        setEnrollments([]);
        return;
      }

      // The enrollments endpoint already includes course data
      const enrollmentData = enrollmentDocs.map((e: any) => ({
        ...e,
        course: e.course
          ? {
              code: e.course.code,
              title: e.course.title,
              credits: e.course.credits,
              semester: e.course.semester,
              year: e.course.year || 0,
            }
          : {
              code: "N/A",
              title: "N/A",
              credits: 0,
              semester: "N/A",
              year: 0,
            },
      }));

      setEnrollments(enrollmentData as Enrollment[]);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentSemester = enrollments.filter(
    (e) => e.course?.semester === "Semester 1" && e.course?.year === 2026,
  );
  const totalCredits = currentSemester.reduce(
    (sum, e) => sum + (e.course?.credits || 0),
    0,
  );
  const approvedCount = enrollments.filter(
    (e) => e.status === "approved",
  ).length;
  const pendingCount = enrollments.filter((e) => e.status === "pending").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "rejected":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleDownloadSlip = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Header
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, pageWidth, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("PROOF OF ENROLLMENT AND REGISTRATION", pageWidth / 2, 10, {
        align: "center",
      });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Nexus University", pageWidth / 2, 17, { align: "center" });

      yPos = 32;

      // Student details
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Student Details", margin, yPos);
      yPos += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Name: ${profile?.full_name || "N/A"}`, margin, yPos);
      yPos += 5;
      doc.text(
        `Student Number: ${profile?.student_number || "N/A"}`,
        margin,
        yPos,
      );
      yPos += 5;
      doc.text(`Programme: ${profile?.programme || "N/A"}`, margin, yPos);
      yPos += 5;
      doc.text(`Department: ${profile?.department || "N/A"}`, margin, yPos);
      yPos += 8;

      // Summary
      const totalFees = fees.reduce(
        (sum: number, fee: any) => sum + (fee.amount || 0),
        0,
      );
      const totalPaid = fees.reduce(
        (sum: number, fee: any) => sum + (fee.paid_amount || 0),
        0,
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Registration Summary", margin, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Academic Year: 2026`, margin, yPos);
      yPos += 5;
      doc.text(`Semester: Semester 1`, margin, yPos);
      yPos += 5;
      doc.text(`Registered Courses: ${currentSemester.length}`, margin, yPos);
      yPos += 5;
      doc.text(`Total Credits: ${totalCredits}`, margin, yPos);
      yPos += 5;
      doc.text(
        `Fees Paid: UGX ${Number(totalPaid).toLocaleString()} / UGX ${Number(totalFees).toLocaleString()}`,
        margin,
        yPos,
      );
      yPos += 5;
      doc.text(
        `Payment Percentage: ${paymentPercentage.toFixed(1)}%`,
        margin,
        yPos,
      );
      yPos += 8;

      // Courses table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Registered Courses", margin, yPos);
      yPos += 6;

      const colX = [margin, margin + 35, margin + 125, margin + 145];
      const rowHeight = 7;

      const drawTableHeader = () => {
        doc.setFillColor(51, 65, 85);
        doc.rect(margin, yPos, pageWidth - margin * 2, rowHeight, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("Code", colX[0] + 2, yPos + 4.7);
        doc.text("Course Title", colX[1] + 2, yPos + 4.7);
        doc.text("Credits", colX[2] + 2, yPos + 4.7);
        doc.text("Status", colX[3] + 2, yPos + 4.7);
        yPos += rowHeight;
      };

      drawTableHeader();

      const tableRows =
        currentSemester.length > 0 ? currentSemester : enrollments;
      tableRows.forEach((enrollment, idx) => {
        if (yPos + rowHeight > pageHeight - 25) {
          doc.addPage();
          yPos = margin;
          drawTableHeader();
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, yPos, pageWidth - margin * 2, rowHeight, "F");
        }

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(enrollment.course?.code || "N/A", colX[0] + 2, yPos + 4.7, {
          maxWidth: 30,
        });
        doc.text(enrollment.course?.title || "N/A", colX[1] + 2, yPos + 4.7, {
          maxWidth: 85,
        });
        doc.text(
          String(enrollment.course?.credits || 0),
          colX[2] + 2,
          yPos + 4.7,
        );
        doc.text(enrollment.status || "N/A", colX[3] + 2, yPos + 4.7, {
          maxWidth: 25,
        });

        doc.setDrawColor(226, 232, 240);
        doc.line(
          margin,
          yPos + rowHeight,
          pageWidth - margin,
          yPos + rowHeight,
        );
        yPos += rowHeight;
      });

      // Footer
      if (yPos + 18 > pageHeight - 10) {
        doc.addPage();
        yPos = margin;
      }

      yPos += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Verification URL: ${getEnrollmentShareUrl(user?.uid || "")}`,
        margin,
        yPos,
      );
      yPos += 5;
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} - Document ID: ${user?.uid || "N/A"}`,
        margin,
        yPos,
      );

      doc.save(
        `enrollment-slip-${profile?.student_number || user?.uid || "student"}.pdf`,
      );
    } catch (error) {
      console.error("Error generating enrollment slip PDF:", error);
      alert("Failed to download enrollment slip. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Current Semester",
            value: "Semester 1, 2026",
            icon: Calendar,
            color: "from-primary to-primary/50",
            bg: "bg-primary/10",
          },
          {
            label: "Enrolled Courses",
            value: currentSemester.length,
            icon: BookOpen,
            color: "from-secondary to-secondary/50",
            bg: "bg-secondary/10",
          },
          {
            label: "Credit Load",
            value: `${totalCredits} / 24`,
            icon: FileText,
            color: "from-accent to-accent/50",
            bg: "bg-accent/10",
          },
          {
            label: "Registration Status",
            value: pendingCount > 0 ? "Pending" : "Complete",
            icon: pendingCount > 0 ? Clock : CheckCircle2,
            color:
              pendingCount > 0
                ? "from-amber-500 to-amber-500/50"
                : "from-emerald-500 to-emerald-500/50",
            bg: pendingCount > 0 ? "bg-amber-500/10" : "bg-emerald-500/10",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`}
              />
              <CardContent className="pt-6">
                <div
                  className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-primary/5 via-transparent to-secondary/5">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Course Registration</h3>
                <p className="text-sm text-muted-foreground">
                  Register for new courses this semester
                </p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const printWindow = window.open(
                    "",
                    "",
                    "width=800,height=600",
                  );
                  if (printWindow) {
                    const courseRows = enrollments
                      .map(
                        (e) =>
                          "<tr>" +
                          "<td>" +
                          (e.course?.code || "N/A") +
                          "</td>" +
                          "<td>" +
                          (e.course?.title || "N/A") +
                          "</td>" +
                          "<td>" +
                          (e.course?.credits || "N/A") +
                          "</td>" +
                          "<td><strong>" +
                          e.status +
                          "</strong></td>" +
                          "</tr>",
                      )
                      .join("");

                    // Create a hidden div to render QR code and get its SVG
                    const qrContainer = document.createElement("div");
                    qrContainer.style.display = "none";
                    document.body.appendChild(qrContainer);

                    const qrValue = getEnrollmentShareUrl(user?.uid || "");

                    const html = `
                      <html>
                        <head>
                          <title>Proof of Enrollment and Registration</title>
                          <style>
                            body { font-family: Arial, sans-serif; margin: 40px; }
                            .header { text-align: center; margin-bottom: 30px; position: relative; }
                            .qr-code { position: absolute; top: 0; right: 0; width: 120px; height: 120px; border: 2px solid #d1d5db; padding: 5px; background: white; }
                            h1 { color: #1f2937; margin: 0; }
                            .subheader { color: #6b7280; font-size: 14px; }
                            .content { margin: 30px 0; }
                            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
                            .info-box { border: 1px solid #d1d5db; padding: 15px; border-radius: 8px; }
                            .label { font-weight: bold; color: #374151; font-size: 12px; text-transform: uppercase; }
                            .value { font-size: 16px; color: #1f2937; margin-top: 5px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #d1d5db; }
                            td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
                            .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
                            .signature { margin-top: 40px; display: flex; justify-content: space-around; }
                            .sig-box { text-align: center; width: 40%; }
                            .qr-label { font-size: 10px; text-align: center; color: #6b7280; margin-top: 3px; }
                            @media print { body { margin: 0; padding: 20px; } }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <div class="qr-code">
                              <img src="${generateQRCodeDataUrl(qrValue, 120)}" alt="QR Code" style="width: 100%; height: 100%;" />
                              <div class="qr-label">Scan to verify</div>
                            </div>
                            <h1>PROOF OF ENROLLMENT AND REGISTRATION</h1>
                            <p class="subheader">Nexus University</p>
                          </div>
                          
                          <div class="content">
                            <div class="info-grid">
                              <div class="info-box">
                                <div class="label">Student Name</div>
                                <div class="value">${
                                  profile?.full_name || "N/A"
                                }</div>
                              </div>
                              <div class="info-box">
                                <div class="label">Student Number</div>
                                <div class="value">${
                                  profile?.student_number || "N/A"
                                }</div>
                              </div>
                              <div class="info-box">
                                <div class="label">Programme</div>
                                <div class="value">${
                                  profile?.programme || "N/A"
                                }</div>
                              </div>
                              <div class="info-box">
                                <div class="label">Department</div>
                                <div class="value">${
                                  profile?.department || "N/A"
                                }</div>
                              </div>
                            </div>
                            
                            <div class="info-grid">
                              <div class="info-box">
                                <div class="label">Academic Year</div>
                                <div class="value">2026</div>
                              </div>
                              <div class="info-box">
                                <div class="label">Semester</div>
                                <div class="value">Semester 1</div>
                              </div>
                              <div class="info-box">
                                <div class="label">Total Courses Registered</div>
                                <div class="value">${enrollments.length}</div>
                              </div>
                              <div class="info-box">
                                <div class="label">Total Credits</div>
                                <div class="value">${totalCredits}</div>
                              </div>
                            </div>
                            
                            <h3 style="margin-top: 30px; color: #374151;">Registered Courses</h3>
                            <table>
                              <thead>
                                <tr>
                                  <th>Course Code</th>
                                  <th>Course Title</th>
                                  <th>Credits</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${courseRows}
                              </tbody>
                            </table>
                          </div>
                          
                          <div class="signature">
                            <div class="sig-box">
                              <p style="margin: 50px 0 5px 0; border-top: 1px solid #000;"></p>
                              <p style="margin: 0; font-size: 12px;">Registrar's Signature</p>
                            </div>
                            <div class="sig-box">
                              <p style="margin: 50px 0 5px 0;">Date: ${new Date().toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div class="footer">
                            <p>Document ID: ${
                              user?.uid
                            } | This is an official document from Nexus University. Issued on ${new Date().toLocaleDateString()}</p>
                            <p>To verify this document, scan the QR code in the top right corner.</p>
                          </div>
                        </body>
                      </html>
                    `;

                    printWindow.document.write(html);
                    printWindow.document.close();

                    // Clean up the container
                    document.body.removeChild(qrContainer);

                    printWindow.print();
                  }
                }}
              >
                <Printer className="h-4 w-4" />
                Print Proof
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDownloadSlip}
              >
                <Download className="h-4 w-4" />
                Download Slip
              </Button>
              <Button asChild className="gap-2">
                <Link to="/registration">
                  <BookOpen className="h-4 w-4" />
                  Register Courses
                </Link>
              </Button>
              {paymentPercentage >= 60 && (
                <Button
                  variant="default"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    const printWindow = window.open(
                      "",
                      "",
                      "width=900,height=700",
                    );
                    if (printWindow) {
                      const coursesList = enrollments
                        .filter(
                          (e) =>
                            e.course?.semester === "Semester 1" &&
                            e.course?.year === 2026,
                        )
                        .map(
                          (e) =>
                            "<tr>" +
                            "<td>" +
                            (e.course?.code || "N/A") +
                            "</td>" +
                            "<td>" +
                            (e.course?.title || "N/A") +
                            "</td>" +
                            "</tr>",
                        )
                        .join("");

                      const html = `
                        <html>
                          <head>
                            <title>Exam Permit</title>
                            <style>
                              body { font-family: Arial, sans-serif; margin: 30px; }
                              .container { max-width: 700px; margin: 0 auto; }
                              .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #059669; padding-bottom: 20px; }
                              h1 { color: #059669; margin: 0; font-size: 28px; }
                              .subheader { color: #666; font-size: 16px; margin-top: 5px; }
                              .permit-number { text-align: right; font-weight: bold; color: #374151; margin-bottom: 20px; }
                              .student-info { background: #f0fdf4; border: 2px solid #059669; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                              .info-row { display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 12px; }
                              .label { font-weight: bold; color: #059669; }
                              .value { color: #1f2937; }
                              .notice { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
                              .notice-title { font-weight: bold; color: #b45309; margin-bottom: 8px; }
                              .notice-text { color: #78350f; font-size: 13px; line-height: 1.5; }
                              .courses { margin: 20px 0; }
                              .courses-title { font-weight: bold; color: #374151; margin-bottom: 10px; font-size: 14px; }
                              table { width: 100%; border-collapse: collapse; }
                              th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
                              th { background-color: #059669; color: white; font-weight: bold; }
                              .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
                              .signature-line { margin-top: 40px; display: flex; justify-content: space-around; }
                              .sig-box { text-align: center; width: 40%; }
                              .sig-space { height: 50px; border-top: 1px solid #000; margin-bottom: 5px; }
                              @media print { body { margin: 0; padding: 20px; } }
                            </style>
                          </head>
                          <body>
                            <div class="container">
                              <div class="header">
                                <h1>EXAMINATION PERMIT</h1>
                                <p class="subheader">Nexus University</p>
                              </div>

                              <div class="permit-number">
                                Permit ID: ${
                                  user?.uid
                                }-${new Date().getFullYear()}
                              </div>

                              <div class="student-info">
                                <div class="info-row">
                                  <div class="label">Student Name:</div>
                                  <div class="value">${
                                    profile?.full_name || "N/A"
                                  }</div>
                                </div>
                                <div class="info-row">
                                  <div class="label">Student Number:</div>
                                  <div class="value">${
                                    profile?.student_number || "N/A"
                                  }</div>
                                </div>
                                <div class="info-row">
                                  <div class="label">Programme:</div>
                                  <div class="value">${
                                    profile?.programme || "N/A"
                                  }</div>
                                </div>
                                <div class="info-row">
                                  <div class="label">Department:</div>
                                  <div class="value">${
                                    profile?.department || "N/A"
                                  }</div>
                                </div>
                              </div>

                              <div class="notice">
                                <div class="notice-title">✓ Clearance Status: CLEARED</div>
                                <div class="notice-text">
                                  This student has met all academic and financial requirements for examination eligibility.
                                  Payment Status: ${paymentPercentage.toFixed(
                                    1,
                                  )}% of tuition fees paid.
                                </div>
                              </div>

                              <div class="courses">
                                <div class="courses-title">Registered Courses for Examination:</div>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Course Code</th>
                                      <th>Course Title</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${coursesList}
                                  </tbody>
                                </table>
                              </div>

                              <div class="signature-line">
                                <div class="sig-box">
                                  <div class="sig-space"></div>
                                  <p>Registrar's Signature</p>
                                </div>
                                <div class="sig-box">
                                  <p>Date: ${new Date().toLocaleDateString()}</p>
                                </div>
                              </div>

                              <div class="footer">
                                <p>This permit authorizes the above student to sit for examinations in the registered courses.</p>
                                <p>Valid for Academic Year 2026 • Semester 1</p>
                              </div>
                            </div>
                          </body>
                        </html>
                      `;

                      printWindow.document.write(html);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Print Exam Permit
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Load Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Credit Load Progress</CardTitle>
          <CardDescription>
            Your course registration credit status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Credits</span>
              <span className="font-semibold">{totalCredits} / 24 credits</span>
            </div>
            <Progress value={(totalCredits / 24) * 100} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Minimum: 12 credits</span>
              <span>Maximum: 24 credits</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrolled Courses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Registered Courses</CardTitle>
              <CardDescription>
                Courses you're enrolled in this semester
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {enrollments.length} Total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No enrollments yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't registered for any courses
              </p>
              <Button asChild>
                <Link to="/registration">Register Now</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.map((enrollment, i) => (
                <motion.div
                  key={enrollment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {enrollment.course?.code}
                        </Badge>
                        <Badge className={getStatusColor(enrollment.status)}>
                          {enrollment.status}
                        </Badge>
                        <Badge
                          className={`text-xs border-0 ${
                            (enrollment.paper_type || "normal") === "retake"
                              ? "bg-red-500/10 text-red-600"
                              : (enrollment.paper_type || "normal") === "missed"
                                ? "bg-amber-500/10 text-amber-600"
                                : (enrollment.paper_type || "normal") === "supplementary"
                                  ? "bg-purple-500/10 text-purple-600"
                                  : "bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {(enrollment.paper_type || "normal").charAt(0).toUpperCase() + (enrollment.paper_type || "normal").slice(1)}
                        </Badge>
                      </div>
                      <p className="font-medium">{enrollment.course?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {enrollment.course?.credits} Credits •{" "}
                        {enrollment.course?.semester} {enrollment.course?.year}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Units of Selected Program */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Program Course Units</CardTitle>
              <CardDescription>
                Units available for {profile?.programme || "your program"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {courseUnits.length} Units
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUnits ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : courseUnits.length === 0 ? (
            <div className="text-center py-12">
              <BookMarked className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No units found</h3>
              <p className="text-muted-foreground mb-4">
                No course units are available for the selected program
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {courseUnits.map((unit, i) => (
                <motion.div
                  key={unit.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <GraduationCap className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {unit.code}
                        </Badge>
                      </div>
                      <p className="font-medium">{unit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {unit.credits} Credits • Semester {unit.semester} Year{" "}
                        {unit.year}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
