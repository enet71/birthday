// Generates the VAPID key pair for birthday push notifications, in the base64url form `web-push` reads.
// - VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY go to the API's environment (/opt/birthdly/.env, apps/api/.env).
// - The public key also goes to `vapidPublicKey` in the web app's Environment (apps/web/src/app/app.config.ts).
// Generate the pair once: a new pair invalidates every existing browser subscription, so users have to turn
// notifications on again in Settings, which replaces the browser's old subscription.
const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const privateKey = await crypto.subtle.exportKey('jwk', keys.privateKey);
const rawPublicKey = Buffer.from(await crypto.subtle.exportKey('raw', keys.publicKey));

console.log(`VAPID_PUBLIC_KEY=${rawPublicKey.toString('base64url')}`);
// The JWK `d` member is the private scalar, already base64url.
console.log(`VAPID_PRIVATE_KEY=${privateKey.d}`);
