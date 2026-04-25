import { supabase } from "@/lib/supabase";

export type AppRole = "admin" | "referee";

export type AppProfile = {
  id: string;
  full_name: string | null;
  role: AppRole;
  email: string | null;
  phone?: string | null;
};

function fallbackName(email?: string | null, metadata?: Record<string, unknown>) {
  const fromMeta = typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "";
  if (fromMeta) return fromMeta;
  if (email) return email.split("@")[0] || "Uživatel";
  return "Uživatel";
}

export async function getSessionProfile(options?: { createIfMissing?: boolean }) {
  const createIfMissing = options?.createIfMissing ?? true;

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  if (!session?.user) return { session: null, profile: null as AppProfile | null };

  const user = session.user;

  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id, full_name, role, email, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) return { session, profile: existing as AppProfile };

  if (!createIfMissing) {
    return {
      session,
      profile: {
        id: user.id,
        full_name: fallbackName(user.email, user.user_metadata),
        role: "referee",
        email: user.email ?? null,
        phone: null,
      } as AppProfile,
    };
  }

  const profileToCreate = {
    id: user.id,
    full_name: fallbackName(user.email, user.user_metadata),
    role: "referee" as AppRole,
    email: user.email ?? null,
    phone: null,
  };

  const { error: insertError } = await supabase.from("users").insert(profileToCreate);
  if (insertError && insertError.code !== "23505") {
    return { session, profile: profileToCreate };
  }

  const { data: created, error: createdError } = await supabase
    .from("users")
    .select("id, full_name, role, email, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (createdError || !created) {
    return { session, profile: profileToCreate };
  }

  return { session, profile: created as AppProfile };
}
