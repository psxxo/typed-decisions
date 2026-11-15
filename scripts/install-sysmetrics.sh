#!/usr/bin/env bash
# 安装 sysmetrics：宿主机指标端点（看板 sys-status 的数据源）
# 用法：bash scripts/install-sysmetrics.sh
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="${HOME}/.config/sysmetrics"
UNIT_DIR="${HOME}/.config/systemd/user"

mkdir -p "${CERT_DIR}" "${UNIT_DIR}"

if [ ! -f "${CERT_DIR}/cert.pem" ] || [ ! -f "${CERT_DIR}/key.pem" ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
    -keyout "${CERT_DIR}/key.pem" -out "${CERT_DIR}/cert.pem" \
    -subj "/CN=127.0.0.1" >/dev/null 2>&1
  chmod 600 "${CERT_DIR}/key.pem"
  echo "已生成自签证书：${CERT_DIR}"
fi

cat > "${UNIT_DIR}/sysmetrics.service" <<UNIT
[Unit]
Description=sysmetrics (host metrics for sys-status board)
After=network.target

[Service]
ExecStart=$(command -v node) ${PLUGIN_DIR}/sysmetrics/sysmetrics.mjs
Environment=HOME=${HOME}
Restart=on-failure

[Install]
WantedBy=default.target
UNIT

systemctl --user daemon-reload
systemctl --user enable --now sysmetrics.service
sleep 1
code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 5 https://127.0.0.1:18575/metrics.json || true)
echo "sysmetrics: http ${code}"
if [ "${code}" != "200" ]; then
  echo "端点未返回 200，检查：journalctl --user -u sysmetrics -n 50" >&2
  exit 1
fi
