import { Card, CardContent } from "@/components/ui/card";
import type { WineFaqItem } from "@/lib/wine-analysis";
import { getTranslations } from "next-intl/server";

export async function WineFaq({ items }: { items: WineFaqItem[] }) {
  const t = await getTranslations("Wine.faq");
  return (
    <section aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        {t("heading")}
      </h2>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <Card key={item.question} className="border-border/70">
            <CardContent className="p-5 sm:p-6">
              <h3 className="font-medium text-foreground">{item.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
