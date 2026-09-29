// Secrets come from .env (dotenv/config).
// pm2 copies the environment of the shell that runs `pm2 start` into the app
// (filter_env does not stop it in pm2 6), and agent shells carry every API key.
// So clear it before pm2 reads it: the app gets only the env below and loads
// its secrets from its own env file (2026-09-29). Re-create with
//   pm2 delete legacy-rpg; pm2 start ecosystem.config.cjs && pm2 save
// A plain `pm2 restart legacy-rpg` keeps the clean env. Never --update-env.
for (const k of Object.keys(process.env)) if (!k.startsWith('PM2_')) delete process.env[k];
const HOME = '/home/petter';
const PATH = `${HOME}/.local/bin:${HOME}/.npm-global/bin:/usr/local/bin:/usr/bin:/bin`;
process.env.PATH = PATH; // pm2 looks up interpreters on the CLI's PATH
const BASE = { HOME, USER: 'petter', LOGNAME: 'petter', SHELL: '/usr/bin/zsh', LANG: 'en_US.UTF-8', PATH };

module.exports = {
  apps: [
    {
      name: 'legacy-rpg',
      script: 'server/index.js',
      cwd: '/home/petter/github/legacy-rpg',
      interpreter: 'node',
      env: {
        ...BASE,
        NODE_ENV: 'production',
        PORT: '3010',
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '256M',
    },
  ],
};
