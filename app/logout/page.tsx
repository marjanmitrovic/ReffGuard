"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LogoutPage() {
  const [message, setMessage] = useState("Odhlašování...");

  useEffect(() => {
    const logout = async () => {
      try {
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        setMessage("Byli jste odhlášeni. Přesměrování na přihlášení...");
      } catch {
        setMessage("Lokální relace byla vymazána. Přesměrování na přihlášení...");
      } finally {
        window.setTimeout(() => {
          window.location.href = "/login";
        }, 600);
      }
    };

    logout();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <LogOut className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Odhlášení</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </div>
    </main>
  );
}
