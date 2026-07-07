import { CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatLongDate } from "@/lib/format";
import type { WineryEvent } from "@/types";

const eventTypeLabel: Record<WineryEvent["eventType"], string> = {
  tasting: "Degustare",
  tour: "Tur crama",
  harvest: "Recolta",
  festival: "Festival",
  workshop: "Workshop",
  other: "Eveniment",
};

interface WineryEventsCalendarProps {
  events: WineryEvent[];
  wineryName: string;
}

export function WineryEventsCalendar({
  events,
  wineryName,
}: WineryEventsCalendarProps) {
  if (events.length === 0) return null;

  return (
    <section aria-labelledby="winery-events-heading">
      <h2
        id="winery-events-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        Calendar evenimente
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Degustari, tururi si evenimente de la {wineryName}. Program actualizat de
        crama.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {events.map((event) => {
          const dateLabel = formatLongDate(event.startsAt);
          const endLabel = event.endsAt
            ? formatLongDate(event.endsAt)
            : null;

          return (
            <Card
              key={event.id}
              className="border-border/70 transition-colors hover:border-wine/30"
            >
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-wine/10 px-2.5 py-0.5 text-xs font-medium text-wine">
                    {eventTypeLabel[event.eventType]}
                  </span>
                  {dateLabel ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {dateLabel}
                      {endLabel && endLabel !== dateLabel
                        ? ` - ${endLabel}`
                        : null}
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-3 font-serif text-lg font-semibold text-foreground">
                  {event.title}
                </h3>

                {event.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {event.description}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  {event.location ? (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {event.location}
                    </span>
                  ) : null}
                  {event.registrationUrl ? (
                    <a
                      href={event.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-wine hover:underline"
                    >
                      Detalii / inscriere
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
