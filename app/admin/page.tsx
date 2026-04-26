"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, LogOut, MapPin, Plus, Search, Settings, Users } from "lucide-react";
import { getSessionProfile, type AppProfile } from "@/lib/auth-profile";
import { formatDate, formatTime } from "@/lib/date";
import { supabase } from "@/lib/supabase";

type MatchStatus = "open" | "full" | "confirmed";
type ApplicationStatus = "sent" | "approved" | "rejected";
type MatchFilter = "all" | MatchStatus;

type DbMatch = {
  id: number;
  match_date: string;
  match_time: string;
  competition: string;
  home_team: string;
  away_team: string;
  location: string;
  needed_refs: number;
  status: MatchStatus;
  organization_id: number;
};

type DbApplication = { match_id: number; status: ApplicationStatus };
type MatchCount = { active: number; approved: number };

function getStatusLabel(status: MatchStatus) {
  if (status === "open") return "Otevřeno";
  if (status === "full") return "Obsazeno";
  return "Potvrzeno";
}

function getStatusClasses(status: MatchStatus) {
  if (status === "open") return "bg-amber-100 text-amber-800 ring-amber-200";
  if (status === "full") return "bg-slate-200 text-slate-700 ring-slate-300";
  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
}

export default function AdminPage() {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [counts, setCounts] = useState<Record<number, MatchCount>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [search, setSearch] = useState("");

  const loadMatches = async (organizationId: number) => {
    setMessage("");

    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .eq("organization_id", organizationId)
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (matchesError) {
      setMessage(matchesError.message);
      setMatches([]);
      setCounts({});
      return;
    }

    const loadedMatches = (matchesData ?? []) as DbMatch[];
    setMatches(loadedMatches);

    const matchIds = loadedMatches.map((item) => item.id);
    if (matchIds.length === 0) {
      setCounts({});
      return;
    }

    const { data: appsData, error: appsError } = await supabase
      .from("applications")
      .select("match_id, status")
      .in("match_id", matchIds);

    if (appsError) {
      setMessage(appsError.message);
      setCounts({});
      return;
    }

    const apps = (appsData ?? []) as DbApplication[];
    const nextCounts: Record<number, MatchCount> = {};

    for (const match of loadedMatches) {
      const matchApps = apps.filter((app) => app.match_id === match.id);
      nextCounts[match.id] = {
        active: matchApps.filter((app) => app.status !== "rejected").length,
        approved: matchApps.filter((app) => app.status === "approved").length,
      };
    }

    setCounts(nextCounts);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { session, profile } = await getSessionProfile();
        if (!session?.user || !profile) {
          window.location.href = "/login";
          return;
        }

        if (profile.role === "superadmin") {
          window.location.href = "/superadmin";
          return;
        }

        if (profile.role !== "admin") {
          window.location.href = "/zapasy";
          return;
        }

        if (!profile.organization_id) {
          window.location.href = "/admin/settings";
          return;
        }

        setProfile(profile);
        await loadMatches(profile.organization_id);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Nepodařilo se načíst administraci.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const summary = useMemo(
    () => ({
      total: matches.length,
      open: matches.filter((item) => item.status === "open").length,
      confirmed: matches.filter((item) => item.status === "confirmed").length,
    }),
    [matches]
  );

  const filteredMatches = useMemo(() => {
    const value = search.trim().toLowerCase();
    return matches.filter((item) => {
      const statusOk = filter === "all" || item.status === filter;
      const text = `${item.home_team} ${item.away_team} ${item.competition} ${item.location} ${item.match_date}`.toLowerCase();
      return statusOk && (!value || text.includes(value));
    });
  }, [matches, filter, search]);

  const handleDelete = async (id: number) => {
    if (!profile?.organization_id) return;
    const confirmed = window.confirm("Opravdu chcete tento zápas smazat?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organization_id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadMatches(profile.organization_id);
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
            <div className="text-lg font-bold text-slate-900">Administrace</div>
            <div className="text-sm text-slate-500">{profile?.full_name || "Administrátor"}</div>
            <div className="text-xs text-slate-400">{profile?.organizations?.name || "Podsavez"}</div>
          </div>
          <button type="button" onClick={handleLogout} className="flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <LogOut className="mr-2 h-4 w-4" /> Odhlásit
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200"><div className="text-2xl font-bold text-slate-900">{summary.total}</div><div className="text-xs text-slate-500">Všechny</div></div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200"><div className="text-2xl font-bold text-amber-700">{summary.open}</div><div className="text-xs text-slate-500">Otevřené</div></div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200"><div className="text-2xl font-bold text-emerald-700">{summary.confirmed}</div><div className="text-xs text-slate-500">Potvrzené</div></div>
        </div>

        <div className="mb-4">
          <Link href="/admin/zapasy/novy" className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"><Plus className="mr-2 h-4 w-4" />Přidat zápas</Link>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <Link href="/admin/rozhodci" className="flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">Přehled rozhodčích</Link>
          <Link href="/admin/settings" className="flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"><Settings className="mr-2 h-4 w-4" />Profil</Link>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {[
            { value: "all", label: "Všechny" },
            { value: "open", label: "Otevřené" },
            { value: "full", label: "Obsazené" },
            { value: "confirmed", label: "Potvrzené" },
          ].map((item) => (
            <button key={item.value} type="button" onClick={() => setFilter(item.value as MatchFilter)} className={`h-10 rounded-xl px-3 text-xs font-semibold transition ${filter === item.value ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{item.label}</button>
          ))}
        </div>

        <div className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <label htmlFor="admin-search" className="mb-2 block text-sm font-medium text-slate-700">Hledat zápas</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="admin-search" type="text" placeholder="Tým, soutěž, místo..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
          </div>
        </div>

        {message ? <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</div> : null}

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200"><div className="text-lg font-semibold text-slate-900">Načítání...</div></div>
          ) : filteredMatches.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200"><div className="text-lg font-semibold text-slate-900">Žádné zápasy</div><p className="mt-2 text-sm text-slate-500">Pro tento filtr nejsou žádné zápasy.</p></div>
          ) : (
            filteredMatches.map((match) => {
              const matchCount = counts[match.id] ?? { active: 0, approved: 0 };
              return (
                <article key={match.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div><h2 className="text-lg font-bold text-slate-900">{match.home_team} – {match.away_team}</h2><p className="text-sm text-slate-500">{match.competition}</p></div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusClasses(match.status)}`}>{getStatusLabel(match.status)}</span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" /><span>{formatDate(match.match_date)}</span></div>
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-500" /><span>{formatTime(match.match_time)}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500" /><span>{match.location}</span></div>
                    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-500" /><span>Přihlášeno: {matchCount.active} / Potřeba: {match.needed_refs}</span></div>
                    <div className="text-sm text-slate-500">Schváleno: {matchCount.approved} / {match.needed_refs}</div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Link href={`/admin/zapasy/${match.id}/prihlasky`} className="flex h-11 items-center justify-center rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800">Přihlášky</Link>
                    <Link href={`/admin/zapasy/${match.id}`} className="flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 transition hover:bg-slate-50">Upravit</Link>
                    <button type="button" onClick={() => handleDelete(match.id)} className="flex h-11 items-center justify-center rounded-xl border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">Smazat</button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2 px-3 py-3 text-center text-xs font-medium text-slate-600">
          <Link href="/admin" className="rounded-xl bg-slate-900 px-3 py-2 text-white">Admin</Link>
          <Link href="/admin" className="rounded-xl px-3 py-2 hover:bg-slate-100">Zápasy</Link>
          <Link href="/delegace" className="rounded-xl px-3 py-2 hover:bg-slate-100">Delegace</Link>
          <Link href="/admin/settings" className="rounded-xl px-3 py-2 hover:bg-slate-100">Profil</Link>
        </div>
      </nav>
    </main>
  );
}
