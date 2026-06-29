import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WineSubmissionStatus } from "@/lib/schema";

export function CommunityBadge({
  status,
}: {
  status: WineSubmissionStatus | string;
}) {
  if (status !== "user_submitted") return null;

  return (
    <Badge className="gap-1.5 bg-gold/15 text-foreground hover:bg-gold/20">
      <Users className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
      Adaugat de comunitate
    </Badge>
  );
}
