import Link from "next/link";

import { signInAction } from "@/app/actions/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8">
        <div>
          <h1 className="text-2xl font-semibold">Watch</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Platform admin sign-in
          </p>
        </div>

        {params.error ? (
          <p className="rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
            {params.error}
          </p>
        ) : null}

        <form action={signInAction} className="space-y-4">
          <input type="hidden" name="redirect" value={params.redirect || "/"} />
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-black"
          >
            Sign in
          </button>
        </form>

        <p className="text-center text-xs text-[var(--color-muted-foreground)]">
          Use your main ChatIQ platform admin account.{" "}
          <Link href="https://www.chatiq.io/sign-in" className="underline">
            Main app
          </Link>
        </p>
      </div>
    </div>
  );
}
