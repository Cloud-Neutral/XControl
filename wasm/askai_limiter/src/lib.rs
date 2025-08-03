use proxy_wasm::traits::*;
use proxy_wasm::types::*;
use std::time::{SystemTime, UNIX_EPOCH};

struct AskaiLimiter;

impl Context for AskaiLimiter {}

impl HttpContext for AskaiLimiter {
    fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
        // Use the day since UNIX epoch as the key
        let today = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
            / 86_400;
        let key = format!("askai:{}", today);

        // Read the current count from shared data
        let (data, _cas) = self.get_shared_data(&key);
        let mut count = data
            .and_then(|d| String::from_utf8(d).ok())
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(0);

        if count >= 200 {
            self.send_http_response(
                429,
                vec![("Content-Type", "application/json")],
                Some(b"{\"error\":\"API daily limit reached\"}"),
            );
            return Action::Pause;
        }

        // Increment and store the updated count
        count += 1;
        let _ = self.set_shared_data(&key, Some(count.to_string().as_bytes()), None);
        Action::Continue
    }
}

impl RootContext for AskaiLimiter {
    fn on_configure(&mut self, _configuration_size: usize) -> bool {
        true
    }

    fn create_http_context(&self, _context_id: u32) -> Option<Box<dyn HttpContext>> {
        Some(Box::new(AskaiLimiter))
    }
}

proxy_wasm::main! {{
    proxy_wasm::set_http_context(|_, _| Box::new(AskaiLimiter));
}}
