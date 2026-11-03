export function requireEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`The ${name} secret is not set`);
  }

  return value;
}
