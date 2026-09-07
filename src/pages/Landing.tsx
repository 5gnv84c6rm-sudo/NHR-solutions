import { useState } from "react";
import {
  Users,
  CalendarClock,
  Banknote,
  CalendarRange,
  BookUser,
  Plane,
  Check,
  X,
  Minus,
  MapPin,
  BellRing,
  Download,
  Star,
} from "lucide-react";
import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/Footer";
import {
  SignInModal,
  TrialModal,
  DemoModal,
  EnterpriseModal,
} from "../components/AuthModals";

const industries = [
  "Retail",
  "Hospitality",
  "Healthcare",
  "Construction",
  "Education",
  "Logistics",
  "Startups",
];

const modules = [
  {
    icon: BookUser,
    title: "Employee records",
    description: "Cloud storage for contracts and documents, always audit-ready.",
  },
  {
    icon: CalendarClock,
    title: "Attendance & leave",
    description: "Real-time tracking with a self-service portal for your team.",
  },
  {
    icon: Banknote,
    title: "Payroll",
    description: "UK-compliant PAYE, NI and pension calculations built in.",
  },
  {
    icon: CalendarRange,
    title: "Shifts & scheduling",
    description: "Visual rota builder with drag-and-drop functionality.",
  },
  {
    icon: Plane,
    title: "Passport tracking",
    description: "Automated alerts at 90, 60 and 30 days before expiry.",
  },
  {
    icon: Users,
    title: "Visa tracking",
    description: "Skilled Worker, Global Talent and all visa types covered.",
  },
];

const comparisonRows: [string, boolean | "partial", boolean | "partial", boolean | "partial"][] = [
  ["Employee records", true, true, true],
  ["Payroll (PAYE, NI, pension)", true, true, false],
  ["Shift & rota builder", true, true, "partial"],
  ["Passport expiry tracking", true, false, false],
  ["Visa & Skilled Worker tracking", true, false, false],
  ["GPS-verified clock in/out", true, "partial", false],
  ["Right to Work compliance monitoring", true, false, false],
  ["Mobile app included", true, true, "partial"],
  ["Unlimited document storage", true, false, false],
  ["Transparent per-tier pricing", true, false, "partial"],
  ["UK-based support", true, "partial", true],
];

