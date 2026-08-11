# Fame Meet production deployment

Pushes to `master` build and deploy the web frontend to `meet.famenetworks.net`.
The deployer backs up the current frontend, keeps the latest five backups, tests
Nginx, performs an HTTPS health check, and rolls back if deployment fails.
The production workflow runs Webpack compilations sequentially to keep peak
memory within the production VM's available RAM and swap.

## One-time server setup

From the repository on the production server:

```sh
cd /home/fameit/famex-jitsi-meet
git pull --ff-only
sudo deployment/install-server-deployer.sh
```

## GitHub self-hosted runner

Install a repository-level GitHub Actions runner on the production server as
the `fameit` user. Give it the additional label `production`, and install it as
a service so it reconnects after reboot. The runner only needs outbound HTTPS;
no inbound SSH port or deployment secrets are required.

Create the repository variable `PRODUCTION_AUTO_DEPLOY` with value `true` only
after the server deployer and runner service are ready. Until then, pushes skip
the deployment job safely.

The workflow can also be started manually from the Actions page.
