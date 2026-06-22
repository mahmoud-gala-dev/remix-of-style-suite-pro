// Minimal AWS SigV4 signer for S3 REST API calls from Cloudflare Workers.
// Uses Web Crypto only — no Node-only deps. Supports PUT/GET/DELETE/HEAD with
// optional body (Uint8Array) and query parameters.

const enc = new TextEncoder();

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const buf = typeof data === "string" ? enc.encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf as BufferSource);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function uriEncode(s: string, encodeSlash = true): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%2F/g, encodeSlash ? "%2F" : "/");
}

export interface SignS3Opts {
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  region: string;
  bucket: string;
  key: string; // object key, no leading slash
  body?: Uint8Array;
  query?: Record<string, string>;
  accessKeyId: string;
  secretAccessKey: string;
  extraHeaders?: Record<string, string>;
}

export async function signedS3Fetch(opts: SignS3Opts): Promise<Response> {
  const host = `${opts.bucket}.s3.${opts.region}.amazonaws.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);

  const body = opts.body ?? new Uint8Array();
  const payloadHash = await sha256Hex(body);

  const canonicalUri = "/" + opts.key.split("/").map((p) => uriEncode(p, false)).join("/");
  const qEntries = Object.entries(opts.query ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const canonicalQuery = qEntries.map(([k, v]) => `${uriEncode(k)}=${uriEncode(v)}`).join("&");

  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(opts.extraHeaders ?? {}),
  };
  const headerKeys = Object.keys(headers).map((k) => k.toLowerCase()).sort();
  const canonicalHeaders = headerKeys.map((k) => `${k}:${String(headers[Object.keys(headers).find((h) => h.toLowerCase() === k)!]).trim()}\n`).join("");
  const signedHeaders = headerKeys.join(";");

  const canonicalRequest = [
    opts.method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${opts.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(enc.encode("AWS4" + opts.secretAccessKey), dateStamp);
  const kRegion = await hmac(kDate, opts.region);
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = toHex(await hmac(kSigning, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${opts.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${host}${canonicalUri}${canonicalQuery ? "?" + canonicalQuery : ""}`;
  return fetch(url, {
    method: opts.method,
    headers: { ...headers, Authorization: authHeader },
    body: opts.method === "PUT" ? (body as BodyInit) : undefined,
  });
}