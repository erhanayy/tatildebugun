import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Yeni Şifre Belirle | TatildeBugün",
  description: "TatildeBugün hesabınız için yeni şifrenizi belirleyin.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
