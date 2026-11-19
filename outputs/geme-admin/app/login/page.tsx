import type { Metadata } from "next";
import AdminLoginForm from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập quản trị | Cherylish" };

export default function LoginPage() {
  return <main className="admin-login-page"><AdminLoginForm /></main>;
}
