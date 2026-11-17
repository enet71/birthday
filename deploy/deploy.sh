#!/usr/bin/env sh
# Runs on the droplet as the `deploy` user. The workflow uploads compose.yml, Caddyfile and this script to
# /opt/birthdly/incoming and runs the uploaded copy.
#   deploy.sh COMMIT=<sha> [API_TAG=<tag>] [WEB_TAG=<tag>]
#                        installs the uploaded files and starts the release: the given image tags, the others as they
#                        run now. Returns to the running release when it does not become healthy.
#   deploy.sh --rollback returns to the release deployed before the current one
#
# /opt/birthdly: compose.yml, Caddyfile, release.env   what runs now (release.env: COMMIT, API_TAG, WEB_TAG)
#                previous/                             what ran before it, for --rollback
#                incoming/                             an upload that is not installed yet
#                .env, certs/                          secrets, never touched here
set -eu

APP_DIR="${APP_DIR:-/opt/birthdly}"
export API_IMAGE="${API_IMAGE:-ghcr.io/enet71/birthday-api}"
export WEB_IMAGE="${WEB_IMAGE:-ghcr.io/enet71/birthday-web}"
HEALTH_TIMEOUT_SECONDS=120
RELEASE_KEYS="COMMIT API_TAG WEB_TAG"

cd "$APP_DIR"

# Prints the value of $1 in the release file $2, or nothing.
release_value() {
  sed -n "s/^$1=//p" "$2" 2>/dev/null | tail -n 1
}

# Makes the tags of the release file $1 the ones `docker compose` uses.
use_release() {
  API_TAG="$(release_value API_TAG "$1")"
  WEB_TAG="$(release_value WEB_TAG "$1")"
  export API_TAG WEB_TAG
}

# Copies the running configuration and release into $1. This script is not part of a release: a rollback keeps the
# newest one, which also handles older releases.
snapshot() {
  rm -rf "$1" && mkdir -p "$1"
  for file in compose.yml Caddyfile release.env; do
    if [ -f "$file" ]; then cp "$file" "$1/"; fi
  done
}

# Puts the configuration of $1 in place.
install_config() {
  # The Caddyfile is bind-mounted as a file, which follows its inode, so it is overwritten in place.
  cp "$1/compose.yml" compose.yml || return 1
  cp "$1/Caddyfile" Caddyfile || return 1
}

# Puts an upload in place, including a new copy of this script.
install_upload() {
  install_config "$1" || return 1
  # This script may be the one running, and the shell reads it while running, so it is replaced with a new file.
  cp "$1/deploy.sh" deploy.sh.new && mv deploy.sh.new deploy.sh || return 1
}

# Starts the release of the file $1 with the installed files and waits until it is healthy. Every step returns on
# failure explicitly: `set -e` does not apply inside an `if` condition.
start() {
  use_release "$1"
  # A release from before a service existed has no tag for it; its compose.yml has no such service either.
  # compose.yml itself rejects a missing tag of a service it defines.
  services="$(docker compose config --services 2> /dev/null)" || services=""
  # Images of earlier releases stay on the server, so a rollback does not depend on the registry.
  for service_image in "api $API_IMAGE:$API_TAG" "web $WEB_IMAGE:$WEB_TAG"; do
    service="${service_image%% *}"
    if printf '%s\n' "$services" | grep -qx "$service" && ! docker image inspect "${service_image#* }" > /dev/null 2>&1; then
      docker compose pull --quiet "$service" || return 1
    fi
  done
  docker compose run --rm --no-deps --entrypoint caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile > /dev/null || return 1
  # Only containers whose image or configuration changed are recreated.
  docker compose up --detach --remove-orphans --wait --wait-timeout "$HEALTH_TIMEOUT_SECONDS" || return 1
  # `up` keeps Caddy running when only the mounted Caddyfile changed.
  docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || return 1
  # The health check only reads a static file; the home page proves that server-side rendering works.
  if printf '%s\n' "$services" | grep -qx web; then
    docker compose exec web wget -q -O /dev/null --header 'Host: birthdly.com' http://127.0.0.1:4000/ || {
      echo "The web app does not render its home page." >&2
      return 1
    }
  fi
}

