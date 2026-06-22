import { b64urlToUint8, uint8ToB64url, VAPID_PUBLIC_KEY_B64URL } from "./push-vapid";

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

async function importVapidPrivateKey(): Promise<CryptoKey> {
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv) throw new Error("VAPID_PRIVATE_KEY not configured");
  const pubRaw = b64urlToUint8(VAPID_PUBLIC_KEY_B64URL); // 65 bytes uncompressed
  const x = uint8ToB64url(pubRaw.slice(1, 33));
  const y = uint8ToB64url(pubRaw.slice(33, 65));
  const jwk: JsonWebKey = { kty: "EC", crv: "P-256", x, y, d: priv, ext: true };
  return await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function signVapidJWT(audience: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: VAPID_SUBJECT,
  };
  const enc = (o: unknown) => uint8ToB64url(new TextEncoder().encode(JSON.stringify(o)));
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const key = await importVapidPrivateKey();
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${uint8ToB64url(sig)}`;
}

// HKDF-SHA256
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm.buffer.slice(ikm.byteOffset, ikm.byteOffset + ikm.byteLength) as ArrayBuffer, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

async function encryptAes128Gcm(
  payload: Uint8Array,
  uaPubRaw: Uint8Array,  // 65-byte uncompressed
  authSecret: Uint8Array,
): Promise<Uint8Array> {
  // Ephemeral application server keypair
  const asKeypair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPubJwk = await crypto.subtle.exportKey("jwk", asKeypair.publicKey);
  const asPubRaw = concat(new Uint8Array([0x04]), b64urlToUint8(asPubJwk.x!), b64urlToUint8(asPubJwk.y!));

  // Import UA public key
  const uaJwk: JsonWebKey = {
    kty: "EC", crv: "P-256",
    x: uint8ToB64url(uaPubRaw.slice(1, 33)),
    y: uint8ToB64url(uaPubRaw.slice(33, 65)),
    ext: true,
  };
  const uaPub = await crypto.subtle.importKey("jwk", uaJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits({ name: "ECDH", public: uaPub }, asKeypair.privateKey, 256);
  const shared = new Uint8Array(sharedBits);

  // PRK_key = HKDF(salt=auth, ikm=shared, info="WebPush: info\0" || uaPub || asPub, len=32)
  const keyInfo = concat(new TextEncoder().encode("WebPush: info\0"), uaPubRaw, asPubRaw);
  const prk = await hkdf(authSecret, shared, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, prk, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, prk, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  const plain = concat(payload, new Uint8Array([0x02]));
  const cekKey = await crypto.subtle.importKey("raw", cek as BufferSource, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, cekKey, plain as BufferSource),
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const header = concat(salt, rs, new Uint8Array([asPubRaw.length]), asPubRaw);
  return concat(header, ciphertext);
}

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export async function sendWebPush(target: PushTarget, payload: { title: string; body?: string; url?: string; tag?: string }): Promise<{ ok: boolean; status: number }> {
  const url = new URL(target.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await signVapidJWT(audience);
  const body = await encryptAes128Gcm(
    new TextEncoder().encode(JSON.stringify(payload)),
    b64urlToUint8(target.p256dh),
    b64urlToUint8(target.auth),
  );
  const res = await fetch(target.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "60",
      Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY_B64URL}`,
    },
    body: body as BodyInit,
  });
  return { ok: res.ok, status: res.status };
}

// Server-side broadcast: send to every stored subscription, prune dead ones.
// Safe to call from other server handlers without going through auth middleware.
export async function broadcastWebPush(payload: { title: string; body?: string; url?: string; tag?: string }): Promise<{ sent: number }> {
  if (!process.env.VAPID_PRIVATE_KEY) return { sent: 0 };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth");
  if (error || !subs?.length) return { sent: 0 };
  let sent = 0;
  const stale: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        const res = await sendWebPush(s, payload);
        if (res.ok) sent += 1;
        else if (res.status === 404 || res.status === 410) stale.push(s.endpoint);
      } catch { /* ignore */ }
    }),
  );
  if (stale.length) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
  }
  return { sent };
}