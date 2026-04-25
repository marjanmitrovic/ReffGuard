"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, LogOut, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate, formatTime, formatDateTime } from "@/lib/date";

type ApplicationStatus = "sent" | "approved" | "rejected";
type MatchStatus = "open" | "full" | "confirmed";

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
};

type DbApplication = {
  id: number;
  match_id: number;
  user_id: string;
  status: ApplicationStatus;
  applied_at: string;
};

type DbUser = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ApplicationView = DbApplication & {
  refereeName: string;
};

function getStatusLabel(status: ApplicationStatus) {
  if (status === "sent") return "Odesláno";
  if (status === "approved") return "Schváleno";
  return "Odmítnuto";
}

function getStatusClasses(status: ApplicationStatus) {
  if (status === "sent") return "bg-amber-100 text-amber-800 ring-amber-200";
  if (status === "approved") return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  return "bg-rose-100 text-rose-800 ring-rose-200";
}

export default function PrihlaskyKZapasuPage() {
  const params = useParams<{ id: string }>();
  const matchId = Number(params?.id ?? 0);

  const [adminName, setAdminName] = useState("Administrátor");
  const [match, setMatch] = useState<DbMatch | null>(null);
  const [applications, setApplications] = useState<ApplicationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setMessage("");

    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError) {
      setMatch(null);
      setApplications([]);
      setMessage(matchError.message);
      return;
    }

    if (!matchData) {
      setMatch(null);
      setApplications([]);
      setMessage("Zápas nebyl nalezen.");
      return;
    }

    setMatch(matchData as DbMatch);

    const { data: appData, error: appError } = await supabase
      .from("applications")
      .select("*")
      .eq("match_id", matchId)
      .order("applied_at", { ascending: true });

    if (appError) {
      setApplications([]);
      setMessage(appError.message);
      return;
    }

    const rawApps = (appData ?? []) as DbApplication[];
    const userIds = [...new Set(rawApps.map((item) => item.user_id))];
    const userMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", userIds);

      if (userError) {
        setMessage(userError.message);
      } else {
        ((userData ?? []) as DbUser[]).forEach((user) => {
          userMap.set(user.id, user.full_name || user.email || "Neznámý uživatel");
        });
      }
    }

    setApplications(
      rawApps.map((item) => ({
        ...item,
        refereeName: userMap.get(item.user_id) ?? "Neznámý uživatel",
      }))
    );
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
      await loadData();
      setLoading(false);
    };

    if (matchId) init();
  }, [matchId]);

  const approvedCount = useMemo(() => {
    return applications.filter((item) => item.status === "approved").length;
  }, [applications]);

  const canApproveMore = match ? approvedCount < match.needed_refs : false;

  const checkApproveConflict = async (application: ApplicationView) => {
    if (!match) return "Zápas nebyl načten.";

    const { data: sameTimeMatches, error: matchesError } = await supabase
      .from("matches")
      .select("id")
      .eq("match_date", match.match_date)
      .eq("match_time", match.match_time)
      .neq("id", match.id);

    if (matchesError) return matchesError.message;

    const matchIds = (sameTimeMatches ?? []).map((item) => item.id);
    if (matchIds.length === 0) return null;

    const { data: conflicts, error: conflictsError } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", application.user_id)
      .in("match_id", matchIds)
      .eq("status", "approved");

    if (conflictsError) return conflictsError.message;

    if ((conflicts ?? []).length > 0) {
      return "Tento rozhodčí už má potvrzenou delegaci ve stejný datum a čas.";
    }

    return null;
  };

  const handleApprove = async (application: ApplicationView) => {
    if (!match || !canApproveMore) return;

    setActionId(application.id);
    setMessage("");

    const conflictMessage = await checkApproveConflict(application);
    if (conflictMessage) {
      setActionId(null);
      setMessage(conflictMessage);
      return;
    }

    const { error } = await supabase.from("applications").update({ status: "approved" }).eq("id", application.id);

    if (error) {
      setMessage(error.message);
      setActionId(null);
      return;
    }

    await loadData();
    setActionId(null);
  };

  const handleReject = async (applicationId: number) => {
    if (!match) return;

    setActionId(applicationId);
    setMessage("");

    const { error } = await supabase.from("applications").update({ status: "rejected" }).eq("id", applicationId);

    if (error) {
      setMessage(error.message);
      setActionId(null);
      return;
    }

    await loadData();
    setActionId(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-lg font-semibold text-slate-900">Načítání...</div>
        </div>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-lg font-semibold text-slate-900">{message || "Zápas nebyl nalezen"}</div>
          <Link href="/admin" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Zpět do administrace
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
          <div>
            <div className="text-lg font-bold text-slate-900">Přihlášky k zápasu</div>
            <div className="text-sm text-slate-500">{adminName}</div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleLogout} className="flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <LogOut className="mr-2 h-4 w-4" />
              Odhlásit
            </button>
            <Link href="/admin" className="flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zpět
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-4 px-4 py-4">
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="text-lg font-bold text-slate-900">
            {match.home_team} – {match.away_team}
          </div>
          <div className="mt-1 text-sm text-slate-500">{match.competition}</div>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <div>
              {formatDate(match.match_date)} • {formatTime(match.match_time)}
            </div>
            <div>{match.location}</div>
            <div>
              Schváleno: {approvedCount} / {match.needed_refs}
            </div>
          </div>
        </section>

        {message ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</div> : null}

        {applications.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
            <div className="text-lg font-semibold text-slate-900">Žádné přihlášky</div>
            <p className="mt-2 text-sm text-slate-500">K tomuto zápasu zatím nejsou žádné přihlášky.</p>
          </div>
        ) : (
          applications.map((item) => (
            <article key={item.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900">{item.refereeName}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <Clock3 className="h-4 w-4" />
                    {formatDateTime(item.applied_at)}
                  </div>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusClasses(item.status)}`}>
                  {getStatusLabel(item.status)}
                </span>
              </div>

              {item.status === "sent" ? (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => handleApprove(item)} disabled={!canApproveMore || actionId === item.id} className="flex h-11 items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {actionId === item.id ? "Ukládání..." : "Schválit"}
                  </button>
                  <button type="button" onClick={() => handleReject(item.id)} disabled={actionId === item.id} className="flex h-11 items-center justify-center rounded-xl border border-rose-300 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">
                    <XCircle className="mr-2 h-4 w-4" />
                    {actionId === item.id ? "Ukládání..." : "Odmítnout"}
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </main>
  );
}
