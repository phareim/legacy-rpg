module.exports = {
  apps: [
    {
      name: 'legacy-rpg',
      script: 'server/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: '3010',
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '256M',
    },
  ],
};
