# 新机安装（typed-decisions）

装完插件不等于开箱即用：还有三步配置。全部完成后，决策与看板都可用。

## 1. 安装插件

```bash
openclaw plugins install clawhub:@psxxo/typed-decisions
```

安装后若提示 `record-missing`，把插件加入允许列表再启用：

```bash
openclaw plugins enable typed-decisions
```

## 2. 安装宿主指标端点（看板数据源）

```bash
bash <插件安装目录>/scripts/install-sysmetrics.sh
```

脚本会生成自签证书、写入 `sysmetrics.service`、`enable --now`，最后 curl 校验返回 200。

验证：

```bash
systemctl --user is-active sysmetrics.service
curl -sk -o /dev/null -w '%{http_code}\n' https://127.0.0.1:18575/metrics.json   # 期望 200
```

未装的表现：看板头部显示「网关断开 · 重连中」，参数区有值、指标区空，不报错。

## 3. 配置决策接入

两个值来自你自己的服务，本包不含任何密钥：

| 配置项 | 说明 |
|---|---|
| `endpoint` | System One 主机（裸主机名或 origin），必填 |
| `keyFile` 或 `credential` | 凭证。推荐 `keyFile`，默认 `~/.openclaw/.secrets/decision-model.key` |

凭证文件权限必须是 0600：

```bash
mkdir -p ~/.openclaw/.secrets && chmod 700 ~/.openclaw/.secrets
printf '%s' '<YOUR_CREDENTIAL>' > ~/.openclaw/.secrets/decision-model.key
chmod 600 ~/.openclaw/.secrets/decision-model.key
```

配置示例（把 `<SYSTEM_ONE_HOST>` 换成实际主机，不要写真实凭证到配置里）：

```json
{
  "plugins": {
    "entries": {
      "typed-decisions": {
        "config": { "endpoint": "<SYSTEM_ONE_HOST>" }
      }
    }
  }
}
```

验证：会话里调用 `typed_decide`，返回带概率分布的 `choice` / `score` / `boolean` 即为通。
返回 `credentials-unavailable` 说明 `endpoint` 或凭证缺失。

## 4. 按需开启（默认关闭）

| 能力 | 开启条件 |
|---|---|
| 决策介入提示 | `hooks.allowConversationAccess`（宿主权限） |
| 自动挂看板提醒 | `sysStatus.widgetPath` 或 `sysStatus.netOrigins` 提供数据源 |
| 归档自动摘看板 | `hooks/board-archive-unpin` 随包安装，无需配置 |

## 验收清单

- [ ] `openclaw plugins list` 里 `typed-decisions` 为 enabled
- [ ] `curl` 端点返回 200
- [ ] `typed_decide` 返回结构化结果
- [ ] 看板显示指标与参数，头部无「网关断开」

## 安全约定

- 包内不含任何凭证；仓库、文档、示例一律使用占位符。
- 不要把真实凭证写进 `openclaw.json`、README 或提交记录。
- 凭证文件固定 `0600`，目录 `0700`。
