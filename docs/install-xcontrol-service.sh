#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="xcontrol-server"
UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "[INFO] Installing systemd service: ${SERVICE_NAME}"

# 生成 systemd unit 文件
cat <<'EOF' | sudo tee ${UNIT_FILE} > /dev/null
[Unit]
Description=XControl Server (Qwen AI)
After=network.target

[Service]
User=root
Group=root
ExecStart=/usr/bin/xcontrol-server --config /etc/XControl/server-qwen-ai.yaml
WorkingDirectory=/etc/XControl
Restart=on-failure
RestartSec=5s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# 刷新 systemd 配置
echo "[INFO] Reloading systemd daemon..."
sudo systemctl daemon-reload

# 设置开机自启并立即启动
echo "[INFO] Enabling and starting ${SERVICE_NAME}..."
sudo systemctl enable --now ${SERVICE_NAME}

# 查看状态
echo "[INFO] Service status:"
sudo systemctl --no-pager --full status ${SERVICE_NAME}
