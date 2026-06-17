module.exports = {
    apps: [
        {
            name: "acdm",
            script: "node_modules/next/dist/bin/next",
            args: "start",
            cwd: "D:/amrikchhauni.in",
            env: {
                NODE_ENV: "production",
                PORT: 3000
            }
        }
    ]
};
;