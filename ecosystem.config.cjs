module.exports = {
    apps: [
      {
        name: "acdm",
        cwd: "D:/amrikchhauni.in",
  
        script: "node_modules/next/dist/bin/next",
        args: "start --port 3000",
  
        autorestart: true,
        restart_delay: 5000,
  
        max_memory_restart: "1G",
  
        env: {
          NODE_ENV: "production",
          PORT: 3000
        }
      }
    ]
  };
