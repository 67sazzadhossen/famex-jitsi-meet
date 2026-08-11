# Fame Meet production deployment

Pushes to `master` build and deploy the web frontend to `meet.famenetworks.net`.
The deployer backs up the current frontend, keeps the latest five backups, tests
Nginx, performs an HTTPS health check, and rolls back if deployment fails.

## One-time server setup

From the repository on the production server:

```sh
cd /home/fameit/famex-jitsi-meet
git pull --ff-only
sudo deployment/install-server-deployer.sh
```

## GitHub production secrets

Create a `production` environment and add:

- `SSH_HOST`: the production server hostname or IP.
- `SSH_PRIVATE_KEY`: a dedicated deployment private key.
- `SSH_HOST_KEY`: the complete pinned `known_hosts` line for the server.

Create the repository variable `PRODUCTION_AUTO_DEPLOY` with value `true` only
after the server installer and all three secrets are ready. Until then, pushes
skip the deployment job safely.

Generate the host-key value from a trusted machine and verify its fingerprint
against the server before saving it. Do not use `StrictHostKeyChecking=no`.

The workflow can also be started manually from the Actions page.
