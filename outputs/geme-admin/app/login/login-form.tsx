"use client";

import { FormEvent, useState } from "react";

export default function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Email hoặc mật khẩu không đúng.");
      window.location.assign("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không đăng nhập được. Vui lòng thử lại.");
      setBusy(false);
    }
  }

  return <div className="login-content">
    <p className="login-eyebrow">CHERYLISH · ADMIN</p>
    <h1 className="login-title" id="login-title">Đăng nhập quản trị</h1>
    <p className="login-description">Sử dụng tài khoản quản trị được cấp để tiếp tục.</p>
    <form onSubmit={submit}>
      <label className="login-field" htmlFor="admin-email">
        <span className="login-label">Tài khoản hoặc email</span>
        <input id="admin-email" name="email" className="login-input" type="text" autoComplete="username" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} />
      </label>
      <label className="login-field" htmlFor="admin-password">
        <span className="login-label">Mật khẩu</span>
        <input id="admin-password" name="password" className="login-input" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} />
      </label>
      {error && <p className="login-error" id="login-error" role="alert">{error}</p>}
      <button className="login-submit" type="submit" disabled={busy}>{busy ? "Đang xác thực…" : "Đăng nhập"}</button>
    </form>
    <p className="login-note">Khu vực dành cho quản trị viên.</p>
  </div>;
}