# Starts the files and release saved in $1 again.
restore() {
  if [ ! -f "$1/release.env" ]; then
    echo "There is nothing to return to." >&2
    return 1
  fi
  echo "Returning to $(release_value COMMIT "$1/release.env")" >&2
  install_config "$1" || return 1
  start "$1/release.env" || return 1
  cp "$1/release.env" release.env || return 1
}

# Keeps the images of the running and the previous release and removes the other ones.
prune_images() {
  keep="$(cat release.env previous/release.env 2>/dev/null | sed -nE 's/^(API|WEB)_TAG=//p')"
  for image in "$API_IMAGE" "$WEB_IMAGE"; do
    docker image ls "$image" --format '{{.Tag}}' | while read -r image_tag; do
      if ! printf '%s\n' "$keep" | grep -qx "$image_tag"; then
        docker image rm "$image:$image_tag" > /dev/null 2>&1 || true
      fi
    done
  done
  docker image prune --force > /dev/null
}

current_commit="$(release_value COMMIT release.env)"

if [ "${1:-}" = "--rollback" ]; then
  if [ ! -f previous/release.env ]; then
    echo "There is no previous release." >&2
    exit 1
  fi
  snapshot .running
  if ! restore previous; then
    echo "The previous release did not become healthy." >&2
    restore .running
    rm -rf .running
    exit 1
  fi
  # A second --rollback returns to the release that was just left.
  rm -rf previous && mv .running previous
  echo "Rolled back from $current_commit to $(release_value COMMIT release.env)"
  exit 0
fi

usage() {
  echo "Usage: deploy.sh COMMIT=<sha> [API_TAG=<tag>] [WEB_TAG=<tag>] | --rollback" >&2
  exit 1
}

# A mistyped argument must not silently redeploy the running release.
commit_given=false
for argument in "$@"; do
  case "$argument" in
    COMMIT=?*) commit_given=true ;;
    API_TAG=?* | WEB_TAG=?*) ;;
    *) usage ;;
  esac
  case "${argument#*=}" in
    *[!A-Za-z0-9._-]*)
      echo "Invalid value: $argument" >&2
      exit 1
      ;;
  esac
done
if [ "$commit_given" = "false" ]; then
  usage
fi

# The new release: the running one with the given values replaced.
: > release.env.new
for key in $RELEASE_KEYS; do
  value="$(release_value "$key" release.env)"
  for argument in "$@"; do
    case "$argument" in
      "$key="*) value="${argument#*=}" ;;
    esac
  done
  echo "$key=$value" >> release.env.new
done

echo "Deploying $(tr '\n' ' ' < release.env.new)(running: ${current_commit:-none})"

snapshot .running
if [ -d incoming ]; then
  install_upload incoming
fi

if start release.env.new; then
  # A redeployment of the running release keeps `previous` pointing at the release before it.
  if [ -f release.env ] && ! cmp -s release.env release.env.new; then
    rm -rf previous && mv .running previous
    # The workflow rolls back after a failed smoke test only when this line was printed.
    echo "Replaced the previous release"
  fi
  mv release.env.new release.env
  rm -rf .running incoming
  # The release is live; failing here would make the workflow skip its smoke test and rollback.
  prune_images || echo "Could not remove old images" >&2
  echo "Deployed $(release_value COMMIT release.env)"
  exit 0
fi

echo "The release did not become healthy. The last logs:" >&2
docker compose logs --tail 50 api web >&2 || true
rm -rf incoming release.env.new
if [ -f .running/release.env ]; then
  restore .running
fi
rm -rf .running
exit 1
