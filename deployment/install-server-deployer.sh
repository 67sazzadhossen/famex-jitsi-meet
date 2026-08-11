#!/usr/bin/env bash

set -Eeuo pipefail

[[ $EUID -eq 0 ]] || {
    echo "Run this installer with sudo" >&2
    exit 1
}

source_script=$(readlink -f "$(dirname "${BASH_SOURCE[0]}")/fame-meet-deploy")
[[ -f $source_script ]] || {
    echo "Cannot find fame-meet-deploy beside this installer" >&2
    exit 1
}

install -o root -g root -m 0755 "$source_script" /usr/local/sbin/fame-meet-deploy
install -d -o root -g root -m 0755 /var/lib/fame-meet-deploy/backups
install -d -o fameit -g fameit -m 0750 /home/fameit/fame-meet-deploy/incoming

cat > /etc/sudoers.d/fame-meet-deploy <<'EOF'
fameit ALL=(root) NOPASSWD: /usr/local/sbin/fame-meet-deploy
EOF
chmod 0440 /etc/sudoers.d/fame-meet-deploy
visudo -cf /etc/sudoers.d/fame-meet-deploy

echo "Server deployer installed successfully"
