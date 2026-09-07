import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { AppUser } from "../types";

interface StoredAccount extends AppUser {
  password: string;
}

const ACCOUNTS_KEY = "nhr_accounts";
const SESSION_KEY = "nhr_session";

function readAccounts(): StoredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (details: {
    fullName: string;
    email: string;
    companyName: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        const sUser = data.session?.user;
        if (sUser) {
          setUser({
            email: sUser.email ?? "",
            fullName: (sUser.user_metadata?.full_name as string) ?? "",
            companyName: (sUser.user_metadata?.company_name as string) ?? "",
          });
        }
        setLoading(false);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        const sUser = session?.user;
        setUser(
          sUser
            ? {
                email: sUser.email ?? "",
                fullName: (sUser.user_metadata?.full_name as string) ?? "",
                companyName: (sUser.user_metadata?.company_name as string) ?? "",
              }
            : null,
        );
      });
      return () => sub.subscription.unsubscribe();
    }

    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        // ignore corrupt session
      }
    }
    setLoading(false);
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return;
    }
    const accounts = readAccounts();
    const account = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (!account || account.password !== password) {
      throw new Error("Incorrect email or password.");
    }
    const { password: _pw, ...profile } = account;
    setUser(profile);
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
  };

  const signUp: AuthContextValue["signUp"] = async ({
    fullName,
    email,
    companyName,
    password,
  }) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, company_name: companyName } },
      });
      if (error) throw error;
      return;
    }
    const accounts = readAccounts();
    if (accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists.");
    }
    const account: StoredAccount = { fullName, email, companyName, password };
    accounts.push(account);
    writeAccounts(accounts);
    const { password: _pw, ...profile } = account;
    setUser(profile);
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      return;
    }
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
