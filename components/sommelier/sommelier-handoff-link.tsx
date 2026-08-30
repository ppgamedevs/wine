"use client";

import Link from "next/link";
import { forwardRef, type ReactNode } from "react";
import { storeSommelierPrompt } from "@/lib/sommelier-handoff";

export const SommelierHandoffLink = forwardRef<
  HTMLAnchorElement,
  {
    href: string;
    prompt: string;
    className?: string;
    children: ReactNode;
  }
>(function SommelierHandoffLink({ href, prompt, className, children }, ref) {
  return (
    <Link
      ref={ref}
      href={href}
      className={className}
      onClick={() => storeSommelierPrompt(prompt)}
    >
      {children}
    </Link>
  );
});
