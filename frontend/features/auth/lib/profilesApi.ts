import { createClient } from "@/shared/lib/supabase/client";
import type { Database } from "@/features/auth/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Columns users may change on their own profile (enforced by column grants)
type ProfileUpdate = Partial<
  Pick<
    Profile,
    "display_name" | "default_latitude" | "default_longitude" | "show_tutorial"
  >
>;

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await createClient()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

// The profile row always exists: the handle_new_user trigger creates it on sign-up
export async function updateProfile(
  userId: string,
  updates: ProfileUpdate,
): Promise<Profile> {
  const { data, error } = await createClient()
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    throw error;
  }

  return data;
}

export async function getDefaultLocation(
  userId: string,
): Promise<{ lat: number; lng: number } | null> {
  const profile = await getProfile(userId);

  if (
    profile &&
    profile.default_latitude !== null &&
    profile.default_longitude !== null
  ) {
    return {
      lat: profile.default_latitude,
      lng: profile.default_longitude,
    };
  }

  return null;
}
