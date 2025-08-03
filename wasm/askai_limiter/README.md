# Askai Limiter Proxy-Wasm Module

This module provides a simple API rate limiter for Nginx using the experimental
`ngx_http_wasm_module` and the [proxy-wasm-rust-sdk](https://github.com/proxy-wasm/proxy-wasm-rust-sdk).
It enforces a global daily limit of **200** requests per API endpoint.

## Build

```bash
rustup target add wasm32-wasip1
cargo build --release --target wasm32-wasip1
```

The compiled module will be located at
`target/wasm32-wasip1/release/askai_limiter.wasm`.

## Nginx Configuration

Example snippet that loads the compiled module and applies it to the
`/api/askai` route:

```nginx
load_module modules/ngx_http_wasm_module.so;

http {
    wasm {
        module limiter /etc/nginx/wasm/askai_limiter.wasm;
    }

    server {
        listen 443 ssl;
        server_name cn-homepage.svc.plus;

        ssl_certificate /etc/ssl/svc.plus.pem;
        ssl_certificate_key /etc/ssl/svc.plus.rsa.key;

        location /api/askai {
            wasm_call limiter;
            proxy_pass http://127.0.0.1:8080/api/askai;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

Requests beyond the first 200 in a single day will return HTTP 429 with the
body `{"error":"API daily limit reached"}`.
