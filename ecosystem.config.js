module.exports = {
  apps: [{
    name: "signal",
    script: "server.ts",
    interpreter: "npx",
    interpreter_args: "tsx",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      SESSION_SECRET: process.env.SESSION_SECRET,
    },
    max_memory_restart: "500M",
    error_file: "/var/log/signal/error.log",
    out_file: "/var/log/signal/output.log",
    log_file: "/var/log/signal/combined.log",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    kill_timeout: 10000,
    wait_ready: true,
    listen_timeout: 15000,
  }]
};