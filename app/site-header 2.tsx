import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

/**
 * One header, used the same way on every page, so people learn it once.
 * The current page is marked, so you always know where you are.
 */
export default function SiteHeader({ current }: { current: "search" | "saved" }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-5 py-4">
        <Link
          href="/"
          className="font-serif text-xl tracking-tight text-ink rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Advisor Scout
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main">
          <HeaderLink href="/" active={current === "search"}>
            Search
          </HeaderLink>
          <HeaderLink href="/saved" active={current === "saved"}>
            Saved
          </HeaderLink>
          <span className="ml-2 flex items-center">
            <UserButton />
          </span>
        </nav>
      </div>
    </header>
  );
}

function HeaderLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`motion rounded-full px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
