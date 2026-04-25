"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup";
type AppRole = "admin" | "referee";

function fallbackName(email: string) {
  return email.split("@")[0] || "Uživatel";
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const ensureProfileAfterLogin = async (user: {
    id: string;
    email?: string | null;
    user_metadata?: { full_name?: string };
  }) => {
    const { data: existingProfile, error: existingError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingProfile) {
      return existingProfile as { id: string; role: AppRole };
    }

    const name =
      user.user_metadata?.full_name?.trim() ||
      fallbackName(user.email || "uzivatel");

    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      full_name: name,
      role: "referee",
      email: user.email || null,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    const { data: createdProfile, error: createdProfileError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (createdProfileError || !createdProfile) {
      throw new Error("Profil uživatele nebyl nalezen.");
    }

    return createdProfile as { id: string; role: AppRole };
  };

  const handleLogin = async () => {
    setLoading(true);
    setMessage("");

    try {
      const email = identifier.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.user) {
        setMessage("Přihlášení se nezdařilo.");
        return;
      }

      const profile = await ensureProfileAfterLogin({
        id: data.user.id,
        email: data.user.email,
        user_metadata: {
          full_name: data.user.user_metadata?.full_name,
        },
      });

      if (profile.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/zapasy");
      }

      router.refresh();
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

      if (!name) {
        setMessage("Zadejte jméno a příjmení.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session?.user) {
        await ensureProfileAfterLogin({
          id: data.session.user.id,
          email: data.session.user.email,
          user_metadata: {
            full_name: name,
          },
        });

        router.push("/zapasy");
        router.refresh();
        return;
      }

      setMessage(
        "Registrace proběhla úspěšně. Pokud je zapnuté potvrzení emailu, nejprve potvrďte svou adresu."
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

    if (mode === "login") {
      await handleLogin();
    } else {
      await handleSignup();
    }
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
              <h1 className="text-2xl font-bold tracking-tight">
                Delegace rozhodčích
              </h1>
              <p className="text-sm text-slate-500">
                Přihlášení a registrace přes Supabase
              </p>
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
                mode === "login"
                  ? "bg-slate-900 text-white"
                  : "bg-transparent text-slate-700 hover:bg-slate-200"
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
                mode === "signup"
                  ? "bg-slate-900 text-white"
                  : "bg-transparent text-slate-700 hover:bg-slate-200"
              }`}
            >
              Registrace
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" ? (
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
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
            ) : null}

            <div>
              <label
                htmlFor="identifier"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
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
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
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