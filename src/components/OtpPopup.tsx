import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OtpPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otp: string;
  email: string;
  expiryMinutes: number;
  title?: string;
  instructions?: string;
}

export default function OtpPopup({
  open,
  onOpenChange,
  otp,
  email,
  expiryMinutes,
  title = "Your Verification Code",
  instructions,
}: OtpPopupProps) {
  const [timeLeft, setTimeLeft] = useState(expiryMinutes * 60);

  useEffect(() => {
    if (!open) {
      setTimeLeft(expiryMinutes * 60);
      return;
    }

    setTimeLeft(expiryMinutes * 60);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, expiryMinutes]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center border border-secondary/30">
              <KeyRound className="h-8 w-8 text-secondary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {instructions || (
              <>
                We've sent a verification code to{" "}
                <span className="font-medium text-foreground">{email}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex items-center justify-center gap-2">
            {otp.split("").map((digit, index) => (
              <div
                key={index}
                className="h-14 w-14 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-2xl font-bold text-foreground"
              >
                {digit}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span>Expires in {formatTime(timeLeft)}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg w-full">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span>
              If you did not receive the email, check your spam folder or request a new code.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            I've noted the code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
