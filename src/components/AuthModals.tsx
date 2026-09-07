import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "./Modal";
import { FormField } from "./FormField";
import { useAuth } from "../lib/auth";

function saveLead(kind: string, data: Record<string, string>) {
  try {
    const key = "nhr_leads";
    const leads = JSON.parse(localStorage.getItem(key) ?? "[]");
    leads.push({ kind, ...data, submittedAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(leads));
  } catch {
    // best effort only
  }
}

export function SignInModal({
  open,
  onClose,
  onSwitchToTrial,
}: {
  open: boolean;
  onClose: () => void;
  onSwitchToTrial: () => void;
}) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      onClose();
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Sign in to NHR Solution" subtitle="Welcome back — pick up where you left off.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField id="signin-email" label="Work email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.co.uk" />
        <FormField id="signin-password" label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-sm text-ink-500">
          No account yet?{" "}
          <button type="button" onClick={onSwitchToTrial} className="font-medium text-brand-600 hover:underline">
            Start your free trial
          </button>
        </p>
      </form>
    </Modal>
  );
}

export function TrialModal({
  open,
  onClose,
  onSwitchToSignIn,
}: {
  open: boolean;
  onClose: () => void;
  onSwitchToSignIn: () => void;
}) {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signUp({ fullName, email, companyName, password });
      saveLead("trial", { fullName, email, companyName, employeeCount, phone });
      onClose();
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Start your free 30-day trial" subtitle="No card required. Set up your workspace in minutes.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField id="trial-name" label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jordan Smith" />
        <FormField id="trial-email" label="Work email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.co.uk" />
        <FormField id="trial-company" label="Company name" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Retail Ltd" />
        <div className="grid grid-cols-2 gap-3">
          <FormField id="trial-count" label="Employees" type="number" min={1} value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} placeholder="12" />
          <FormField id="trial-phone" label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07…" />
        </div>
        <FormField id="trial-password" label="Create a password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent-600 px-4 py-2.5 font-medium text-white transition hover:bg-accent-700 disabled:opacity-60"
        >
          {submitting ? "Creating your workspace…" : "Start free trial"}
        </button>
        <p className="text-center text-sm text-ink-500">
          Already have an account?{" "}
          <button type="button" onClick={onSwitchToSignIn} className="font-medium text-brand-600 hover:underline">
            Sign in
          </button>
        </p>
      </form>
    </Modal>
  );
}

export function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveLead("demo", { fullName, email, companyName });
    setSubmitted(true);
  };

  return (
    <Modal open={open} onClose={onClose} title="Book a demo" subtitle="See NHR Solution walked through by our team.">
      {submitted ? (
        <p className="rounded-lg bg-accent-50 p-4 text-sm text-accent-800">
          Thanks, {fullName.split(" ")[0] || "there"} — we'll be in touch at {email} to find a time.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField id="demo-name" label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <FormField id="demo-email" label="Work email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <FormField id="demo-company" label="Company name" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700">
            Request demo
          </button>
        </form>
      )}
    </Modal>
  );
}

export function EnterpriseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveLead("enterprise", { fullName, email, companyName, employeeCount });
    setSubmitted(true);
  };

  return (
    <Modal open={open} onClose={onClose} title="Talk to sales" subtitle="Custom pricing for 10+ employees, with a dedicated account manager.">
      {submitted ? (
        <p className="rounded-lg bg-accent-50 p-4 text-sm text-accent-800">
          Thanks — our enterprise team will reach out to {email} shortly.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField id="ent-name" label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <FormField id="ent-email" label="Work email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <FormField id="ent-company" label="Company name" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <FormField id="ent-count" label="Approximate employees" type="number" min={10} value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} />
          <button type="submit" className="w-full rounded-lg bg-ink-900 px-4 py-2.5 font-medium text-white transition hover:bg-ink-800">
            Contact sales
          </button>
        </form>
      )}
    </Modal>
  );
}
