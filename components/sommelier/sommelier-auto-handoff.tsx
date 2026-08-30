"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { storeSommelierPrompt } from "@/lib/sommelier-handoff";

export function SommelierAutoHandoff({
  href,
  prompt,
  message,
}: {
  href: string;
  prompt: string;
  message: string;
}) {
  const router = useRouter();

  useEffect(() => {
    storeSommelierPrompt(prompt);
    router.replace(href);
  }, [href, prompt, router]);

  return (
    <p role="status" className="text-center text-muted-foreground">
      {message}
    </p>
  );
}
