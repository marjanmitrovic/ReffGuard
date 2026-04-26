"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { getSessionProfile, requireOrganization, type AppProfile } from "@/lib/auth-profile";
import { supabase } from "@/lib/supabase";

type MatchFormState = { date: string; time: string; competition: string; home: string; away: string; location: string; neededRefs: string };
type Referee = { id: string; full_name: string | null; email: string | null; facr_id: string | null };
const initialState: MatchFormState = { date: "", time: "", competition: "", home: "", away: "", location: "", neededRefs: "3" };
function getPositionLabel(index: number) { return index === 0 ? "Hlavní rozhodčí" : `Asistent ${index}`; }

export default function NovyZapasPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AppProfile | null>(null);
  const [form, setForm] = useState<MatchFormState>(initialState);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<string[]>(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const neededRefsNumber = useMemo(() => {
    const parsed = Number(form.neededRefs);
    if (Number.isNaN(parsed)) return 1;
    return Math.min(Math.max(parsed, 1), 6);
  }, [form.neededRefs]);

  const loadReferees = async (organizationId: number) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, facr_id")
      .eq("organization_id", organizationId)
      .eq("role", "referee")
      .eq("registration_status", "approved")
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    setReferees((data ?? []) as Referee[]);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { session, profile } = await getSessionProfile();
        if (!session?.user || !profile) { window.location.href = "/login"; return; }
        if (profile.role !== "admin") { window.location.href = "/zapasy"; return; }
        const organizationId = requireOrganization(profile);
        setAdmin(profile);
        await loadReferees(organizationId);
      } catch (err) { setMessage(err instanceof Error ? err.message : "Nepodařilo se načíst data."); }
    };
    init();
  }, []);

  const updateField = (field: keyof MatchFormState, value: string) => {
    setMessage(""); setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "neededRefs") {
      const parsed = Number(value);
      const nextCount = Number.isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 1), 6);
      setSelectedRefs((prev) => { const next = [...prev]; while (next.length < nextCount) next.push(""); return next.slice(0, nextCount); });
    }
  };

  const updateSelectedRef = (index: number, value: string) => {
    setMessage(""); setSelectedRefs((prev) => { const next = [...prev]; next[index] = value; return next; });
  };

  const checkSelectedRefsConflict = async () => {
    if (!admin?.organization_id) return "Administrátor nemá přiřazený podsavez.";
    const selected = selectedRefs.filter((id) => id.trim().length > 0);
    const uniqueSelectedRefs = Array.from(new Set(selected));
    if (uniqueSelectedRefs.length !== selected.length) return "Stejný rozhodčí nesmí být vybrán vícekrát.";
    if (uniqueSelectedRefs.length === 0) return null;

    const { data: sameTimeMatches, error: matchesError } = await supabase
      .from("matches")
      .select("id")
      .eq("organization_id", admin.organization_id)
      .eq("match_date", form.date)
      .eq("match_time", form.time);
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
    return (conflicts ?? []).length > 0 ? "Některý z vybraných rozhodčích už má potvrzenou delegaci ve stejný datum a čas." : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.organization_id) { setMessage("Administrátor nemá přiřazený podsavez."); return; }
    setSaving(true); setMessage("");
    const conflictMessage = await checkSelectedRefsConflict();
    if (conflictMessage) { setSaving(false); setMessage(conflictMessage); return; }

    const { data: createdMatch, error: matchError } = await supabase.from("matches").insert({
      organization_id: admin.organization_id,
      match_date: form.date,
      match_time: form.time,
      competition: form.competition,
      home_team: form.home,
      away_team: form.away,
      location: form.location,
      needed_refs: Number(form.neededRefs),
      status: "open",
    }).select("id").single();

    if (matchError || !createdMatch) { setSaving(false); setMessage(matchError?.message || "Zápas se nepodařilo uložit."); return; }
    const uniqueSelectedRefs = Array.from(new Set(selectedRefs.filter((id) => id.trim().length > 0)));
    if (uniqueSelectedRefs.length > 0) {
      const rows = uniqueSelectedRefs.map((userId) => ({ match_id: createdMatch.id, user_id: userId, status: "approved" }));
      const { error: applicationsError } = await supabase.from("applications").insert(rows);
      if (applicationsError) { setSaving(false); setMessage(`Zápas byl uložen, ale delegace nebyla dokončena: ${applicationsError.message}`); return; }
    }
    setSaving(false); router.push("/admin"); router.refresh();
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-md items-center justify-between px-4 py-4"><div><div className="text-lg font-bold text-slate-900">Nový zápas</div><div className="text-sm text-slate-500">{admin?.organizations?.name || admin?.full_name || "Administrátor"}</div></div><Link href="/admin" className="flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"><ArrowLeft className="mr-2 h-4 w-4" />Zpět</Link></div></header>
      <div className="mx-auto max-w-md px-4 py-4"><form onSubmit={handleSubmit} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="space-y-4">
        {[
          ["date", "Datum", "date", ""], ["time", "Čas", "time", ""], ["competition", "Soutěž", "text", "např. Krajský přebor"], ["home", "Domácí tým", "text", ""], ["away", "Hostující tým", "text", ""], ["location", "Místo", "text", "např. Praha 10"]
        ].map(([field, label, type, placeholder]) => (
          <div key={field}><label className="mb-1 block text-sm font-medium text-slate-700">{label}</label><input type={type} value={form[field as keyof MatchFormState]} onChange={(e) => updateField(field as keyof MatchFormState, e.target.value)} placeholder={placeholder} className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" required /></div>
        ))}
        <div><label className="mb-1 block text-sm font-medium text-slate-700">Počet rozhodčích</label><input type="number" min="1" max="6" value={form.neededRefs} onChange={(e) => updateField("neededRefs", e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" required /></div>
        <section className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="mb-3"><div className="text-base font-bold text-slate-900">Přímá delegace rozhodčích</div><p className="mt-1 text-sm text-slate-500">Vybrat lze jen schválené rozhodčí stejného podsavezu.</p></div><div className="space-y-3">{Array.from({ length: neededRefsNumber }).map((_, index) => (<div key={index}><label className="mb-1 block text-sm font-medium text-slate-700">{getPositionLabel(index)}</label><select value={selectedRefs[index] || ""} onChange={(e) => updateSelectedRef(index, e.target.value)} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"><option value="">Nevybráno</option>{referees.map((referee) => (<option key={referee.id} value={referee.id}>{referee.full_name || referee.email || "Bez jména"}{referee.facr_id ? ` – FAČR ${referee.facr_id}` : ""}</option>))}</select></div>))}</div></section>
        {message ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</div> : null}
        <button type="submit" disabled={saving} className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"><Save className="mr-2 h-4 w-4" />{saving ? "Ukládání..." : "Uložit zápas"}</button>
      </div></form></div>
    </main>
  );
}
