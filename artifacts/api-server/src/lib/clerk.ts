import { createClerkClient } from "@clerk/express";

export const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/** Returns the user's primary email address, or null if unavailable. */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const user = await clerkClient.users.getUser(userId);
    return (
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null
    );
  } catch {
    return null;
  }
}