const pricingTiers = [
  {
    name: "Essentials",
    price: "£50",
    cadence: "/month",
    blurb: "Up to 5 employees",
    features: [
      "Employee records",
      "Attendance & leave",
      "Payroll",
      "Shifts & scheduling",
      "Passport & visa tracking",
      "Mobile app",
      "Email support",
    ],
    highlight: false,
  },
  {
    name: "Growth",
    price: "£100",
    cadence: "/month",
    blurb: "Up to 10 employees",
    features: [
      "Everything in Essentials",
      "GPS clock in/out",
      "Unlimited document storage",
      "RTW compliance monitoring",
      "Phone & email support",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    blurb: "10+ employees",
    features: [
      "Unlimited employees",
      "Dedicated account manager",
      "Custom training",
      "API access",
      "SLA guarantee",
    ],
    highlight: false,
  },
];

const testimonials = [
  {
    quote:
      "Visa tracking alone has saved us from at least two compliance breaches this year. We'd have missed both renewal windows without it.",
    name: "HR Manager",
    company: "Staffing agency, West Midlands",
  },
  {
    quote:
      "Payroll used to take me a full day every month. With NHR Solution it's done before lunch, and the NI and pension figures are always right.",
    name: "HR Manager",
    company: "Construction firm, Birmingham",
  },
  {
    quote:
      "The mobile app is what won our site staff over — GPS clock-in means no more arguments about timesheets.",
    name: "HR Manager",
    company: "Facilities contractor, Leicester",
  },
];

function ComparisonCell({ value }: { value: boolean | "partial" }) {
  if (value === true) return <Check className="mx-auto text-accent-600" size={18} />;
  if (value === "partial") return <Minus className="mx-auto text-amber-500" size={18} />;
  return <X className="mx-auto text-ink-300" size={18} />;
}

export function Landing() {
  const [modal, setModal] = useState<"signin" | "trial" | "demo" | "enterprise" | null>(null);

  return (
    <div id="top" className="min-h-screen bg-white">
      <Navbar onSignIn={() => setModal("signin")} onStartTrial={() => setModal("trial")} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="container-page grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              Smarter than BrightHR, fairer pricing
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
              HR software that protects your people and your business
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ink-600">
              Manage employees, payroll, shifts and attendance — with passport &amp; visa
              tracking built in, all in one platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => setModal("trial")}
                className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700"
              >
                Start free trial
              </button>
              <button
                onClick={() => setModal("demo")}
                className="rounded-lg border border-ink-200 bg-white px-6 py-3 font-semibold text-ink-800 transition hover:border-ink-300"
              >
                Book a demo
              </button>
            </div>
            <p className="mt-8 text-sm font-medium text-ink-500">
              Trusted by 2,000+ UK businesses across
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-400">
              {industries.map((ind) => (
                <span key={ind}>{ind}</span>
              ))}
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-2xl shadow-ink-900/10">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <p className="text-sm font-semibold text-ink-800">Team overview</p>
              <span className="text-xs text-ink-400">Saturday, 6 June 2026</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-accent-50 p-3">
                <p className="text-2xl font-bold text-accent-700">41</p>
                <p className="text-xs text-accent-700/80">Present today</p>
              </div>
              <div className="rounded-xl bg-brand-50 p-3">
                <p className="text-2xl font-bold text-brand-700">5</p>
                <p className="text-xs text-brand-700/80">On leave</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3">
                <p className="text-2xl font-bold text-rose-600">3</p>
                <p className="text-xs text-rose-600/80">Expiring documents</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {[
                { name: "Amara Okafor", note: "Visa expires in 29 days", tone: "critical" },
                { name: "Priya Shah", note: "Passport expires in 20 days", tone: "critical" },
                { name: "Tomasz Nowak", note: "Right to work verified", tone: "ok" },
              ].map((row) => (
                <div key={row.name} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
                  <span className="text-sm font-medium text-ink-800">{row.name}</span>
                  <span
                    className={`text-xs font-medium ${
                      row.tone === "critical" ? "text-rose-600" : "text-accent-600"
                    }`}
                  >
                    {row.note}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="features" className="py-20">
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-ink-900">Everything your HR team needs, in one place</h2>
            <p className="mt-3 text-ink-600">
              Six core modules built for UK compliance from the ground up.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <div key={m.title} className="rounded-2xl border border-ink-100 p-6 transition hover:shadow-lg hover:shadow-ink-900/5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <m.icon size={20} />
                </span>
                <h3 className="mt-4 font-semibold text-ink-900">{m.title}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="why-nhr" className="bg-ink-50 py-20">
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-ink-900">Why teams switch to NHR Solution</h2>
            <p className="mt-3 text-ink-600">
              A side-by-side look at what's included compared to BrightHR and Breathe HR.
            </p>
          </div>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-ink-100 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left">
                  <th className="px-5 py-4 font-semibold text-ink-800">Feature</th>
                  <th className="px-5 py-4 text-center font-semibold text-brand-600">NHR Solution</th>
                  <th className="px-5 py-4 text-center font-semibold text-ink-500">BrightHR</th>
                  <th className="px-5 py-4 text-center font-semibold text-ink-500">Breathe HR</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(([feature, nhr, bright, breathe], i) => (
                  <tr key={feature} className={i % 2 === 0 ? "bg-white" : "bg-ink-50/50"}>
                    <td className="px-5 py-3.5 text-ink-700">{feature}</td>
                    <td className="px-5 py-3.5"><ComparisonCell value={nhr} /></td>
                    <td className="px-5 py-3.5"><ComparisonCell value={bright} /></td>
                    <td className="px-5 py-3.5"><ComparisonCell value={breathe} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mobile app */}
      <section id="mobile" className="py-20">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl font-bold text-ink-900">Run HR from your pocket</h2>
            <p className="mt-3 text-ink-600">
              The NHR Solution mobile app keeps your team compliant wherever they clock in.
            </p>
            <ul className="mt-6 space-y-4">
              {[
                { icon: MapPin, text: "GPS-verified clock in/out with location data" },
                { icon: BellRing, text: "Instant compliance alerts sent straight to your phone" },
                { icon: Download, text: "On-demand payslip downloads, anytime" },
              ].map((f) => (
                <li key={f.text} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                    <f.icon size={16} />
                  </span>
                  <span className="text-ink-700">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 mx-auto w-full max-w-xs rounded-[2rem] border border-ink-200 bg-ink-950 p-3 shadow-2xl lg:order-2">
            <div className="rounded-[1.5rem] bg-white p-4">
              <p className="text-xs text-ink-400">Saturday, 6 June 2026</p>
              <p className="mt-1 text-lg font-bold text-ink-900">Good morning, Grace</p>
              <button className="mt-4 w-full rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white">
                Clock in
              </button>
              <div className="mt-4 space-y-2">
                <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                  ⚠ Priya Shah — passport expires in 20 days
                </div>
                <div className="rounded-xl bg-ink-50 p-3 text-xs text-ink-600">
                  Payslip for August is ready to download
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-ink-50 py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-ink-900">Simple, fair pricing</h2>
            <p className="mt-3 text-ink-600">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-8 ${
                  tier.highlight
                    ? "border-brand-600 bg-white shadow-xl shadow-brand-600/10"
                    : "border-ink-100 bg-white"
                }`}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-8 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <h3 className="font-semibold text-ink-900">{tier.name}</h3>
                <p className="mt-1 text-sm text-ink-500">{tier.blurb}</p>
                <p className="mt-4">
                  <span className="text-4xl font-extrabold text-ink-900">{tier.price}</span>
                  <span className="text-ink-500">{tier.cadence}</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink-600">
                      <Check size={16} className="mt-0.5 shrink-0 text-accent-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setModal(tier.name === "Enterprise" ? "enterprise" : "trial")}
                  className={`mt-8 w-full rounded-lg px-4 py-2.5 font-semibold transition ${
                    tier.highlight
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "border border-ink-200 text-ink-800 hover:border-ink-300"
                  }`}
                >
                  {tier.name === "Enterprise" ? "Contact sales" : "Start free trial"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container-page">
          <h2 className="text-center text-3xl font-bold text-ink-900">Loved by HR teams across the UK</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name + t.company} className="rounded-2xl border border-ink-100 p-6">
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
                <p className="mt-4 text-sm text-ink-600">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-ink-900">{t.name}</p>
                <p className="text-xs text-ink-500">{t.company}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600">
        <div className="container-page flex flex-col items-center gap-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to protect your people and your business?</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setModal("trial")}
              className="rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              Start free trial
            </button>
            <button
              onClick={() => setModal("demo")}
              className="rounded-lg border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Book a demo
            </button>
          </div>
        </div>
      </section>

      <Footer />

      <SignInModal open={modal === "signin"} onClose={() => setModal(null)} onSwitchToTrial={() => setModal("trial")} />
      <TrialModal open={modal === "trial"} onClose={() => setModal(null)} onSwitchToSignIn={() => setModal("signin")} />
      <DemoModal open={modal === "demo"} onClose={() => setModal(null)} />
      <EnterpriseModal open={modal === "enterprise"} onClose={() => setModal(null)} />
    </div>
  );
}
