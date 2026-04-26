"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Save, Search, ShieldCheck, UserCog, Users } from "lucide-react";
import {
  getOrganizations,
  getSessionProfile,
  type AppOrganization,
  type AppRole,
  type RegistrationStatus,
} from "@/lib/auth-profile";
import { supabase } from "@/lib/supabase";

type ManagedUser = {
  id: string;
  full_name: string | null;
  role: AppRole;
  email: string | null;
  phone: string | null;
  organization_id: number | null;
  facr_id: string | null;
  registration_status: RegistrationStatus;
  organizations?: AppOrganization | null;
};

type EditableState = Record<
  string,
  {
    organization_id: string;
    facr_id: string;
    role: AppRole;
    registration_status: RegistrationStatus;
  }
>;

function roleLabel(role: AppRole) {
  if (role === "superadmin") return "Superadmin";
  if (role === "admin") return "Administrátor";
  return "Rozhodčí";
}

function statusLabel(status: RegistrationStatus) {
  if (status === "approved") return "Schváleno";
  if (status === "rejected") return "Odmítnuto";
  return "Čeká";
}

export default function SuperadminPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [organizations, setOrganizations] = useState<AppOrganization[]>([]);
  const [editable, setEditable] = useState<EditableState>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error" | "success">("info");

  const loadData = async () => {
    setMessage("");

    const [{ session, profile }, orgs] = await Promise.all([
      getSessionProfile({ createIfMissing: false }),
      getOrganizations(),
    ]);

    if (!session?.user || !profile) {
      window.location.href = "/login";
      return;
    }

    if (profile.role !== "superadmin") {
      window.location.href = profile.role === "admin" ? "/admin" : "/zapasy";
      return;
    }

    setOrganizations(orgs);

    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, role, email, phone, organization_id, facr_id, registration_status, organizations(id, name, slug)")
      .order("role", { ascending: true })
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);

    const loadedUsers = (data ?? []) as unknown as ManagedUser[];
    setUsers(loadedUsers);

    const nextEditable: EditableState = {};
    for (const user of loadedUsers) {
      nextEditable[user.id] = {
        organization_id: user.organization_id ? String(user.organization_id) : "",
        facr_id: user.facr_id ?? "",
        role: user.role,
        registration_status: user.registration_status,
      };
    }
    setEditable(nextEditable);
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        setMessageType("error");
        setMessage(err instanceof Error ? err.message : "Nepodařilo se načíst superadmin panel.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const summary = useMemo(
    () => ({
      total: users.length,
      superadmins: users.filter((user) => user.role === "superadmin").length,
      admins: users.filter((user) => user.role === "admin").length,
      referees: users.filter((user) => user.role === "referee").length,
    }),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) => {
      const text = `${user.full_name ?? ""} ${user.email ?? ""} ${user.facr_id ?? ""} ${user.role} ${user.registration_status} ${user.organizations?.name ?? ""}`.toLowerCase();
      return text.includes(value);
    });
  }, [search, users]);

  const updateEditable = (userId: string, patch: Partial<EditableState[string]>) => {
    setEditable((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        ...patch,
      },
    }));
  };

  const saveUser = async (user: ManagedUser) => {
    const row = editable[user.id];
    if (!row) return;

    const organizationId = row.organization_id ? Number(row.organization_id) : null;
    const cleanFacrId = row.facr_id.trim() || null;

    setSavingId(user.id);
    setMessage("");

    const { error } = await supabase
      .from("users")
      .update({
        organization_id: organizationId,
        facr_id: cleanFacrId,
        role: row.role,
        registration_status: row.registration_status,
      })
      .eq("id", user.id);

    setSavingId(null);

    if (error) {
      setMessageType("error");
      setMessage(error.message);
      return;
    }

    setMessageType("success");
    setMessage("Uživatel byl upraven.");
    await loadData();
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
            <div className="text-lg font-bold text-slate-900">Superadmin</div>
            <div className="text-sm text-slate-500">Správa administrátorů a podsavezů</div>
          </div>
          <button type="button" onClick={handleLogout} className="flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <LogOut className="mr-2 h-4 w-4" /> Odhlásit
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        <section className="mb-4 rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Centrální správa</h1>
              <p className="text-sm text-slate-300">Superadmin upravuje podsavez, roli, stav registrace a FAČR ID.</p>
            </div>
          </div>
        </section>

        <div className="mb-4 grid grid-cols-4 gap-2">
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200"><div className="text-xl font-bold text-slate-900">{summary.total}</div><div className="text-[11px] text-slate-500">Celkem</div></div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200"><div className="text-xl font-bold text-violet-700">{summary.superadmins}</div><div className="text-[11px] text-slate-500">Super</div></div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200"><div className="text-xl font-bold text-slate-700">{summary.admins}</div><div className="text-[11px] text-slate-500">Admin</div></div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200"><div className="text-xl font-bold text-emerald-700">{summary.referees}</div><div className="text-[11px] text-slate-500">Rozhodčí</div></div>
        </div>

        <div className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <label htmlFor="superadmin-search" className="mb-2 block text-sm font-medium text-slate-700">Hledat uživatele</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="superadmin-search" type="text" placeholder="Jméno, email, FAČR ID, podsavez..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
          </div>
        </div>

        {message ? (
          <div className={`mb-4 rounded-2xl px-4 py-3 text-sm ring-1 ${messageType === "error" ? "bg-rose-50 text-rose-800 ring-rose-200" : messageType === "success" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-slate-50 text-slate-700 ring-slate-200"}`}>
            {message}
          </div>
        ) : null}

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200"><div className="text-lg font-semibold text-slate-900">Načítání...</div></div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200"><div className="text-lg font-semibold text-slate-900">Žádní uživatelé</div></div>
          ) : (
            filteredUsers.map((user) => {
              const row = editable[user.id];
              return (
                <article key={user.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      {user.role === "admin" || user.role === "superadmin" ? <UserCog className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-bold text-slate-900">{user.full_name || "Bez jména"}</div>
                      <div className="truncate text-sm text-slate-500">{user.email || "Bez emailu"}</div>
                      <div className="mt-1 text-xs text-slate-400">Aktuálně: {roleLabel(user.role)} • {user.organizations?.name || "Bez podsavezu"}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Role</label>
                      <select value={row?.role ?? user.role} onChange={(event) => updateEditable(user.id, { role: event.target.value as AppRole })} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200">
                        <option value="superadmin">Superadmin</option>
                        <option value="admin">Administrátor</option>
                        <option value="referee">Rozhodčí</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Podsavez</label>
                      <select value={row?.organization_id ?? ""} onChange={(event) => updateEditable(user.id, { organization_id: event.target.value })} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200">
                        <option value="">Bez podsavezu</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">FAČR ID</label>
                      <input value={row?.facr_id ?? ""} onChange={(event) => updateEditable(user.id, { facr_id: event.target.value })} placeholder="např. 12345678" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Stav registrace</label>
                      <select value={row?.registration_status ?? user.registration_status} onChange={(event) => updateEditable(user.id, { registration_status: event.target.value as RegistrationStatus })} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200">
                        <option value="pending">{statusLabel("pending")}</option>
                        <option value="approved">{statusLabel("approved")}</option>
                        <option value="rejected">{statusLabel("rejected")}</option>
                      </select>
                    </div>

                    <button type="button" onClick={() => saveUser(user)} disabled={savingId === user.id} className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                      <Save className="mr-2 h-4 w-4" /> {savingId === user.id ? "Ukládání..." : "Uložit změny"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2 px-3 py-3 text-center text-xs font-medium text-slate-600">
          <Link href="/superadmin" className="rounded-xl bg-slate-900 px-3 py-2 text-white">Uživatelé</Link>
          <Link href="/admin" className="rounded-xl px-3 py-2 hover:bg-slate-100">Admin</Link>
          <Link href="/demo" className="rounded-xl px-3 py-2 hover:bg-slate-100">Demo</Link>
        </div>
      </nav>
    </main>
  );
}
