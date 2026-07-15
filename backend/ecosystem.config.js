// PM2 process file for the Bukhari POS backend.
// Runs the compiled NestJS app (dist/main.js) and restarts it on crash / reboot.
//
// Usage on the EC2 box (from the backend/ directory):
//   npm ci
//   npx prisma generate
//   npx prisma migrate deploy
//   npm run build
//   pm2 start ecosystem.config.js
//   pm2 save            # persist across reboots
//   pm2 startup         # run the printed command once to enable boot startup
//
// Environment variables are read from backend/.env (loaded by @nestjs/config),
// so you do NOT need to duplicate them here.

module.exports = {
  apps: [
    {
      name: 'bukhari-pos-api',
      // nest build emits to dist/src/main.js (prisma seed files shift the out root)
      script: 'dist/src/main.js',
      cwd: __dirname,
      instances: 1, // single instance: keeps websockets + local uploads simple
      exec_mode: 'fork',
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      time: true,
    },
  ],
};
