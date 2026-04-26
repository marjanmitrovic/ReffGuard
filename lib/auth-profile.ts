import { supabase } from "@/lib/supabase";

export type AppRole = "superadmin" | "admin" | "referee";
export type RegistrationStatus = "pending" | "approved" | "rejected";

export type AppOrganization = {
  id: number;
  name: string;
  slug: string | null;
};

export type AppProfile = {
  id: string;
  full_name: string | null;
  role: AppRole;
  email: string | null;
  phone: string | null;
  organization_id: number | null;
  facr_id: string | null;
  registration_status: RegistrationStatus;
  organizations?: AppOrganization | null;
};

function metadataString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function metadataNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function fallbackName(email?: string | null, metadata?: Record<string, unknown>) {
  const fromMeta = metadataString(metadata?.full_name);
  if (fromMeta) return fromMeta;
  if (email) return email.split("@")[0] || "Uživatel";
  return "Uživatel";
}

export function isApprovedReferee(profile: AppProfile | null) {
  return profile?.role === "referee" && profile.registration_status === "approved";
}

export function isSuperadmin(profile: AppProfile | null) {
  return profile?.role === "superadmin";
}

export async function getOrganizations() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as AppOrganization[];
}

export async function getSessionProfile(options?: { createIfMissing?: boolean }) {
  const createIfMissing = options?.createIfMissing ?? true;

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw new Error(sessionError.message);
  if (!session?.user) return { session: null, profile: null as AppProfile | null };

  const user = session.user;

  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id, full_name, role, email, phone, organization_id, facr_id, registration_status, organizations(id, name, slug)")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) return { session, profile: existing as unknown as AppProfile };

  if (!createIfMissing) {
    return { session, profile: null as AppProfile | null };
  }

  const metadata = user.user_metadata ?? {};
  const organizationId = metadataNumber(metadata.organization_id);
  const facrId = metadataString(metadata.facr_id);

  if (!organizationId || !facrId) {
    return { session, profile: null as AppProfile | null };
  }

  const profileToCreate = {
    id: user.id,
    full_name: fallbackName(user.email, metadata),
    role: "referee" as AppRole,
    email: user.email ?? null,
    phone: null,
    organization_id: organizationId,
    facr_id: facrId,
    registration_status: "pending" as RegistrationStatus,
  };

  const { error: insertError } = await supabase.from("users").insert(profileToCreate);
  if (insertError && insertError.code !== "23505") {
    throw new Error(insertError.message);
  }

  const { data: created, error: createdError } = await supabase
    .from("users")
    .select("id, full_name, role, email, phone, organization_id, facr_id, registration_status, organizations(id, name, slug)")
    .eq("id", user.id)
    .maybeSingle();

  if (createdError) throw new Error(createdError.message);
  return { session, profile: (created as AppProfile | null) ?? profileToCreate };
}

export function requireOrganization(profile: AppProfile | null) {
  if (!profile?.organization_id) {
    throw new Error("Uživatel nemá přiřazený podsavez.");
  }
  return profile.organization_id;
}
