"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, Mail, Phone, Save, Shield, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AppRole = "admin" | "referee";

type Profile = {
  id: string;
  full_name: string | null;
  role: AppRole;
  email: string | null;
  phone: string | null;
};

export default function ProfilPage() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadProfile = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, role, email, phone")
      .eq("id", session.user.id)
      .single();

    if (error || !data) {
      window.location.href = "/login";
      return;
    }

    const loaded = data as Profile;
    setProfile(loaded);
    setRole(loaded.role);
    setFullName(loaded.full_name || "");
    setPhone(loaded.phone || "");
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("users")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Profil byl uložen.");
    await loadProfile();
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
            <div className="text-lg font-bold text-slate-900">Profil</div>
            <div className="text-sm text-slate-500">{role === "admin" ? "Administrátor" : "Rozhodčí"}</div>
          </div>
          <button type="button" onClick={handleLogout} className="flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <LogOut className="mr-2 h-4 w-4" />
            Odhlásit
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white"><User className="h-8 w-8" /></div>
            <div>
              <div className="text-xl font-bold text-slate-900">{profile?.full_name || "Uživatel"}</div>
              <div className="text-sm text-slate-500">{role === "admin" ? "Administrátor systému" : "Fotbalový rozhodčí"}</div>
            </div>
          </div>

          <div className="mb-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <div className="flex items-center gap-3"><Shield className="h-4 w-4 text-slate-500" /><span>Role: {role === "admin" ? "Administrátor" : "Rozhodčí"}</span></div>
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-slate-500" /><span>{profile?.email || "—"}</span></div>
            <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-slate-500" /><span>{profile?.phone || "Telefon není zadán"}</span></div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Jméno a příjmení</label>
              <input type="text" value={fullName} onChange={(e) => { setMessage(""); setFullName(e.target.value); }} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200" placeholder="např. Jan Novák" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Telefon</label>
              <input type="tel" value={phone} onChange={(e) => { setMessage(""); setPhone(e.target.value); }} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200" placeholder="+420 123 456 789" />
            </div>
            {message ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</div> : null}
            <button type="button" onClick={handleSave} disabled={saving || !fullName.trim()} className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Ukládání..." : "Uložit profil"}
            </button>
          </div>
        </section>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2 px-3 py-3 text-center text-xs font-medium text-slate-600">
          <Link href={role === "admin" ? "/admin" : "/zapasy"} className="rounded-xl px-3 py-2 hover:bg-slate-100">Zápasy</Link>
          <Link href={role === "admin" ? "/admin/rozhodci" : "/prihlasky"} className="rounded-xl px-3 py-2 hover:bg-slate-100">{role === "admin" ? "Rozhodčí" : "Přihlášky"}</Link>
          <Link href="/delegace" className="rounded-xl px-3 py-2 hover:bg-slate-100">Delegace</Link>
          <Link href="/profil" className="rounded-xl bg-slate-900 px-3 py-2 text-white">Profil</Link>
        </div>
      </nav>
    </main>
  );
}
