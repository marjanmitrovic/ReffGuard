"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatTime } from "@/lib/date";

type MatchFormState = {
  id: number;
  date: string;
  time: string;
  competition: string;
  home: string;
  away: string;
  location: string;
  neededRefs: string;
};

type Referee = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ApprovedApplication = {
  id: number;
  match_id: number;
  user_id: string;
  status: "approved";
  applied_at: string;
};

function getPositionLabel(index: number) {
  if (index === 0) return "Hlavní rozhodčí";
  return `Asistent ${index}`;
}

export default function EditZapasPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [adminName, setAdminName] = useState("Administrátor");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<MatchFormState | null>(null);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);

  const matchId = useMemo(() => Number(params?.id ?? 0), [params]);

  const neededRefsNumber = useMemo(() => {
    const parsed = Number(form?.neededRefs || 1);
    if (Number.isNaN(parsed)) return 1;
    return Math.min(Math.max(parsed, 1), 6);
  }, [form?.neededRefs]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("full_name, role")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile) {
        window.location.href = "/login";
        return;
      }

      if (profile.role !== "admin") {
        window.location.href = "/zapasy";
        return;
      }

      setAdminName(profile.full_name || session.user.email || "Administrátor");

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();

      if (matchError) {
        setMessage(`Chyba databáze: ${matchError.message}`);
        return;
      }

      if (!match) {
        setMessage(`Zápas nebyl nalezen. ID: ${matchId}`);
        return;
      }

      setForm({
        id: match.id,
        date: match.match_date,
        time: formatTime(match.match_time),
        competition: match.competition,
        home: match.home_team,
        away: match.away_team,
        location: match.location,
        neededRefs: String(match.needed_refs),
      });

      const { data: refereeData, error: refereeError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("role", "referee")
        .order("full_name", { ascending: true });

      if (refereeError) {
        setMessage(refereeError.message);
        return;
      }

      setReferees((refereeData ?? []) as Referee[]);

      const { data: approvedData, error: approvedError } = await supabase
        .from("applications")
        .select("id, match_id, user_id, status, applied_at")
        .eq("match_id", matchId)
        .eq("status", "approved")
        .order("applied_at", { ascending: true });

      if (approvedError) {
        setMessage(approvedError.message);
        return;
      }

      const approved = (approvedData ?? []) as ApprovedApplication[];
      const initialSelected = approved.map((item) => item.user_id);
      const needed = Number(match.needed_refs);

      while (initialSelected.length < needed) initialSelected.push("");
      setSelectedRefs(initialSelected.slice(0, needed));
    };

    if (matchId) init();
  }, [matchId]);

  const updateField = (field: keyof MatchFormState, value: string) => {
    setSaved(false);
    setMessage("");

    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));

    if (field === "neededRefs") {
      const parsed = Number(value);
      const nextCount = Number.isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 1), 6);

      setSelectedRefs((prev) => {
        const next = [...prev];
        while (next.length < nextCount) next.push("");
        return next.slice(0, nextCount);
      });
    }
  };

  const updateSelectedRef = (index: number, value: string) => {
    setSaved(false);
    setMessage("");

    setSelectedRefs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const checkSelectedRefsConflict = async () => {
    if (!form) return "Zápas nebyl načten.";

    const selected = selectedRefs.filter((id) => id.trim().length > 0);
    const uniqueSelectedRefs = Array.from(new Set(selected));

    if (uniqueSelectedRefs.length !== selected.length) {
      return "Stejný rozhodčí nesmí být vybrán vícekrát.";
    }

    if (uniqueSelectedRefs.length === 0) return null;

    const { data: sameTimeMatches, error: matchesError } = await supabase
      .from("matches")
      .select("id")
      .eq("match_date", form.date)
      .eq("match_time", form.time)
      .neq("id", form.id);

    if (matchesError) return matchesError.message;

    const matchIds = (sameTimeMatches ?? []).map((item) => item.id);
    if (matchIds.length === 0) return null;

    const { data: conflicts, error: conflictsError } = await supabase
      .from("applications")
      .select("id")
      .in("user_id", uniqueSelectedRefs)
      .in("match_id", matchIds)
      .eq("status", "approved");

    if (conflictsError) return conflictsError.message;

    if ((conflicts ?? []).length > 0) {
      return "Některý z vybraných rozhodčích už má potvrzenou delegaci ve stejný datum a čas.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    setSaving(true);
    setSaved(false);
    setMessage("");

    const conflictMessage = await checkSelectedRefsConflict();
    if (conflictMessage) {
      setSaving(false);
      setMessage(conflictMessage);
      return;
    }

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        match_date: form.date,
        match_time: form.time,
        competition: form.competition,
        home_team: form.home,
        away_team: form.away,
        location: form.location,
        needed_refs: Number(form.neededRefs),
      })
      .eq("id", form.id);

    if (updateError) {
      setSaving(false);
      setMessage(updateError.message);
      return;
    }

    const uniqueSelectedRefs = Array.from(new Set(selectedRefs.filter((id) => id.trim().length > 0)));

    const { error: deleteError } = await supabase
      .from("applications")
      .delete()
      .eq("match_id", form.id)
      .eq("status", "approved");

    if (deleteError) {
      setSaving(false);
      setMessage(deleteError.message);
      return;
    }

    if (uniqueSelectedRefs.length > 0) {
      const rows = uniqueSelectedRefs.map((userId) => ({
        match_id: form.id,
        user_id: userId,
        status: "approved",
      }));

      const { error: insertError } = await supabase.from("applications").upsert(rows, {
        onConflict: "match_id,user_id",
      });

      if (insertError) {
        setSaving(false);
        setMessage(insertError.message);
        return;
      }
    }

    setSaving(false);
    setSaved(true);

    setTimeout(() => {
      router.push("/admin");
      router.refresh();
    }, 500);
  };

  if (!form) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <div className="text-lg font-semibold text-slate-900">{message || "Načítání zápasu..."}</div>
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
            <div className="text-lg font-bold text-slate-900">Upravit zápas</div>
            <div className="text-sm text-slate-500">{adminName}</div>
          </div>
          <Link href="/admin" className="flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Datum</label>
              <input type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Čas</label>
              <input type="time" value={form.time} onChange={(e) => updateField("time", e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Soutěž</label>
              <input type="text" value={form.competition} onChange={(e) => updateField("competition", e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Domácí tým</label>
              <input type="text" value={form.home} onChange={(e) => updateField("home", e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Hostující tým</label>
              <input type="text" value={form.away} onChange={(e) => updateField("away", e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Místo</label>
              <input type="text" value={form.location} onChange={(e) => updateField("location", e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Počet rozhodčích</label>
              <input type="number" min="1" max="6" value={form.neededRefs} onChange={(e) => updateField("neededRefs", e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" required />
            </div>

            <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="mb-3">
                <div className="text-base font-bold text-slate-900">Delegace rozhodčích</div>
                <p className="mt-1 text-sm text-slate-500">Zde můžete změnit hlavního rozhodčího a asistenty.</p>
              </div>
              <div className="space-y-3">
                {Array.from({ length: neededRefsNumber }).map((_, index) => (
                  <div key={index}>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{getPositionLabel(index)}</label>
                    <select value={selectedRefs[index] || ""} onChange={(e) => updateSelectedRef(index, e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200">
                      <option value="">Nevybráno</option>
                      {referees.map((referee) => (
                        <option key={referee.id} value={referee.id}>
                          {referee.full_name || referee.email || "Bez jména"}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {message ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</div> : null}
            {saved ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">Změny byly uloženy.</div> : null}

            <button type="submit" disabled={saving} className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Ukládání..." : "Uložit změny"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
