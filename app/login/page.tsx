import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Giriş Yap | AllTripX",
  description: "AllTripX küresel seyahat haritanıza ve gezgin ağınıza giriş yapın.",
};

export default function LoginPage() {
  return <LoginForm />;
}
