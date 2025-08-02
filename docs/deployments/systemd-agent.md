# Systemd Agent Deployment

For single-node setup with systemd.

工具支持

工具/机制       用途
grpcurl 采集 代理节点 流量
embed.FS        嵌入 Vue 前端页面至 Go 二进制
x25519  Reality 公钥/私钥生成
docker-compose  本地开发部署
helm    K8s 生产部署（节点 + PG + 控制器

## Nginx 配置

以下示例展示了在 `cn-homepage.svc.plus` 上提供静态首页以及在 `artifact.svc.plus` 上提供下载服务的参考 Nginx 配置：

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

  # 6. 隐藏 . 文件（如 .DS_Store）
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

