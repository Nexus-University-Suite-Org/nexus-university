import { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  GraduationCap,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  QrCode,
  Printer,
} from "lucide-react";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { QRCodeSVG } from "qrcode.react";
import { getIdCardShareUrl } from "@/lib/config";

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground border-b border-border/60 py-1 last:border-b-0">
    <span className="font-semibold uppercase tracking-wide">{label}</span>
    <span className="text-right text-foreground font-medium max-w-[55%]">
      {value}
    </span>
  </div>
);

export default function IdCard() {
  const { user, profile } = useAuth();
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchStudentProfile = async () => {
      try {
        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

        const resp = await fetch(
          `${API_BASE_URL}/api/students/${user.uid}/profile/`
        );
        if (!resp.ok) throw new Error("Failed to fetch profile");

        const data = await resp.json();
        setStudentData(data);
      } catch (error) {
        console.error("Error fetching student profile:", error);
        // Fallback to auth context data if API fails
        setStudentData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProfile();
  }, [user?.uid]);

  const student = useMemo(
    () => ({
      name:
        studentData?.full_name ||
        profile?.full_name ||
        user?.displayName ||
        "Student Name",
      program:
        studentData?.programme ||
        profile?.programme ||
        profile?.department ||
        "Bachelor of Science in Computer Science",
      studentNumber:
        studentData?.student_number ||
        profile?.student_number ||
        "NU-2026-00123",
      registrationNumber:
        studentData?.registration_number ||
        profile?.registration_number ||
        "2026/HD07/12345/PS",
      year: studentData?.year || "Year 2",
      campus: studentData?.college || profile?.college || "Main Campus",
      phone: studentData?.phone || profile?.phone || "+256 700 000 000",
      validThru: studentData?.id_card_valid_thru || "Aug 2026",

    }),
    [studentData, profile, user],
  );

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-24 md:pb-10">
      <StudentHeader />

      <main className="container py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <Badge className="w-fit" variant="secondary">
                Digital + Print Ready
              </Badge>
              <h1 className="font-display text-3xl sm:text-4xl font-bold">
                University ID Card
              </h1>
              <p className="text-sm text-muted-foreground">
                Preview the front and back of your official Nexus University ID.
                Click print to produce both sides.
              </p>
            </div>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Front & Back
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2 items-stretch">
            {/* Front Side */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative h-full"
            >
              <Card
                className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-primary to-secondary text-primary-foreground h-full flex flex-col"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_0%,white,transparent_30%)]" />
                <CardContent className="relative p-6 space-y-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] font-semibold">
                        Nexus University
                      </p>
                      <h2 className="text-2xl font-black">Student ID</h2>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-white/20 text-white border-white/30"
                    >
                      Valid Thru: {student.validThru}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl font-bold">
                      {student.name.charAt(0)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold leading-tight">
                        {student.name}
                      </p>
                      <p className="text-sm text-white/80">{student.program}</p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <ShieldCheck className="h-4 w-4" />
                        <span>{student.studentNumber}</span>
                      </div>
                      <div className="text-xs text-white/70 font-mono">
                        Reg: {student.registrationNumber}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-white/90">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>{student.year}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>{student.validThru}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{student.campus}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{student.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-white/80">
                      <p className="font-semibold">Nexus University</p>
                      <p>Main Campus • Kampala</p>
                    </div>
                    <div className="text-right text-[10px] uppercase tracking-wide text-white/70">
                      <p>Keep this card on you at all times.</p>
                      <p>Property of Nexus University.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <p className="mt-2 text-xs text-muted-foreground">Front Side</p>
            </motion.div>

            {/* Back Side */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative h-full"
            >
              <Card className="overflow-hidden border border-border/60 shadow-2xl bg-card h-full flex flex-col">
                <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Back of Card</h2>
                    <Badge variant="outline" className="text-[11px]">
                      Student
                    </Badge>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <InfoRow
                      label="Student No."
                      value={student.studentNumber}
                    />
                    <InfoRow
                      label="Reg. No."
                      value={student.registrationNumber}
                    />
                    <InfoRow label="Program" value={student.program} />
                    <InfoRow label="Year" value={student.year} />
                    <InfoRow label="Campus" value={student.campus} />
                    <InfoRow label="Phone" value={student.phone} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">
                        Cardholder Responsibilities
                      </p>
                      <p>- Present on request by university staff.</p>
                      <p>- Report loss immediately to admin office.</p>
                      <p>- Non-transferable; remains university property.</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-white p-2 rounded-lg border">
                        <QRCodeSVG
                          value={getIdCardShareUrl(user?.uid || "")}
                          size={80}
                          level="H"
                          includeMargin={true}
                          fgColor="#000000"
                          bgColor="#ffffff"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground text-center">
                        Scan for verification
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-3">
                    <div className="flex items-center gap-2 text-foreground">
                      <User className="h-4 w-4" />
                      <span>Registrar | Nexus University</span>
                    </div>
                    <span className="text-right">
                      support@nexusuniversity.ac.ug
                    </span>
                  </div>
                </CardContent>
              </Card>
              <p className="mt-2 text-xs text-muted-foreground">Back Side</p>
            </motion.div>
          </div>
        </div>
      </main>

      <StudentBottomNav />
    </div>
  );
}
