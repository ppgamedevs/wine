import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getAdminSecret } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = Boolean(getAdminSecret());

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-3xl font-bold text-foreground">
        VinIntel Admin
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Acces pentru verificarea vinurilor adaugate de comunitate.
      </p>

      {!configured ? (
        <p className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Seteaza <code className="text-xs">ADMIN_SECRET</code> in{" "}
          <code className="text-xs">.env.local</code> si reporneste serverul.
        </p>
      ) : (
        <div className="mt-8 rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          {error === "config" ? (
            <p className="mb-4 text-sm text-destructive">
              Configuratie admin lipsa.
            </p>
          ) : null}
          <AdminLoginForm />
        </div>
      )}
    </main>
  );
}
