import type { Metadata } from "next";
import Image from "next/image";
import AdminLoginForm from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập quản trị | Cherylish Jewelry" };

export default function LoginPage() {
  return <main className="cherylish-login">
    <div className="login-shell">
      <aside className="login-brand" aria-label="Cherylish Jewelry">
        <Image className="login-brand__image" src="/cherylish-jewelry-logo.png" width={1254} height={1254} alt="Cherylish Jewelry" priority />
      </aside>
      <section className="login-panel" aria-labelledby="login-title">
        <AdminLoginForm />
      </section>
    </div>
  </main>;
}
