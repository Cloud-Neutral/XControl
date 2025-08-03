# Askai Limiter Proxy-Wasm Module

This module provides a simple API rate limiter for Nginx using the experimental
`ngx_http_wasm_module` and the [proxy-wasm-rust-sdk](https://github.com/proxy-wasm/proxy-wasm-rust-sdk).
It supports two counting modes:

- **Rolling** – requests are counted within a sliding time window. The default
  configuration limits to **200** requests every **24** hours.
- **Unlimited** – a fixed quota that never resets until the limit is exhausted.

### Configuration

The module accepts a simple comma‑separated configuration string when loaded:

```
limit=200,window=86400
```

- `limit` – maximum allowed requests.
- `window` – (optional) duration of the rolling window in seconds. Omit this
  field to enable the unlimited mode.

Examples:

- `limit=1000` – unlimited counting with a quota of 1000 total requests.
- `limit=1400,window=604800` – 1400 requests allowed every 7 days (168 hours).

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

Requests exceeding the configured quota will return HTTP 429 with the body
`{"error":"API limit reached"}`.
