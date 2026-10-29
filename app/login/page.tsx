import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Giriş Yap | TatildeBugün",
  description: "TatildeBugün kullanıcı ve tesis yönetim paneline giriş yapın.",
};

export default function LoginPage() {
  return <LoginForm />;
}
