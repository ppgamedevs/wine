import { notFound } from "next/navigation";

export const metadata = {
  title: "Gestionare abonament Premium",
  robots: { index: false, follow: false },
};

export default function PremiumManagePage(): never {
  notFound();
}
