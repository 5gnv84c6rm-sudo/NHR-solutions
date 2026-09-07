import { useState } from "react";
import { Menu, X, ShieldCheck } from "lucide-react";

interface NavbarProps {
  onSignIn: () => void;
  onStartTrial: () => void;
}

const links = [
  { label: "Features", href: "#features" },
  { label: "Why NHR", href: "#why-nhr" },
  { label: "Pricing", href: "#pricing" },
  { label: "Mobile app", href: "#mobile" },
];

export function Navbar({ onSignIn, onStartTrial }: NavbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <a href="#top" className="flex items-center gap-2 font-extrabold text-ink-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ShieldCheck size={18} />
          </span>
          <span className="text-lg">
            NHR <span className="text-brand-600">Solution</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-ink-600 transition hover:text-ink-900">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button onClick={onSignIn} className="text-sm font-medium text-ink-700 hover:text-ink-900">
            Sign in
          </button>
          <button
            onClick={onStartTrial}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Start free trial
          </button>
        </div>

        <button className="p-2 text-ink-700 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-1 text-sm font-medium text-ink-700">
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <button onClick={onSignIn} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700">
                Sign in
              </button>
              <button onClick={onStartTrial} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                Start free trial
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
