export type AntigravityCredentials = {
  clientId: string;
  clientSecret: string;
};

export function getAntigravityCredentials(): AntigravityCredentials {
  const clientId = process.env.ANTIGRAVITY_CLIENT_ID;
  const clientSecret = process.env.ANTIGRAVITY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing ANTIGRAVITY_CLIENT_ID or ANTIGRAVITY_CLIENT_SECRET. Copy .env.example in this directory and export the values before login.",
    );
  }

  return { clientId, clientSecret };
}
