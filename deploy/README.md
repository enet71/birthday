# Production server

The API runs on a DigitalOcean droplet behind Cloudflare. The web app still runs on DO App Platform; it moves here in
a later step, and then the API is served from `birthdly.com/api`.

```
visitor ──HTTPS──► Cloudflare (proxy) ──HTTPS, Origin CA──► droplet :443 Caddy ──► api:3000 (NestJS)
                                                                                     └──► Supabase Postgres (session pooler, TLS)
```

| What       | Where                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------- |
| Droplet    | `birthdly-1`, LON1 (next to Supabase `eu-west-1`), `s-1vcpu-2gb`, Ubuntu 24.04                     |
| Firewall   | DO Cloud Firewall `birthdly-web`: SSH from anywhere, 443 only from Cloudflare                      |
| Files      | `/opt/birthdly`: `compose.yml`, `Caddyfile`, `deploy.sh`, `api.tag`, `previous/`, `.env`, `certs/` |
| Users      | `ops` (developer, sudo), `deploy` (CI; runs Docker, so root-equivalent); no root or password login |
| Image      | `ghcr.io/enet71/birthday-api:<commit SHA>`                                                         |
| Deployment | `.github/workflows/deploy-api.yml`, after CI passes on `main`, or run by hand                      |

## Deployments

`Deploy API` runs after every green CI run on `main`. It deploys only when the API or `deploy/` changed since the
commit in `/opt/birthdly/api.tag`, and never a commit older than the deployed one (CI runs can finish out of order).
It builds and pushes the image, uploads `compose.yml`, `Caddyfile` and `deploy.sh` to `/opt/birthdly/incoming` and
runs the uploaded `deploy.sh <sha>`. The script installs the files, waits until the API is healthy, and otherwise
returns to the image and files that ran before. A smoke test through Cloudflare follows; when it fails, the workflow
runs `deploy.sh --rollback`, unless it redeployed the commit that was already running.

Rollbacks restore both the image and the configuration files, and use images already on the server: the running and
the previous deployment's images are kept, so a rollback does not depend on the registry.

The deploy key is root-equivalent on the server. The workflow writes it to the runner only inside the steps that use
SSH and removes it before dependencies or build tools run (`.github/scripts/ssh-key.sh`).

To deploy a specific commit, or the same one again: Actions → Deploy API → Run workflow (`force` skips the change and
order checks).

## Operations

```bash
ssh ops@<droplet IP>
cd /opt/birthdly                                                    # ops is in the deploy group

cat api.tag previous/api.tag                                        # deployed and previous commits
sudo -u deploy API_TAG="$(cat api.tag)" docker compose ps
sudo -u deploy API_TAG="$(cat api.tag)" docker compose logs -f api  # JSON logs; `clientIp` is the visitor
sudo -u deploy sh deploy.sh --rollback                              # back to the previous image and files; again to undo
sudo sshd -T | grep -Ei 'passwordauth|permitroot|kbdinter'         # all three must be "no"
```

Every container keeps at most 5 × 10 MB of logs. A deployment removes API images other than the running and the
previous one.

