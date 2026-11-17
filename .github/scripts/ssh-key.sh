#!/usr/bin/env bash
# Puts the deploy key on the runner for one workflow step and removes it again.
#   ssh-key.sh install   writes the key, known_hosts and an SSH config with the host alias `server`
#   ssh-key.sh remove    deletes the key
# Reads DEPLOY_HOST, DEPLOY_SSH_KEY and DEPLOY_KNOWN_HOSTS from the environment.
set -euo pipefail

case "${1:-}" in
  install)
    install -m 700 -d ~/.ssh
    (umask 077 && printf '%s\n' "$DEPLOY_SSH_KEY" > ~/.ssh/deploy_key)
    printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > ~/.ssh/known_hosts
    printf 'Host server\n  HostName %s\n  User deploy\n  IdentityFile ~/.ssh/deploy_key\n  IdentitiesOnly yes\n' "$DEPLOY_HOST" > ~/.ssh/config
    ;;
  remove)
    rm -f ~/.ssh/deploy_key
    ;;
  *)
    echo "Usage: ssh-key.sh install | remove" >&2
    exit 1
    ;;
esac
