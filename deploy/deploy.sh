#!/usr/bin/env sh
# Runs on the droplet as the `deploy` user. The workflow uploads compose.yml, Caddyfile and this script to
# /opt/birthdly/incoming and runs the uploaded copy.
#   deploy.sh <tag>      installs the uploaded files, starts ghcr.io/enet71/birthday-api:<tag>, and returns to the
#                        running image and files when it does not become healthy
#   deploy.sh --rollback returns to the image and files deployed before the current ones
#
# /opt/birthdly: compose.yml, Caddyfile, api.tag     what runs now
#                previous/                           what ran before it, for --rollback
#                incoming/                           an upload that is not installed yet
#                .env, certs/                        secrets, never touched here
set -eu

APP_DIR="${APP_DIR:-/opt/birthdly}"
export API_IMAGE="${API_IMAGE:-ghcr.io/enet71/birthday-api}"
HEALTH_TIMEOUT_SECONDS=120
CONFIG_FILES="compose.yml Caddyfile deploy.sh"

cd "$APP_DIR"

compose() {
  API_TAG="$tag" docker compose "$@"
}

read_tag() {
  cat "$1" 2>/dev/null || true
}

# Copies the running files and tag into $1.
snapshot() {
  rm -rf "$1" && mkdir -p "$1"
  for file in $CONFIG_FILES api.tag; do
    if [ -f "$file" ]; then cp "$file" "$1/"; fi
  done
}

# Puts the files of $1 in place.
install_files() {
  # The Caddyfile is bind-mounted as a file, which follows its inode, so it is overwritten in place.
  cp "$1/compose.yml" compose.yml || return 1
  cp "$1/Caddyfile" Caddyfile || return 1
  # This script may be the one running, and the shell reads it while running, so it is replaced with a new file.
  if [ -f "$1/deploy.sh" ]; then
    cp "$1/deploy.sh" deploy.sh.new && mv deploy.sh.new deploy.sh || return 1
  fi
}

# Starts $tag with the installed files and waits until it is healthy. Every step returns on failure explicitly:
# `set -e` does not apply inside an `if` condition.
start() {
  # Images of earlier deployments stay on the server, so a rollback does not depend on the registry.
  if ! docker image inspect "$API_IMAGE:$tag" > /dev/null 2>&1; then
    compose pull --quiet api || return 1
  fi
  compose run --rm --no-deps --entrypoint caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile > /dev/null || return 1
  compose up --detach --remove-orphans --wait --wait-timeout "$HEALTH_TIMEOUT_SECONDS" || return 1
  # `up` keeps Caddy running when only the mounted Caddyfile changed.
  compose exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || return 1
}

# Starts the image and files saved in $1 again.
restore() {
  tag="$(read_tag "$1/api.tag")"
  if [ -z "$tag" ]; then
    echo "There is nothing to return to." >&2
    return 1
  fi
  echo "Returning to $tag" >&2
  install_files "$1" || return 1
  start || return 1
  echo "$tag" > api.tag
}

# Keeps the images of the running and the previous deployment and removes the other ones.
prune_images() {
  keep_current="$(read_tag api.tag)"
  keep_previous="$(read_tag previous/api.tag)"
  docker image ls "$API_IMAGE" --format '{{.Tag}}' | while read -r image_tag; do
    if [ "$image_tag" != "$keep_current" ] && [ "$image_tag" != "$keep_previous" ]; then
      docker image rm "$API_IMAGE:$image_tag" > /dev/null 2>&1 || true
    fi
  done
  docker image prune --force > /dev/null
}

current_tag="$(read_tag api.tag)"

if [ "${1:-}" = "--rollback" ]; then
  if [ ! -f previous/api.tag ]; then
    echo "There is no previous deployment." >&2
    exit 1
  fi
  snapshot .running
  if ! restore previous; then
    echo "The previous deployment did not become healthy." >&2
    restore .running
    rm -rf .running
    exit 1
  fi
  # A second --rollback returns to the deployment that was just left.
  rm -rf previous && mv .running previous
  echo "Rolled back from $current_tag to $(read_tag api.tag)"
  exit 0
fi

tag="${1:?Usage: deploy.sh <tag> | --rollback}"
echo "Deploying $tag (running: ${current_tag:-none})"

snapshot .running
if [ -d incoming ]; then
  install_files incoming
fi

if start; then
  echo "$tag" > api.tag
  # A redeployment of the running tag keeps `previous` pointing at the deployment before it.
  if [ -n "$current_tag" ] && [ "$current_tag" != "$tag" ]; then
    rm -rf previous && mv .running previous
  fi
  rm -rf .running incoming
  prune_images
  echo "Deployed $tag"
  exit 0
fi

echo "$tag did not become healthy. Its last logs:" >&2
compose logs --tail 50 api >&2 || true
rm -rf incoming
if [ -n "$current_tag" ]; then
  restore .running
fi
rm -rf .running
exit 1
