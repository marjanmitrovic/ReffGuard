"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Shield,
  Smartphone,
  Users,
  CalendarDays,
  MessageCircle,
} from "lucide-react";

const refereeSteps = [
  "Rozhodčí se přihlásí do aplikace.",
  "Na stránce Zápasy vidí otevřené zápasy.",
  "Jedním klikem se přihlásí na vybraný zápas.",
  "Ve svých přihláškách sleduje stav.",
  "Po schválení vidí potvrzenou delegaci.",
];

const adminSteps = [
  "Administrátor přidá nový zápas.",
  "Sleduje přihlášky rozhodčích k zápasu.",
  "Vybrané rozhodčí schválí nebo odmítne.",
  "Potvrzené delegace se automaticky zobrazí.",
  "Výsledek lze sdílet přes WhatsApp.",
];

const features = [
  {
    icon: CalendarDays,
    title: "Přehled zápasů",
    text: "Všechny zápasy přehledně na jednom místě, optimalizované pro mobil.",
  },
  {
    icon: ClipboardList,
    title: "Rychlé přihlášky",
    text: "Rozhodčí se přihlašují jedním kliknutím bez složitých formulářů.",
  },
  {
    icon: Shield,
    title: "Administrace",
    text: "Jednoduché schvalování, úprava zápasů a správa delegací.",
  },
  {
    icon: MessageCircle,
    title: "Sdílení",
    text: "Potvrzené delegace lze rychle sdílet přes WhatsApp.",
  },
  {
    icon: Smartphone,
    title: "Mobilní použití",
    text: "Velká tlačítka, čitelné karty a jednoduché ovládání.",
  },
  {
    icon: Users,
    title: "Pro rozhodčí i admina",
    text: "Oddělené rozhraní pro běžné uživatele a administrátory.",
  },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">
                Demo prezentace aplikace
              </div>

              <div className="mb-5 flex items-center gap-4">
                <img
                  src="/reffguard-icon.png"
                  alt="ReffGuard"
                  className="h-16 w-16 rounded-2xl object-cover shadow-lg ring-1 ring-white/20"
                />
                <div className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  ReffGuard
                </div>
              </div>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Delegace rozhodčích
              </h1>

              <p className="mt-4 max-w-xl text-base text-slate-200 md:text-lg">
                Jednoduchá a přehledná aplikace pro přihlašování rozhodčích,
                schvalování delegací a rychlou administraci zápasů.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Otevřít aplikaci
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>

                <a
                  href="#jak-to-funguje"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Jak to funguje
                </a>
              </div>
            </div>

            <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
              <div className="rounded-3xl bg-white p-5 text-slate-900 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold">Ukázka přehledu</div>
                    <div className="text-sm text-slate-500">
                      Mobilní rozhraní pro rozhodčí
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Potvrzeno
                  </span>
                </div>

                <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                  <div className="text-base font-semibold">Mladost – Sloga</div>
                  <div className="text-sm text-slate-600">28.04.2026 • 14:00</div>
                  <div className="text-sm text-slate-600">Praha 10</div>
                  <div className="pt-2 text-sm text-slate-700">
                    Hlavní rozhodčí: Petr Svoboda
                  </div>
                  <div className="text-sm text-slate-700">
                    Asistenti: Jan Novák, Martin Dvořák
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-medium text-slate-600">
                  <div className="rounded-xl bg-slate-900 px-3 py-2 text-white">Zápasy</div>
                  <div className="rounded-xl bg-slate-100 px-3 py-2">Přihlášky</div>
                  <div className="rounded-xl bg-slate-100 px-3 py-2">Delegace</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Co aplikace umí
          </h2>
          <p className="mt-2 text-slate-600">
            Připraveno pro rychlé a jednoduché použití v mobilu i na počítači.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {feature.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section
        id="jak-to-funguje"
        className="border-y border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Jak to funguje
            </h2>
            <p className="mt-2 text-slate-600">
              Dva jednoduché pracovní toky: jeden pro rozhodčí, druhý pro administrátora.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-200">
              <div className="mb-4 inline-flex rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                Tok rozhodčího
              </div>

              <div className="space-y-4">
                {refereeSteps.map((step, index) => (
                  <div key={step} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900 ring-1 ring-slate-200">
                      {index + 1}
                    </div>
                    <div className="pt-1 text-sm leading-6 text-slate-700">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-200">
              <div className="mb-4 inline-flex rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                Tok administrátora
              </div>

              <div className="space-y-4">
                {adminSteps.map((step, index) => (
                  <div key={step} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900 ring-1 ring-slate-200">
                      {index + 1}
                    </div>
                    <div className="pt-1 text-sm leading-6 text-slate-700">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Hlavní výhody
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                "Rychlé přihlášení na zápas jedním klikem",
                "Přehledné zobrazení stavu přihlášek",
                "Jednoduché schvalování delegací",
                "Mobilní rozhraní pro každodenní použití",
                "Sdílení potvrzených delegací",
                "Čisté rozhraní bez zbytečných funkcí",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <span className="text-sm leading-6 text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
            <h2 className="text-2xl font-bold">Ukázat aplikaci</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Tato stránka slouží jako rychlá prezentace. Pro vstup do aplikace
              pokračujte na přihlášení.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href="/login"
                className="flex h-12 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Otevřít přihlášení
              </Link>

              <Link
                href="/"
                className="flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Hlavní vstup
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}