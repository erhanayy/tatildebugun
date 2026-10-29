import { ForgotPasswordForm } from "./forgot-password-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Şifremi Unuttum | TatildeBugün",
  description: "TatildeBugün hesabınızın şifresini güvenle sıfırlayın.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
