"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, LogOut, MapPin, Search, Users } from "lucide-react";
import { getSessionProfile, isApprovedReferee, type AppProfile } from "@/lib/auth-profile";
import { formatDate, formatTime } from "@/lib/date";
import { supabase } from "@/lib/supabase";

type MatchStatus = "open" | "full" | "confirmed";
type ApplicationStatus = "sent" | "approved" | "rejected";

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

type DbApplication = {
  id: number;
  match_id: number;
  user_id: string;
  status: ApplicationStatus;
  applied_at: string;
};

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

async function withTimeout<T>(promise: Promise<T>, message: string, ms = 12000) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default function ZapasyPage() {
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [myApplications, setMyApplications] = useState<DbApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadData = async (currentUserId: string, organizationId: number) => {
    setMessage("");

    const matchesResponse = await withTimeout(
      supabase
        .from("matches")
        .select("id, match_date, match_time, competition, home_team, away_team, location, needed_refs, status, organization_id")
        .eq("organization_id", organizationId)
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true }),
      "Načítání zápasů trvá příliš dlouho. Zkontrolujte oprávnění tabulky matches."
    );

    if (matchesResponse.error) {
      setMessage(matchesResponse.error.message);
      setMatches([]);
      setMyApplications([]);
      return;
    }

    const loadedMatches = (matchesResponse.data ?? []) as DbMatch[];
    setMatches(loadedMatches);

    if (loadedMatches.length === 0) {
      setMyApplications([]);
      return;
    }

    const matchIds = loadedMatches.map((match) => match.id);

    const appsResponse = await withTimeout(
      supabase
        .from("applications")
        .select("id, match_id, user_id, status, applied_at")
        .eq("user_id", currentUserId)
        .in("match_id", matchIds),
      "Načítání přihlášek trvá příliš dlouho. Zkontrolujte oprávnění tabulky applications."
    );

    if (appsResponse.error) {
      setMessage(appsResponse.error.message);
      setMyApplications([]);
      return;
    }

    setMyApplications((appsResponse.data ?? []) as DbApplication[]);
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setMessage("");

        const result = await withTimeout(
          getSessionProfile({ createIfMissing: true }),
          "Načítání profilu trvá příliš dlouho. Odhlaste se a přihlaste znovu."
        );

        const session = result.session;
        const loadedProfile = result.profile;

        if (!session?.user || !loadedProfile) {
          window.location.href = "/login";
          return;
        }

        if (loadedProfile.role === "superadmin") {
          window.location.href = "/superadmin";
          return;
        }

        if (loadedProfile.role === "admin") {
          window.location.href = "/admin";
          return;
        }

        setProfile(loadedProfile);

        if (!isApprovedReferee(loadedProfile)) {
          setMessage(
            loadedProfile.registration_status === "pending"
              ? "Vaše registrace čeká na schválení administrátorem."
              : "Vaše registrace byla odmítnuta."
          );
          return;
        }

        if (!loadedProfile.organization_id) {
          setMessage("Váš účet nemá přiřazený podsavez. Kontaktujte administrátora.");
          return;
        }

        await loadData(session.user.id, loadedProfile.organization_id);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Nepodařilo se načíst zápasy.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const filteredMatches = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return matches;
    return matches.filter((match) =>
      `${match.home_team} ${match.away_team} ${match.competition} ${match.location} ${match.match_date}`
        .toLowerCase()
        .includes(value)
    );
  }, [matches, search]);

  const hasApplied = (matchId: number) =>
    myApplications.some((item) => item.match_id === matchId && item.status !== "rejected");

  const checkApplicationConflict = async (match: DbMatch) => {
    if (!profile?.id) return "Profil nebyl načten.";

    const sameTimeResponse = await withTimeout(
      supabase
        .from("matches")
        .select("id")
        .eq("organization_id", match.organization_id)
        .eq("match_date", match.match_date)
        .eq("match_time", match.match_time)
        .neq("id", match.id),
      "Kontrola kolize trvá příliš dlouho."
    );

    if (sameTimeResponse.error) return sameTimeResponse.error.message;

    const ids = (sameTimeResponse.data ?? []).map((item) => item.id);
    if (ids.length === 0) return null;

    const conflictsResponse = await withTimeout(
      supabase
        .from("applications")
        .select("id")
        .eq("user_id", profile.id)
        .in("match_id", ids)
        .eq("status", "approved"),
      "Kontrola přihlášek trvá příliš dlouho."
    );

    if (conflictsResponse.error) return conflictsResponse.error.message;

    return (conflictsResponse.data ?? []).length > 0
      ? "Už máte potvrzenou delegaci ve stejný datum a čas."
      : null;
  };

  const handleApply = async (match: DbMatch) => {
    if (!profile?.id || !profile.organization_id) return;

    setMessage("");

    const conflictMessage = await checkApplicationConflict(match);
    if (conflictMessage) {
      setMessage(conflictMessage);
      return;
    }

    const response = await withTimeout(
      supabase.from("applications").insert({
        match_id: match.id,
        user_id: profile.id,
        status: "sent",
      }),
      "Odeslání přihlášky trvá příliš dlouho."
    );

    if (response.error) {
      setMessage(response.error.code === "23505" ? "Na tento zápas jste už přihlášen." : response.error.message);
      return;
    }

    await loadData(profile.id, profile.organization_id);
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
            <div className="text-lg font-bold text-slate-900">Zápasy</div>
            <div className="text-sm text-slate-500">{profile?.full_name || "Rozhodčí"}</div>
            <div className="text-xs text-slate-400">{profile?.organizations?.name || ""}</div>
          </div>
          <button type="button" onClick={handleLogout} className="flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <LogOut className="mr-2 h-4 w-4" />Odhlásit
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        <div className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <label htmlFor="search" className="mb-2 block text-sm font-medium text-slate-700">Hledat zápas</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="search" type="text" placeholder="Tým, soutěž, místo..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
          </div>
        </div>

        {message ? (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {message}
            <div className="mt-3">
              <Link href="/logout" className="font-semibold text-slate-900 underline">Odhlásit a zkusit znovu</Link>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
              <div className="text-lg font-semibold text-slate-900">Načítání...</div>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
              <div className="text-lg font-semibold text-slate-900">Žádné zápasy</div>
              <p className="mt-2 text-sm text-slate-500">V databázi nejsou žádné dostupné zápasy.</p>
            </div>
          ) : (
            filteredMatches.map((match) => {
              const alreadyApplied = hasApplied(match.id);
              const disabled = alreadyApplied || match.status !== "open" || !isApprovedReferee(profile);

              return (
                <article key={match.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{match.home_team} – {match.away_team}</h2>
                      <p className="text-sm text-slate-500">{match.competition}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusClasses(match.status)}`}>{getStatusLabel(match.status)}</span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-500" /><span>{formatDate(match.match_date)}</span></div>
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-500" /><span>{formatTime(match.match_time)}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500" /><span>{match.location}</span></div>
                    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-500" /><span>Potřeba rozhodčích: {match.needed_refs}</span></div>
                  </div>

                  <div className="mt-4">
                    <button type="button" disabled={disabled} onClick={() => handleApply(match)} className="h-12 w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
                      {alreadyApplied ? "Přihlášeno" : match.status === "open" ? "Přihlásit se" : "Nelze se přihlásit"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2 px-3 py-3 text-center text-xs font-medium text-slate-600">
          <Link href="/zapasy" className="rounded-xl bg-slate-900 px-3 py-2 text-white">Zápasy</Link>
          <Link href="/prihlasky" className="rounded-xl px-3 py-2 hover:bg-slate-100">Přihlášky</Link>
          <Link href="/delegace" className="rounded-xl px-3 py-2 hover:bg-slate-100">Delegace</Link>
          <Link href="/profil" className="rounded-xl px-3 py-2 hover:bg-slate-100">Profil</Link>
        </div>
      </nav>
    </main>
  );
}
