
#!/bin/bash
cd /home/ec2-user/myapp

pm2 restart all || pm2 start server.js
