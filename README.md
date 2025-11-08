# KOReader Proxy

用 Cloudflare Workers 代理 KOReader 维基百科查询、谷歌翻译。

> [!WARNING]
> Cloudflare 在 2024 年 12 月更新了 [服务条款](https://www.cloudflare.com/terms/)，明确禁止将 Workers 及其他服务用作代理。
> 
> 本项目有违反该条款的潜在风险，在部署前请认真考虑，后果自负。

## 快速开始

1. [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/tokenicrat/koreader-proxy)
  > 此按钮将 fork 本仓库并部署至您的 Cloudflare 账户。
2. 在刚刚部署的 Worker 设置中，添加 3 个自定义域名。
  > 不建议在域名中包含 `wikipedia` 字样，有被阻断的风险。
3. （可选）禁用默认的 `workers.dev` 域名。
4. 添加以下环境变量：
  - `WP_EN_DOMAIN`：对应英语维基百科的自定义域名
  - `WP_ZH_DOMAIN`：对应中文维基百科的自定义域名
  - `GT_DOMAIN`：对应谷歌翻译的自定义域名
  - `TOKEN`：访问路径 token（建议使用加密的 secret）

然后，修改 KOReader 配置：

- `/mnt/us/koreader/frontend/ui/wikipedia.lua`
- `/mnt/us/koreader/frontend/ui/translator.lua`

将其中 URL 替换为刚刚设置的自定义域名。

## 协议

The Unlicense
