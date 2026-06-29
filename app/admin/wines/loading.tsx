export default function AdminWinesLoading() {
  return (
    <main className="mx-auto max-w-7xl animate-pulse px-6 py-10">
      <div className="h-10 w-64 rounded-lg bg-secondary" />
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-2xl bg-secondary" />
        ))}
      </div>
      <div className="mt-8 h-96 rounded-2xl bg-secondary" />
    </main>
  );
}
