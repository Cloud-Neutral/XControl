use proxy_wasm::traits::*;
use proxy_wasm::types::*;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Copy)]
struct Config {
    limit: u32,
    window: Option<u64>, // seconds; None means unlimited
}

impl Default for Config {
    fn default() -> Self {
        Self {
            limit: 200,
            window: Some(86_400),
        }
    }
}

struct AskaiLimiter {
    config: Config,
}

struct AskaiLimiterRoot {
    config: Config,
}

impl Context for AskaiLimiter {}

impl HttpContext for AskaiLimiter {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let key = match self.config.window {
            Some(window) => format!("askai:{}", now / window),
            None => "askai:total".to_string(),
        };

        let (data, _cas) = self.get_shared_data(&key);
        let mut count = data
            .and_then(|d| String::from_utf8(d).ok())
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(0);

        if count >= self.config.limit {
            self.send_http_response(
                429,
                vec![("Content-Type", "application/json")],
                Some(b"{\"error\":\"API limit reached\"}"),
            );
            return Action::Pause;
        }

        count += 1;
        let _ = self.set_shared_data(&key, Some(count.to_string().as_bytes()), None);
        Action::Continue
    }
}

impl Context for AskaiLimiterRoot {}

impl RootContext for AskaiLimiterRoot {
    fn on_configure(&mut self, _size: usize) -> bool {
        if let Some(config_bytes) = self.get_plugin_configuration() {
            if let Ok(text) = String::from_utf8(config_bytes) {
                self.config = parse_config(&text, self.config);
            }
        }
        true
    }

    fn create_http_context(&self, _context_id: u32) -> Option<Box<dyn HttpContext>> {
        Some(Box::new(AskaiLimiter { config: self.config }))
    }
}

fn parse_config(text: &str, mut cfg: Config) -> Config {
    for part in text.split(',') {
        let mut kv = part.splitn(2, '=');
        let key = kv.next().unwrap_or("").trim();
        let val = kv.next().unwrap_or("").trim();
        match key {
            "limit" => {
                if let Ok(v) = val.parse::<u32>() {
                    cfg.limit = v;
                }
            }
            "window" | "period" => {
                if let Ok(v) = val.parse::<u64>() {
                    cfg.window = Some(v);
                }
            }
            _ => {}
        }
    }
    cfg
}

proxy_wasm::main! {{
    proxy_wasm::set_root_context(|_| Box::new(AskaiLimiterRoot {
        config: Config::default(),
    }));
}}
