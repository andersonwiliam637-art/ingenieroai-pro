import { auth } from "@/auth";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("UNAUTHENTICATED");
  return user as typeof user & { id: string };
}
