# Docker Compose

Guide for local development setup.

## Nginx 配置

在 `cn-homepage.svc.plus` 和 `artifact.svc.plus` 之间部署静态站点与下载服务时，可使用如下 Nginx 配置：

```nginx
# 1. HTTP 自动跳转到 HTTPS
server {
  listen 80;
  server_name cn-homepage.svc.plus;
  return 301 https://cn-homepage.svc.plus$request_uri;
}

# 2. HTTPS 静态站部署 svc.plus
server {
  listen 443 ssl http2;
  server_name cn-homepage.svc.plus;

  ssl_certificate /etc/ssl/svc.plus.pem;
  ssl_certificate_key /etc/ssl/svc.plus.rsa.key;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  # 3. 指向静态构建输出目录
  root /var/www/XControl/ui/homepage/out;
  index index.html;

  # 4. 页面访问（含 SPA fallback）
  location / {
    try_files $uri $uri/ /index.html;
  }

   # 5. 静态资源缓存优化
   location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?)$ {
     expires 30d;
     access_log off;
     add_header Cache-Control "public";
   }

   # 6. 转发后端 API
   location /api/ {
     proxy_pass http://127.0.0.1:8080/api/;
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
   }

   # 7. 隐藏 . 文件（如 .DS_Store）
   location ~ /\. {
     deny all;
   }
}

# 7. HTTPS 独立下载服务 artifact.svc.plus
server {
  listen 443 ssl http2;
  server_name artifact.svc.plus;

  # SSL 配置
  ssl_certificate /etc/ssl/svc.plus.pem;
  ssl_certificate_key /etc/ssl/svc.plus.rsa.key;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  # 映射统一目录
  root /data/update-server;
  index index.html;

  # 显示目录索引，方便预览或手动下载
  autoindex on;
  autoindex_exact_size off;
  autoindex_localtime on;

  # 允许所有子路径访问（包括你预留的）
  location / {
    add_header Accept-Ranges bytes;
    try_files $uri $uri/ =404;
  }

  # 静态构建产物缓存优化
  location ~* \.(dmg|zip|tar\.gz|deb|rpm|exe|pkg|AppImage|apk|ipa)$ {
    expires 7d;
    access_log off;
    add_header Cache-Control "public";
    add_header Accept-Ranges bytes;
    try_files $uri =404;
  }

  # 隐藏 . 文件
  location ~ /\. {
    deny all;
  }
}
```
