export function POST(): Response {
  return Response.json(
    { error: "Portalul de facturare este indisponibil." },
    { status: 404 },
  );
}
