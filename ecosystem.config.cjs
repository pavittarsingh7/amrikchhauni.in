module.exports = {
    apps: [
      {
        name: "acdm",
        cwd: "D:/amrikchhauni.in",
  
        script: ".next/standalone/server.js",
  
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