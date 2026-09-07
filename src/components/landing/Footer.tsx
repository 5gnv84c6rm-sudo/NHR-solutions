const columns = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Mobile app", "Integrations", "Changelog"],
  },
  {
    title: "Company",
    links: ["About us", "Blog", "Careers", "Press", "Contact"],
  },
  {
    title: "Legal",
    links: ["Privacy policy", "Terms of service", "GDPR", "Security", "Cookies"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-extrabold text-ink-900">
            <span className="text-lg">
              NHR <span className="text-brand-600">Solution</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink-500">
            HR software that protects your people and your business.
          </p>
          <p className="mt-4 text-sm text-ink-500">nhrsoutionltd@gmail.com</p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold text-ink-900">{col.title}</h4>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-ink-500 transition hover:text-ink-800">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-100 py-6">
        <p className="container-page text-center text-xs text-ink-400">
          © {new Date().getFullYear()} NHR Solution UK Ltd. All rights reserved. Registered in England &amp; Wales. 🇬🇧 Proudly UK-built
        </p>
      </div>
    </footer>
  );
}
