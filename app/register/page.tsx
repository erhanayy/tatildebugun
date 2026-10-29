import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kayıt Ol | TatildeBugün",
  description: "TatildeBugün'e katılarak dünya seyahat haritanızı oluşturun ve gezginlerle tanışın.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
