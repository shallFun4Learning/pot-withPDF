#!/usr/bin/env node

const args = process.argv.slice(2);

function readArg(name) {
  const index = args.indexOf(name);
  if (index === -1 || index === args.length - 1) return null;
  return args[index + 1];
}

const repo = readArg("--repo");
const tag = readArg("--tag");

if (!repo || !tag) {
  console.error("Usage: node scripts/generate-release-notes.mjs --repo <owner/repo> --tag <tag> <asset>...");
  process.exit(1);
}

const assetNames = [];
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--repo" || arg === "--tag") {
    index += 1;
    continue;
  }
  assetNames.push(arg);
}

const uniqueAssetNames = [...new Set(assetNames)];

const downloadUrl = (name) =>
  `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`;

const buckets = {
  windows: [],
  macos: [],
  linux: [],
  others: [],
};

function labelForAsset(name) {
  if (name.endsWith(".exe")) return "Windows x64 安装包（Setup）";
  if (name.endsWith(".msi")) return "Windows x64 安装包（MSI）";
  if (name.endsWith(".dmg") && name.includes("aarch64")) return "macOS Apple Silicon 安装包（DMG）";
  if (name.endsWith(".dmg") && name.includes("x64")) return "macOS Intel 安装包（DMG）";
  if (name.endsWith(".dmg")) return "macOS 安装包（DMG）";
  if (name.endsWith(".AppImage")) return "Linux 通用包（AppImage）";
  if (name.endsWith(".deb")) return "Linux Debian / Ubuntu 安装包（DEB）";
  if (name.endsWith(".rpm")) return "Linux RPM 安装包（RPM）";
  if (name.endsWith(".pkg")) return "macOS 安装包（PKG）";
  if (name.endsWith(".zip")) return "压缩包（ZIP）";
  if (name.endsWith(".tar.gz")) return "压缩包（tar.gz）";
  return name;
}

for (const name of uniqueAssetNames.sort()) {
  if (name.endsWith(".exe") || name.endsWith(".msi")) {
    buckets.windows.push(name);
  } else if (name.endsWith(".dmg") || name.endsWith(".pkg")) {
    buckets.macos.push(name);
  } else if (name.endsWith(".AppImage") || name.endsWith(".deb") || name.endsWith(".rpm")) {
    buckets.linux.push(name);
  } else {
    buckets.others.push(name);
  }
}

const lines = [
  `pot-withPDF ${tag}`,
  "",
  "pot-withPDF 是一个面向 **PDF 文献阅读、划词翻译与高亮批注** 场景的桌面应用，基于 [pot-app/pot-desktop](https://github.com/pot-app/pot-desktop) 进行非官方扩展。",
  "",
  "> English: pot-withPDF is an unofficial fork of pot-app/pot-desktop focused on PDF reading, text selection translation, and highlighting.",
  "",
  "## 版本定位",
  "",
  "- 内置 PDF 打开与多标签页阅读",
  "- 划词翻译与侧栏结果查看",
  "- PDF 高亮批注与保存",
  "- 面向 Windows、macOS、Linux 的桌面发行包",
  "",
  "## 下载",
  "",
];

function appendSection(title, items) {
  if (!items.length) return;
  lines.push(`### ${title}`, "");
  for (const name of items) {
    lines.push(`- [${labelForAsset(name)}](${downloadUrl(name)})`);
  }
  lines.push("");
}

appendSection("Windows", buckets.windows);
appendSection("macOS", buckets.macos);
appendSection("Linux", buckets.linux);
appendSection("其他文件", buckets.others);

lines.push(
  "## 使用建议",
  "",
  "- Windows 用户优先下载 **Setup.exe**；需要企业分发时可选 **MSI**。",
  "- macOS 请按芯片架构选择安装包；Apple Silicon 设备优先选择 `aarch64.dmg`。",
  "- Linux 用户可按环境选择 **AppImage / DEB / RPM**。",
  "",
  "## 项目信息",
  "",
  `- 仓库：https://github.com/${repo}`,
  `- 问题反馈：https://github.com/${repo}/issues`,
  "",
  "## 版权与致谢",
  "",
  "- 本项目为 **pot-app/pot-desktop 的非官方 fork**，并非上游官方发行版。",
  "- 保留上游项目版权信息、GPL-3.0-only 许可与相关致谢。",
  "- 感谢 pot-app 项目作者与贡献者提供优秀的基础工程。",
  ""
);

process.stdout.write(lines.join("\n"));
