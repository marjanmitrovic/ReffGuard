"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { getOrganizations, getSessionProfile, type AppOrganization } from "@/lib/auth-profile";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [facrId, setFacrId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [organizations, setOrganizations] = useState<AppOrganization[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await getOrganizations();
        setOrganizations(rows);
        if (!organizationId && rows.length > 0) {
          setOrganizationId(String(rows[0].id));
        }
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Nepodařilo se načíst podsavezy.");
      }
    };

    load();
  }, [organizationId]);

  const goByProfile = async () => {
    const { profile } = await getSessionProfile({ createIfMissing: true });

    if (!profile) {
      setMessage("Profil uživatele nebyl vytvořen. Zaregistrujte se znovu s FAČR ID a podsavezem.");
      return;
    }

    if (profile.role === "superadmin") {
      router.push("/superadmin");
      router.refresh();
      return;
    }

    if (profile.role === "admin") {
      router.push("/admin");
      router.refresh();
      return;
    }

    if (profile.registration_status === "pending") {
      setMessage("Registrace byla přijata. Čeká na schválení administrátorem podsavezu.");
      return;
    }

    if (profile.registration_status === "rejected") {
      setMessage("Registrace byla odmítnuta. Kontaktujte administrátora podsavezu.");
      return;
    }

    router.push("/zapasy");
    router.refresh();
  };

  const handleLogin = async () => {
    setLoading(true);
    setMessage("");

    try {
      const email = identifier.trim().toLowerCase();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      await goByProfile();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Neočekávaná chyba.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setMessage("");

    try {
      const name = fullName.trim();
      const email = identifier.trim().toLowerCase();
      const cleanFacrId = facrId.trim();
      const orgId = Number(organizationId);

      if (!name) {
        setMessage("Zadejte jméno a příjmení.");
        return;
      }

      if (!cleanFacrId) {
        setMessage("Zadejte FAČR ID rozhodčího.");
        return;
      }

      if (!orgId) {
        setMessage("Vyberte podsavez.");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            facr_id: cleanFacrId,
            organization_id: orgId,
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/login`,
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "Registrace proběhla. Po potvrzení emailu musí administrátor podsavezu schválit váš profil."
      );
      setMode("login");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Neočekávaná chyba.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") await handleLogin();
    else await handleSignup();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-slate-200 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 shadow-sm ring-1 ring-slate-200">
              <img src="/reffguard-icon.png" alt="ReffGuard" className="h-full w-full object-cover" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">Delegace rozhodčích</h1>
              <p className="text-sm text-slate-500">Přihlášení a registrace přes FAČR ID</p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setMode("login");
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === "login" ? "bg-slate-900 text-white" : "bg-transparent text-slate-700 hover:bg-slate-200"
              }`}
            >
              Přihlášení
            </button>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setMode("signup");
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === "signup" ? "bg-slate-900 text-white" : "bg-transparent text-slate-700 hover:bg-slate-200"
              }`}
            >
              Registrace
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" ? (
              <>
                <div>
                  <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
                    Jméno a příjmení
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="např. Jan Novák"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label htmlFor="facrId" className="mb-1 block text-sm font-medium text-slate-700">
                    FAČR ID rozhodčího
                  </label>
                  <input
                    id="facrId"
                    type="text"
                    placeholder="např. 12345678"
                    value={facrId}
                    onChange={(e) => setFacrId(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label htmlFor="organization" className="mb-1 block text-sm font-medium text-slate-700">
                    Podsavez
                  </label>
                  <select
                    id="organization"
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            <div>
              <label htmlFor="identifier" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="identifier"
                type="email"
                placeholder="např. jan@demo.cz"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Heslo
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            {message ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mode === "login" ? (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  {loading ? "Přihlašování..." : "Přihlásit se"}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {loading ? "Registrace..." : "Vytvořit účet"}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
