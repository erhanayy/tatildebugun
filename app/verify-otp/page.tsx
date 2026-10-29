import { Suspense } from "react";
import { VerifyOtpForm } from "./verify-otp-form";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hesap Aktivasyonu (OTP) | TatildeBugün",
  description: "TatildeBugün hesabınızı 6 haneli doğrulama kodu ile aktifleştirin.",
};

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      }
    >
      <VerifyOtpForm />
    </Suspense>
  );
}
