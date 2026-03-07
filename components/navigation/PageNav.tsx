import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

type NavItem = {
  label: string;
  href?: string;
};

export default function PageNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-4 overflow-x-auto">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <div key={`${item.label}-${index}`} className="flex items-center gap-2 shrink-0">
              {index === 0 && item.href ? (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
                >
                  <Home className="h-4 w-4" />
                  {item.label}
                </Link>
              ) : item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-400">
                  {item.label}
                </span>
              )}

              {!isLast ? <ChevronRight className="h-4 w-4 text-zinc-600" /> : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}