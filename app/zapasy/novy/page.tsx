"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

type MatchFormState = {
  date: string;
  time: string;
  competition: string;
  home: string;
  away: string;
  location: string;
  neededRefs: string;
};

const initialState: MatchFormState = {
  date: "",
  time: "",
  competition: "",
  home: "",
  away: "",
  location: "",
  neededRefs: "3",
};

export default function NovyZapasPage() {
  const router = useRouter();

  const [adminName, setAdminName] = useState("Administrátor");
  const [form, setForm] = useState<MatchFormState>(initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
    };

    init();
  }, []);

  const updateField = (field: keyof MatchFormState, value: string) => {
    setMessage("");
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("matches").insert({
      match_date: form.date,
      match_time: form.time,
      competition: form.competition,
      home_team: form.home,
      away_team: form.away,
      location: form.location,
      needed_refs: Number(form.neededRefs),
      status: "open",
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
          <div>
            <div className="text-lg font-bold text-slate-900">Nový zápas</div>
            <div className="text-sm text-slate-500">{adminName}</div>
          </div>

          <Link
            href="/admin"
            className="flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Datum</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Čas</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => updateField("time", e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Soutěž</label>
              <input
                type="text"
                value={form.competition}
                onChange={(e) => updateField("competition", e.target.value)}
                placeholder="např. Krajský přebor"
                className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Domácí tým</label>
              <input
                type="text"
                value={form.home}
                onChange={(e) => updateField("home", e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Hostující tým
              </label>
              <input
                type="text"
                value={form.away}
                onChange={(e) => updateField("away", e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Místo</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="např. Praha 10"
                className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Počet rozhodčích
              </label>
              <input
                type="number"
                min="1"
                max="6"
                value={form.neededRefs}
                onChange={(e) => updateField("neededRefs", e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
              disabled={saving}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Ukládání..." : "Uložit zápas"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}