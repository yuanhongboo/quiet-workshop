# 好好收拾

一个可以慢慢玩的 3D 清洁、整理与修复游戏。手机和电脑直接在浏览器里打开，不用注册。

## 季节

| 季节 | 主题 | 内容 | 状态 |
| --- | --- | --- | --- |
| 第一季 | 街角旧店 | 三章九关，恢复一家街角小店 | 0.3.1 已发布 |
| 第二季 | 雨后花房 | 三章九关，清洗、拼装与照料一座花房 | 0.4.0 已发布 |

两季可切换，每关自动保存；各季拥有独立收藏。重玩关卡不会丢失已获得的成果。第二季支持四面环看和近距离观察，点击清洁清单可定位部位和剩余污渍。

[开始第二季](https://yuanhongboo.github.io/orbit-breaker/quiet-workshop/v0.4.0/?season=rain-garden) · [验证记录](qa/season-two-v0.4.0/REPORT.md)

## 开发

使用 Node.js 22 或更新版本。

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

默认本地端口为 4188；独立验证可用 `npm run dev -- --port 4190`。不要在玩家的端口运行 QA 存档准备页。依赖和构建目录由命令生成，不入库。

## 项目导航

- [AGENTS.md](AGENTS.md)：协作规则、实现边界、验证和发布要求。
- [架构](docs/architecture.md)：输入、状态、场景与存档的职责。
- [第二季设计](docs/season-two.md)：雨后花房的关卡和验收标准。
- [第一季记录](docs/season-one.md)：既有九关内容和玩法。
- `qa/`：按版本保存测试、浏览器截图、构建清单和发布回执。

## 发布

当前使用原有 GitHub Pages 托管静态构建，配置在 `config/hosting.json`。凭据留在本机 GitHub CLI 中，不写入项目。

```sh
npm test
npm run build
node scripts/publish.mjs --hosting-receipt config/hosting.json --prefix quiet-workshop/v<version> --dry-run
node scripts/publish.mjs --hosting-receipt config/hosting.json --prefix quiet-workshop/v<version>
node scripts/verify-public.mjs
```

`--prefix` 必须使用尚未发布的新版本路径。测试通过、本地画面、Pages 构建和公网文件验证分别记录，不互相替代。

模型、纹理、插画和音效由代码生成；Third-party licenses 随构建发布，详见 [CREDITS.txt](CREDITS.txt)。物件使用 Rapier 刚体，水流、生长和修复效果是面向玩法制作的状态动画。
