用法示例
# 必填：你的 Git 仓库 URL
GIT_URL="http://git.lan/ops/grafana-as-code.git" \
sudo -E bash install_tiny_monitor_server.sh


自定义后端为 Thanos/Cortex/Mimir Receiver：

GIT_URL="http://git.lan/ops/grafana-as-code.git" \
METRICS_BACKEND_KIND="receiver" \
METRICS_BACKEND_ADDR="10.10.0.60:19291" \
sudo -E bash install_tiny_monitor_server.sh


如需调整域名/证书：

GIT_URL="http://git.lan/ops/grafana-as-code.git" \
GRAFANA_DOMAIN="grafana.svc.plus" \
METRICS_DOMAIN="metrics.svc.plus" \
CERT_PEM="/etc/ssl/svc.plus.pem" \
CERT_KEY="/etc/ssl/svc.plus.rsa.key" \
sudo -E bash install_tiny_monitor_server.sh


你的“另一个脚本”负责把 dashboards/、provisioning/datasources/（如果需要）等内容推到仓库；本脚本只负责安装、克隆、反代与运行


这样配合你的安装脚本怎么用

在任意一台能访问 Git 的机器上执行（会要求你对 git.lan 认证）：

REMOTE="http://git.lan/ops/gitops.git" \
SUBDIR="grafana-as-code" \
MAKE_STAGE=1 \
bash init_grafana_gitops_repo.sh


在监控中心主机上直接用之前的安装脚本（不用改变量名）：

GIT_URL="http://git.lan/ops/gitops.git" \
sudo -E bash install_tiny_monitor_server.sh


因为仓库根下有 dashboards -> grafana-as-code/dashboards 的软链，安装脚本里固定的 Provisioning 路径 /srv/grafana/grafana-as-code/dashboards 会自动指向子目录内容，无需改动。
