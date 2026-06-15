import Link from "next/link";

export default function NotAuthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Not authorized</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Watch is limited to platform administrators.
        </p>
        <Link
          href="/sign-in"
          className="inline-block rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-black"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
