// Generates the VAPID key pair for birthday push notifications.
// - VAPID_KEYS goes to the Edge Function secrets (`supabase secrets set`); it is the JWK pair that
//   `importVapidKeys()` of `jsr:@negrel/webpush` reads.
// - The application server key is public and goes to `vapidPublicKey` in the web app's Environment.
// Generate the pair once: a new pair invalidates every existing browser subscription.
const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey);
const privateKey = await crypto.subtle.exportKey('jwk', keys.privateKey);
const rawPublicKey = Buffer.from(await crypto.subtle.exportKey('raw', keys.publicKey));

console.log(`VAPID_KEYS='${JSON.stringify({ publicKey, privateKey })}'`);
console.log(`vapidPublicKey: '${rawPublicKey.toString('base64url')}'`);
