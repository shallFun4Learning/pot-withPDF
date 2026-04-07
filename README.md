<img width="160px" src="public/icon.svg" align="left"/>

# pot-withPDF

> 默认中文 README / Chinese-first README
> English section: [Jump to English](#english)

pot-withPDF 是基于 [pot-app/pot-desktop](https://github.com/pot-app/pot-desktop) 维护的 **非官方 fork**，定位为：

- 跨平台划词翻译 / 输入翻译 / OCR 翻译工具
- 内置 **PDF 文献阅读、划词翻译、高亮批注、双栏对照** 的桌面应用

**请注意：本项目不是 pot-app 官方发行版，也不是上游团队维护的官方 PDF 版本。**

![License](https://img.shields.io/github/license/shallFun4Learning/pot-withPDF.svg)
![Repo](https://img.shields.io/badge/GitHub-pot--withPDF-black?logo=github)
![Tauri](https://img.shields.io/badge/Tauri-1.6.x-blue?logo=tauri)
![PDF.js](https://img.shields.io/badge/PDF.js-pdfjs--dist-red)
![Windows](https://img.shields.io/badge/Windows-10+-blue?logo=windows)
![macOS](https://img.shields.io/badge/macOS-supported-black?logo=apple)
![Linux](https://img.shields.io/badge/Linux-Ubuntu%20tested-yellow?logo=linux)

---

## 目录

- [项目说明](#项目说明)
- [功能亮点](#功能亮点)
- [使用说明](#使用说明)
- [安装与运行](#安装与运行)
- [开发与测试](#开发与测试)
- [已知范围](#已知范围)
- [版权与致谢](#版权与致谢)
- [English](#english)

---

## 项目说明

仓库地址：<https://github.com/shallFun4Learning/pot-withPDF>
问题反馈：<https://github.com/shallFun4Learning/pot-withPDF/issues>
发布页面：<https://github.com/shallFun4Learning/pot-withPDF/releases>

本项目在保留 Pot 原有桌面翻译能力的基础上，补充了面向文献阅读的 PDF 工作流：

- 软件内打开本地 PDF
- **划词翻译** 与 **高亮批注** 分离
- 高亮后保存 / 另存为 PDF
- 双 PDF 并排阅读
- 原文 / 译文专门对照模式
- 复制引用时自动附带页码
- 标签页、最近关闭恢复、阅读进度恢复

---

## 功能亮点

### 1. 桌面翻译能力

- 划词翻译
- 输入翻译
- 截图 OCR / 截图翻译
- 多翻译服务并行结果
- 历史记录与插件服务体系

### 2. PDF 阅读能力

- 本地 PDF 打开
- 页缩略图 / 目录 / 搜索
- 划词后右侧侧栏翻译
- PDF 高亮批注与保存
- 摘录导出 Markdown
- 复制摘录 / 复制带页码引用

### 3. 对照阅读能力

- **双 PDF 对照**：两篇文献或原文 / 人工译文并排看
- **同步阅读**：双栏同步滚动、同步定位、同步页内位置
- **自由阅读**：关闭同步后，两侧可独立翻页
- **原文 / 译文模式**：左侧 PDF 原文，右侧显示当前选段与主翻译结果

### 4. 文献工作流能力

- 标签页拖拽排序
- 最近关闭恢复
- 阅读进度恢复
- 生词条目整理
- 摘录与引用复制

---

## 使用说明

### 一、普通翻译

1. 打开应用后，可继续使用 Pot 原有的：
   - 划词翻译
   - 输入翻译
   - 截图 OCR / 截图翻译
2. 翻译服务、OCR、TTS、插件的配置方式与 Pot 保持一致。

### 二、打开 PDF

1. 从托盘或 PDF 窗口工具栏点击 **Open PDF**。
2. 当前版本以 **本地 PDF 文件** 为主。
3. 打开后可使用：缩放、页码跳转、目录、搜索、标签页等功能。

### 三、划词翻译（翻译模式）

> 这是“翻译”功能，不会写入 PDF。

1. 保持顶部模式为 **翻译**。
2. 在 PDF 正文中选择文本。
3. 右侧会显示：
   - 当前选中文本
   - 源文本编辑区
   - 翻译语言设置
   - 多翻译服务结果
4. 可选择：
   - 自动翻译选区
   - 手动修改源文本后重新翻译
   - 复制选区
   - 复制带页码引用

### 四、高亮批注（高亮模式）

> 这是“批注”功能，会写入 PDF，并可保存。

1. 点击顶部 **高亮** 进入高亮模式。
2. 在 PDF 中拖选文本创建高亮。
3. 右侧高亮面板中可：
   - 查看全部高亮
   - 切换高亮颜色
   - 为高亮添加读书笔记
   - 定位到对应高亮
   - 删除高亮
   - 导出摘录
4. 点击 **保存** 或 **另存为** 写回 PDF。

### 五、双栏对照阅读

#### A. 两篇 PDF 并排

1. 先打开两份 PDF。
2. 在工具栏中打开 **对照**。
3. 选择另一份已打开文档。
4. 进入双栏模式后可：
   - 同步阅读 / 自由阅读切换
   - 交换左右文档
   - 各自缩放与定位

适合：
- 原文 / 人工译文
- 论文正文 / 补充材料
- 两个版本对照阅读

#### B. 原文 / 译文专门对照模式

1. 打开一份 PDF。
2. 在工具栏中选择 **对照 → 原文 / 译文**。
3. 在左侧 PDF 中选中当前段落。
4. 右侧会持续显示：
   - 当前原文段落
   - 主翻译服务的译文
   - 服务名称、加载状态、错误状态

适合：
- 阅读外文论文时边看边译
- 不想打开第二个窗口或第二份 PDF 的场景

### 六、引用与摘录

在高亮列表和翻译侧栏中，可直接：

- 复制摘录
- 复制带页码引用
- 复制译文

适合写笔记、做文献综述、整理引用卡片。

### 七、常用快捷键

- `Ctrl/Cmd + 1`：翻译模式
- `Ctrl/Cmd + 2`：高亮模式
- `Ctrl/Cmd + 3`：专注模式
- `Ctrl/Cmd + F`：PDF 搜索
- `Ctrl/Cmd + S`：保存 PDF
- `Ctrl/Cmd + T`：打开 PDF / 新标签
- `Ctrl/Cmd + Shift + T`：恢复最近关闭标签
- `Ctrl/Cmd + W`：关闭当前标签

---

## 安装与运行

### 安装方式

优先查看 fork 仓库的 Release：
<https://github.com/shallFun4Learning/pot-withPDF/releases>

> 如果某个平台暂时没有现成安装包，可以直接按下面步骤从源码运行。

### 从源码运行

#### 1. 准备环境

本项目提供了尽量不污染本地全局环境的引导脚本：

- Linux / macOS:

```bash
bash scripts/bootstrap-dev.sh
```

- Windows PowerShell:

```powershell
./scripts/bootstrap-dev.ps1
```

#### 2. 安装依赖

```bash
corepack enable
pnpm install
```

#### 3. 启动前端开发环境

```bash
pnpm dev
```

#### 4. 启动 Tauri 桌面应用

```bash
pnpm tauri dev
```

---

## 开发与测试

### 前端测试

```bash
pnpm test:unit
pnpm test:e2e
```

### 全量前端校验

```bash
pnpm build
```

### Rust 测试

Linux 下可使用：

```bash
./scripts/cargo-linux.sh test --manifest-path src-tauri/Cargo.toml
```

如果你只想跑 PDF 文件读写相关 Rust 测试：

```bash
cargo test --manifest-path src-tauri/crates/pdf_io/Cargo.toml
```

---

## 已知范围

当前版本有意聚焦“文献阅读 + 翻译 + 批注”场景，范围如下：

- 以 **本地 PDF** 为主
- 支持 **高亮批注**，不做正文重排编辑
- 不保证支持密码 PDF
- 不提供官方 Pot 更新源
- 这是 fork 版本，问题与功能路线请以本仓库为准

---

## 版权与致谢

### 版权与许可

- 本项目继承并遵守上游 [pot-app/pot-desktop](https://github.com/pot-app/pot-desktop) 的开源许可要求
- 仓库当前以 **GPL-3.0-only** 方式分发
- PDF 阅读与批注基于 [Mozilla PDF.js](https://github.com/mozilla/pdf.js) / `pdfjs-dist`

### 致谢

衷心感谢以下项目与贡献者：

1. **pot-app / pot-desktop**
   本项目的桌面翻译架构、服务体系、插件生态与大量基础能力来自上游项目。

2. **Mozilla PDF.js**
   为本项目提供跨平台 PDF 渲染、文本层、批注编辑与保存能力。

3. **Pot 插件生态与原服务作者**
   包括翻译、OCR、TTS、生词本等服务实现与插件模板。

### 非官方声明

本项目保留对上游项目的版权信息与感谢，但：

- **不是** pot-app 官方 PDF 版本
- **不是** pot-app 官方发布渠道
- **不代表** 上游团队立场

---

# English

## Overview

pot-withPDF is an **unofficial fork** of [pot-app/pot-desktop](https://github.com/pot-app/pot-desktop), focused on literature reading, translation, and PDF annotation.

Repository: <https://github.com/shallFun4Learning/pot-withPDF>
Issues: <https://github.com/shallFun4Learning/pot-withPDF/issues>
Releases: <https://github.com/shallFun4Learning/pot-withPDF/releases>

This project is **not** an official pot-app release.

## Highlights

- Cross-platform desktop translation workflow
- Built-in local PDF reader
- Selection translation and highlight annotation as **separate** actions
- Save / Save As after PDF highlights
- Side-by-side document compare
- Dedicated **Original / Translation** compare mode
- Copy extract or citation with page number
- Tabs, restore recently closed tabs, reading progress restore

## Usage

### 1. Open a PDF

Use the tray entry or the PDF toolbar to open a local `.pdf` file.

### 2. Selection translation

Keep the toolbar in **Translate** mode.

- Select text inside the PDF
- Review and edit the source text in the right sidebar
- Trigger translation with the existing Pot translation services
- Copy the selection or copy a citation with page number

### 3. Highlight annotation

Switch to **Highlight** mode.

- Drag across text to create highlights
- Manage highlight color, notes, and extract list
- Save or Save As to write annotations back into the PDF

### 4. Compare reading

#### Document vs document

Open two PDFs and choose another open tab from **Compare**.

You can:

- read two PDFs side by side
- enable synced reading
- switch to free reading
- swap left and right documents

#### Original / Translation

Choose **Compare → Original / Translation**.

- the PDF stays on the left
- the selected source passage is shown on the right
- the primary translation result is shown beside it

This is useful when reading a paper and translating paragraph by paragraph.

### 5. Citations and extracts

You can copy:

- extract text
- citation with page number
- translation text

## Install and run

### Option A: release packages

Please check the fork release page first:
<https://github.com/shallFun4Learning/pot-withPDF/releases>

### Option B: run from source

Bootstrap scripts:

```bash
bash scripts/bootstrap-dev.sh
```

or on Windows PowerShell:

```powershell
./scripts/bootstrap-dev.ps1
```

Install dependencies:

```bash
corepack enable
pnpm install
```

Run web dev server:

```bash
pnpm dev
```

Run desktop app:

```bash
pnpm tauri dev
```

## Test commands

```bash
pnpm test:unit
pnpm test:e2e
pnpm build
./scripts/cargo-linux.sh test --manifest-path src-tauri/Cargo.toml
```

## Scope

This fork focuses on **reading + translation + annotation**.

Current scope:

- local PDF first
- highlight annotation, not full body editing
- no official Pot updater channel
- not an official pot-app build

## Credits and License

- Based on [pot-app/pot-desktop](https://github.com/pot-app/pot-desktop)
- PDF support powered by [Mozilla PDF.js](https://github.com/mozilla/pdf.js)
- Distributed under **GPL-3.0-only** in this repository

Special thanks to the upstream Pot team, PDF.js maintainers, and the Pot service / plugin ecosystem contributors.