**Cloudflare IP ranges** (https://www.cloudflare.com/ips) are listed in the `Caddyfile` and in the firewall. When
Cloudflare changes them, update both: the `Caddyfile` through a commit, the firewall with
`doctl compute firewall update` (see step 3).

**More memory or CPU:** `doctl compute droplet-action resize <id> --size <slug> --wait` (powers the droplet off for
about a minute; without `--resize-disk` it can be sized down again).

## Setting up from scratch

Commands run from the repository root in Git Bash, with `doctl` and `gh` signed in.

### 1. Keys

```bash
# The CI deploy key; the private half goes to GitHub only.
ssh-keygen -t ed25519 -N '' -C 'birthdly-deploy@github-actions' -f ~/.ssh/birthdly_deploy

# DigitalOcean sets a root password for a droplet created without a key; root login is off anyway (cloud-init).
doctl compute ssh-key import birthdly-admin --public-key-file ~/.ssh/id_ed25519.pub
```

### 2. Droplet

```bash
ADMIN_SSH_KEY="$(cat ~/.ssh/id_ed25519.pub)" DEPLOY_SSH_KEY="$(cat ~/.ssh/birthdly_deploy.pub)" \
  envsubst '${ADMIN_SSH_KEY} ${DEPLOY_SSH_KEY}' < deploy/cloud-init.yaml | tr -d '\r' > /tmp/cloud-init.yaml
ADMIN_KEY_ID="$(doctl compute ssh-key list --format Name,ID --no-header | awk '$1 == "birthdly-admin" { print $2 }')"

doctl compute droplet create birthdly-1 --region lon1 --size s-1vcpu-2gb --image ubuntu-24-04-x64 \
  --enable-monitoring --tag-name birthdly --ssh-keys "$ADMIN_KEY_ID" \
  --user-data-file /tmp/cloud-init.yaml --wait
```

`cloud-init` creates the users, installs Docker, fail2ban and automatic security updates, adds 2 GB of swap and turns
off root and password login. It takes a few minutes after the droplet is up; wait about 5 minutes before the first
`ssh ops@<IP> cloud-init status --wait`. Logins that fail because `ops` does not exist yet count for fail2ban,
which then blocks your IP for 10 minutes.

### 3. Firewall

```bash
CF_IPS="$(curl -s https://www.cloudflare.com/ips-v4; echo; curl -s https://www.cloudflare.com/ips-v6)"
HTTPS_SOURCES="$(printf 'address:%s,' $CF_IPS | sed 's/,$//')"

doctl compute firewall create --name birthdly-web --tag-names birthdly \
  --inbound-rules "protocol:tcp,ports:22,address:0.0.0.0/0,address:::/0 protocol:tcp,ports:443,$HTTPS_SOURCES" \
  --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0,address:::/0 protocol:udp,ports:all,address:0.0.0.0/0,address:::/0 protocol:icmp,address:0.0.0.0/0,address:::/0"
```

### 4. Cloudflare (dashboard, zone `birthdly.com`)

1. **DNS → Records:** `A api <droplet IP>`, Proxied (orange cloud).
2. **SSL/TLS → Origin Server → Create certificate:** RSA or ECC, hostnames `birthdly.com, *.birthdly.com`, 15 years.
   Save the certificate as `origin.pem` and the key as `origin-key.pem`; Cloudflare shows the key only once.
3. **Rules → Configuration Rules → Create:** when Hostname equals `api.birthdly.com`, set SSL to **Full (strict)**.
   The rule keeps the zone's SSL mode for the App Platform site unchanged.

### 5. Server files

```bash
# Supabase Dashboard → Project Settings → Database → SSL Configuration → Download certificate.
scp origin.pem origin-key.pem supabase-ca.crt ops@<IP>:/tmp/
ssh ops@<IP> 'sudo install -o deploy -g deploy -m 640 /tmp/origin.pem /tmp/origin-key.pem /opt/birthdly/certs/ && sudo install -o deploy -g deploy -m 644 /tmp/supabase-ca.crt /opt/birthdly/certs/ && rm /tmp/origin*.pem /tmp/supabase-ca.crt'

# Fill in deploy/.env.example (the pooler URL with the database password) on the server itself.
ssh -t ops@<IP> 'sudo -u deploy nano /opt/birthdly/.env && sudo chmod 600 /opt/birthdly/.env'
```

Compose interpolates `$` in `.env`, so write a `$` in the password as `$$`.

### 6. GitHub

```bash
gh api -X PUT repos/enet71/birthday/environments/production > /dev/null
gh secret set DEPLOY_HOST --env production --body '<droplet IP>'
gh secret set DEPLOY_SSH_KEY --env production < ~/.ssh/birthdly_deploy
ssh-keyscan -t ed25519 <droplet IP> | gh secret set DEPLOY_KNOWN_HOSTS --env production
```

Compare the `ssh-keyscan` fingerprint with the one `ssh ops@<IP>` showed on the first connection.

### 7. First deployment

Actions → Deploy API → Run workflow. Then check `https://api.birthdly.com/api/health` (200) and
`https://api.birthdly.com/api/me` (401 without a token). Requests to `https://<droplet IP>` must time out.

The package `birthday-api` may stay private: the server pulls with the workflow's token, and rollbacks use local
images.
