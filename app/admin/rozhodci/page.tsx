"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LogOut, Mail, Phone, Search, Shield, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AppRole = "admin" | "referee";

type DbUser = {
  id: string;
  full_name: string | null;
  role: AppRole;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export default function AdminRozhodciPage() {
  const [adminName, setAdminName] = useState("Administrátor");
  const [currentAdminId, setCurrentAdminId] = useState("");
  const [users, setUsers] = useState<DbUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const loadUsers = async () => {
    setMessage("");

    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, role, email, phone, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setUsers([]);
      return;
    }

    setUsers((data ?? []) as DbUser[]);
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error } = await supabase
        .from("users")
        .select("full_name, role")
        .eq("id", session.user.id)
        .single();

      if (error || !profile) {
        window.location.href = "/login";
        return;
      }

      if (profile.role !== "admin") {
        window.location.href = "/zapasy";
        return;
      }

      setAdminName(profile.full_name || session.user.email || "Administrátor");
      setCurrentAdminId(session.user.id);
      await loadUsers();
      setLoading(false);
    };

    init();
  }, []);

  const summary = useMemo(() => {
    return {
      total: users.length,
      referees: users.filter((user) => user.role === "referee").length,
      admins: users.filter((user) => user.role === "admin").length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return users;

    return users.filter((item) => {
      const text = `${item.full_name ?? ""} ${item.email ?? ""} ${item.phone ?? ""} ${item.role}`.toLowerCase();
      return text.includes(value);
    });
  }, [users, search]);

  const handleChangeRole = async (userId: string, nextRole: AppRole) => {
    if (userId === currentAdminId) {
      setMessage("Vlastní roli nelze měnit.");
      return;
    }

    const confirmed = window.confirm(
      nextRole === "admin"
        ? "Opravdu chcete nastavit tohoto uživatele jako administrátora?"
        : "Opravdu chcete nastavit tohoto uživatele jako rozhodčího?"
    );

    if (!confirmed) return;

    setUpdatingRoleId(userId);
    setMessage("");

    const { error } = await supabase.from("users").update({ role: nextRole }).eq("id", userId);

    setUpdatingRoleId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Role byla změněna.");
    await loadUsers();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
          <div>
            <div className="text-lg font-bold text-slate-900">Rozhodčí</div>
            <div className="text-sm text-slate-500">{adminName}</div>
          </div>

          <button type="button" onClick={handleLogout} className="flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <LogOut className="mr-2 h-4 w-4" />
            Odhlásit
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        <div className="mb-4">
          <Link href="/admin" className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět do administrace
          </Link>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
            <div className="text-2xl font-bold text-slate-900">{summary.total}</div>
            <div className="text-xs text-slate-500">Celkem</div>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
            <div className="text-2xl font-bold text-emerald-700">{summary.referees}</div>
            <div className="text-xs text-slate-500">Rozhodčí</div>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
            <div className="text-2xl font-bold text-slate-700">{summary.admins}</div>
            <div className="text-xs text-slate-500">Admin</div>
          </div>
        </div>

        <div className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <label htmlFor="users-search" className="mb-2 block text-sm font-medium text-slate-700">
            Hledat rozhodčího
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="users-search"
              type="text"
              placeholder="Jméno, email, telefon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        {message ? <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</div> : null}

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
              <div className="text-lg font-semibold text-slate-900">Načítání...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
              <div className="text-lg font-semibold text-slate-900">Žádní uživatelé</div>
              <p className="mt-2 text-sm text-slate-500">Pro tento filtr nejsou žádní uživatelé.</p>
            </div>
          ) : (
            filteredUsers.map((item) => (
              <article key={item.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-bold text-slate-900">{item.full_name || "Bez jména"}</div>
                    <div className="text-sm text-slate-500">{item.role === "admin" ? "Administrátor" : "Rozhodčí"}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${item.role === "admin" ? "bg-slate-900 text-white ring-slate-900" : "bg-emerald-100 text-emerald-800 ring-emerald-200"}`}>
                    {item.role === "admin" ? "Admin" : "Rozhodčí"}
                  </span>
                </div>

                <div className="space-y-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <span>{item.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span>{item.phone || "Telefon není zadán"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <span>ID: {item.id.slice(0, 8)}...</span>
                  </div>
                </div>

                {item.id === currentAdminId ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Vlastní roli nelze měnit.</div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" disabled={item.role === "admin" || updatingRoleId === item.id} onClick={() => handleChangeRole(item.id, "admin")} className="flex h-11 items-center justify-center rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
                      {updatingRoleId === item.id ? "Ukládání..." : "Nastavit admin"}
                    </button>
                    <button type="button" disabled={item.role === "referee" || updatingRoleId === item.id} onClick={() => handleChangeRole(item.id, "referee")} className="flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                      {updatingRoleId === item.id ? "Ukládání..." : "Nastavit rozhodčí"}
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2 px-3 py-3 text-center text-xs font-medium text-slate-600">
          <Link href="/admin" className="rounded-xl px-3 py-2 hover:bg-slate-100">Zápasy</Link>
          <Link href="/admin/rozhodci" className="rounded-xl bg-slate-900 px-3 py-2 text-white">Rozhodčí</Link>
          <Link href="/delegace" className="rounded-xl px-3 py-2 hover:bg-slate-100">Delegace</Link>
          <Link href="/profil" className="rounded-xl px-3 py-2 hover:bg-slate-100">Profil</Link>
        </div>
      </nav>
    </main>
  );
}
