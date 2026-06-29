"use client";

import { useState } from "react";
import { adminLoginAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const secret = String(formData.get("secret") ?? "");
    try {
      const result = await adminLoginAction(secret);
      if (result?.ok === false) {
        setError(result.error);
      }
    } catch {
      // redirect throws
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="secret">Parola admin</Label>
        <Input
          id="secret"
          name="secret"
          type="password"
          required
          autoComplete="current-password"
          placeholder="ADMIN_SECRET din .env.local"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-wine text-wine-foreground hover:bg-wine/90"
      >
        {loading ? "Se verifica..." : "Intra in admin"}
      </Button>
    </form>
  );
}
