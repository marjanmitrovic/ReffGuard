"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Lock, Save, ShieldCheck } from "lucide-react";
import {
  getOrganizations,
  getSessionProfile,
  type AppOrganization,
  type AppProfile,
} from "@/lib/auth-profile";
import { supabase } from "@/lib/supabase";

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [organizations, setOrganizations] = useState<AppOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [facrId, setFacrId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error" | "success">("info");

  const organizationLocked = Boolean(profile?.organization_id);

  const selectedOrganization = useMemo(() => {
    const id = Number(organizationId);
    return organizations.find((item) => item.id === id) ?? null;
  }, [organizationId, organizations]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setMessage("");

        const [{ session, profile }, orgs] = await Promise.all([
          getSessionProfile({ createIfMissing: false }),
          getOrganizations(),
        ]);

        if (!session?.user || !profile) {
          window.location.href = "/login";
          return;
        }

        if (profile.role !== "admin") {
          window.location.href = "/zapasy";
          return;
        }

        setProfile(profile);
        setOrganizations(orgs);
        setOrganizationId(profile.organization_id ? String(profile.organization_id) : "");
        setFacrId(profile.facr_id ?? "");
      } catch (err) {
        setMessageType("error");
        setMessage(err instanceof Error ? err.message : "Nepodařilo se načíst nastavení.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const saveSettings = async () => {
    if (!profile) return;

    const cleanFacrId = facrId.trim();
    const nextOrganizationId = Number(organizationId);

    setMessage("");
    setMessageType("info");

    if (!cleanFacrId) {
      setMessageType("error");
      setMessage("Zadejte FAČR ID administrátora.");
      return;
    }

    if (!organizationLocked && !nextOrganizationId) {
      setMessageType("error");
      setMessage("Vyberte podsavez.");
      return;
    }

    setSaving(true);

    try {
      const updatePayload: { facr_id: string; organization_id?: number } = {
        facr_id: cleanFacrId,
      };

      if (!organizationLocked) {
        updatePayload.organization_id = nextOrganizationId;
      }

      let query = supabase.from("users").update(updatePayload).eq("id", profile.id).eq("role", "admin");

      if (!organizationLocked) {
        query = query.is("organization_id", null);
      } else {
        query = query.eq("organization_id", profile.organization_id);
      }

      const { data, error } = await query
        .select("id, full_name, role, email, phone, organization_id, facr_id, registration_status, organizations(id, name, slug)")
        .maybeSingle();

      if (error) {
        setMessageType("error");
        setMessage(error.message);
        return;
      }

      if (!data) {
        setMessageType("error");
        setMessage("Podsavez je již nastaven a uzamčen. Změnu může provést pouze superadmin.");
        return;
      }

      setProfile(data as unknown as AppProfile);
      setOrganizationId(data.organization_id ? String(data.organization_id) : "");
      setFacrId(data.facr_id ?? "");
      setMessageType("success");
      setMessage("Nastavení bylo uloženo.");
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Nepodařilo se uložit nastavení.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-24">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
          <div>
            <div className="text-lg font-bold text-slate-900">Nastavení admina</div>
            <div className="text-sm text-slate-500">Podsavez a FAČR ID</div>
          </div>

          <Link
            href="/admin"
            className="flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Zpět
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        {loading ? (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <div className="text-lg font-semibold text-slate-900">Načítání...</div>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Profil administrátora</h1>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Administrátor může podsavez vybrat pouze při prvním nastavení. Po uložení zůstane podsavez uzamčený.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="organization" className="mb-1 block text-sm font-medium text-slate-700">
                    Podsavez
                  </label>
                  <select
                    id="organization"
                    value={organizationId}
                    onChange={(event) => setOrganizationId(event.target.value)}
                    disabled={organizationLocked || saving}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">Vyberte podsavez</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>

                  {organizationLocked ? (
                    <div className="mt-2 flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                      <span>
                        Podsavez je uzamčený: {selectedOrganization?.name || profile?.organizations?.name || "nastaveno"}. Změnu může provést pouze superadmin.
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Toto je první nastavení. Po uložení bude výběr podsavezu uzamčený.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="facrId" className="mb-1 block text-sm font-medium text-slate-700">
                    FAČR ID administrátora
                  </label>
                  <input
                    id="facrId"
                    type="text"
                    value={facrId}
                    onChange={(event) => setFacrId(event.target.value)}
                    placeholder="např. 12345678"
                    disabled={saving}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    FAČR ID lze opravit, pokud bylo zadáno nesprávně.
                  </p>
                </div>

                {message ? (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ring-1 ${
                      messageType === "error"
                        ? "bg-rose-50 text-rose-800 ring-rose-200"
                        : messageType === "success"
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                          : "bg-slate-50 text-slate-700 ring-slate-200"
                    }`}
                  >
                    {message}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Ukládání..." : "Uložit nastavení"}
                </button>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-base font-bold text-slate-900">Produkční pravidlo</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Administrátor nemůže sám změnit podsavez, pokud už je nastavený. Tím se zabrání promíchání zápasů, rozhodčích a delegací mezi různými podsavezy.
              </p>
            </section>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2 px-3 py-3 text-center text-xs font-medium text-slate-600">
          <Link href="/admin" className="rounded-xl px-3 py-2 hover:bg-slate-100">Admin</Link>
          <Link href="/admin" className="rounded-xl px-3 py-2 hover:bg-slate-100">Zápasy</Link>
          <Link href="/delegace" className="rounded-xl px-3 py-2 hover:bg-slate-100">Delegace</Link>
          <Link href="/admin/settings" className="rounded-xl bg-slate-900 px-3 py-2 text-white">Profil</Link>
        </div>
      </nav>
    </main>
  );
}
