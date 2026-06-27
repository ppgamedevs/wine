interface JsonLdProps {
  /** One schema object or an array of schema objects. */
  data: Record<string, unknown> | Record<string, unknown>[];
  id?: string;
}

/**
 * Renders structured data as a JSON-LD script tag. Safe for Server Components.
 */
export function JsonLd({ data, id }: JsonLdProps) {
  const payload = Array.isArray(data) ? data : [data];

  return (
    <>
      {payload.map((schema, index) => (
        <script
          key={id ? `${id}-${index}` : (schema["@type"] as string) ?? index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
