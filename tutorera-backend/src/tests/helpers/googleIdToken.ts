import crypto from "node:crypto";
import jwt from "jsonwebtoken";

/**
 * Test double for Google Sign-In. The controller verifies RS256 ID tokens against
 * Google's JWKS fetched with native fetch, so tests sign tokens with a throwaway key
 * and serve the matching JWKS from a fetch spy. Real signature, audience, issuer and
 * email_verified checks still run; only the network call is replaced.
 */
const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const KID = "test-google-key";
export const TEST_GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" }) as { n: string; e: string };

export function installGoogleJwksMock(): void {
  process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID;
  const realFetch = globalThis.fetch;
  jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === CERTS_URL) {
      return new Response(JSON.stringify({ keys: [{ kid: KID, kty: "RSA", alg: "RS256", use: "sig", n: jwk.n, e: jwk.e }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return realFetch(input, init);
  });
}

export function googleIdToken(email: string, opts: { verified?: boolean; name?: string } = {}): string {
  return jwt.sign(
    { sub: `google-sub-${email}`, email, email_verified: opts.verified ?? true, name: opts.name ?? "Google Test User", picture: "" },
    privateKey,
    { algorithm: "RS256", keyid: KID, audience: TEST_GOOGLE_CLIENT_ID, issuer: "https://accounts.google.com", expiresIn: "1h" }
  );
}
