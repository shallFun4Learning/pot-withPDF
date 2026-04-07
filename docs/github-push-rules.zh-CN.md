# GitHub 推送规则（pot-withPDF）

> 目的：保证推送到 GitHub 的内容只包含产品源码、必要文档与可复现的构建配置；不包含过程垃圾文件、AI 过程性说明、私钥、密码或本地临时产物。

## 1. 允许推送的内容

以下内容适合提交到 GitHub：

- 产品源码与资源文件
  - `src/**`
  - `src-tauri/**`
  - `public/**`
- 测试与自动化
  - `tests/**`
  - `playwright.config.js`
  - `vitest.config.js`
  - `vitest.setup.js`
  - `scripts/**`
- 项目配置
  - `package.json`
  - `pnpm-lock.yaml`
  - `Cargo.toml` / `Cargo.lock`
  - `.github/workflows/**`
  - `.gitignore`
- 用户需要的正式文档
  - `README.md`
  - `README_EN.md`
  - `README_KR.md`
  - 与使用、发布、版权、致谢直接相关的文档

## 2. 禁止推送的内容

以下内容不得进入 GitHub：

### 2.1 过程与临时产物

- 本地构建输出：`dist/`、`src-tauri/target/`、`src-tauri/crates/**/target/`
- 测试输出：`playwright-report/`、`test-results/`、`output/`
- 预览原型：`*-preview.html`、`src/*-preview.jsx`
- 临时缓存、日志、编辑器杂项：`.cache/`、`*.log`、`.DS_Store`

### 2.2 AI 过程性内容

- 复盘、思路、推演、handoff、草稿、过程记录
- 仅用于内部讨论、并不直接服务用户或开发者的说明性材料
- 类似 `docs/*product-review*` 的分析性文稿

### 2.3 敏感信息

- 私钥、证书、签名文件、密码文件
- `.env` / `.env.*`
- 任何真实 token / access key / secret / webhook key
- 本地账户信息、服务器地址、调试凭据、数据库快照

> 例外：原项目源码中已经存在的“配置字段名”或公开 API 适配代码可以保留，但**真实凭据值**绝对不能提交。

## 3. 推送前检查清单

每次推送前至少执行以下检查：

1. 查看变更范围
   - `git status --short`
   - `git diff --stat`
2. 运行发布卫生检查
   - `pnpm run check:publish`
3. 运行核心验证
   - `pnpm test`
   - `./scripts/cargo-linux.sh test --manifest-path src-tauri/Cargo.toml`
4. 人工确认
   - README、产品名、仓库链接指向 `pot-withPDF`
   - 仍保留上游版权与致谢
   - 没有让用户误以为这是 `pot-app` 官方版本的文案

## 4. Release 推送规则

- 日常开发推送：只推 `master` 分支代码
- 正式发布：推送形如 `vX.Y.Z` 的标签
  - 示例：`git tag v3.0.7 && git push origin v3.0.7`
- GitHub Actions 将根据标签自动构建各平台安装包并创建 Release

## 5. 推荐做法

- 优先提交“可复现结果”，不要提交“过程截图”
- 用户看不到、构建不需要、测试不依赖的文件，默认不要推送
- 所有新增文档都应回答一个问题：它是否真的帮助用户安装、使用、开发或发布？如果不是，就不要进仓库
