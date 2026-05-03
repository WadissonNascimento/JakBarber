import AdminLoginForm from "@/components/AdminLoginForm";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams?: {
    error?: string;
  };
}) {
  const errorMessage = searchParams?.error || null;

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
      <AdminLoginForm errorMessage={errorMessage} />
    </section>
  );
}
