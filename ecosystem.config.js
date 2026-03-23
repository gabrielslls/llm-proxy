module.exports = {
  apps: [{
    name: 'llm-proxy',
    script: 'npm start',
    interpreter: 'none',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
