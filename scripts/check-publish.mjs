#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

function getTrackedFiles() {
  return git(['ls-files', '-z'])
    .split('\0')
    .map((file) => file.trim())
    .filter(Boolean);
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const textExts = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.yml', '.yaml', '.toml', '.rs', '.html', '.css', '.scss', '.svg', '.sh', '.ps1', '.xml', '.lock', '.conf', '.properties'
  ]);
  return textExts.has(ext) || ['LICENSE', '.gitignore'].includes(path.basename(filePath));
}

const forbiddenPathRules = [
  { pattern: /(^|\/)output(\/|$)/, reason: '本地测试输出目录' },
  { pattern: /(^|\/)playwright-report(\/|$)/, reason: 'Playwright 报告目录' },
  { pattern: /(^|\/)test-results(\/|$)/, reason: '测试结果目录' },
  { pattern: /(^|\/)src-tauri\/crates\/[^/]+\/target(\/|$)/, reason: '嵌套 Rust target 构建目录' },
  { pattern: /(^|\/)docs\/.*product-review.*\.md$/i, reason: '分析/复盘类过程文档' },
  { pattern: /(^|\/)[^/]+-preview\.html$/i, reason: '预览 HTML 原型' },
  { pattern: /(^|\/)src\/[^/]+-preview\.jsx$/i, reason: '预览 JSX 原型' },
  { pattern: /(^|\/)\.env(\..+)?$/i, reason: '环境变量文件' },
  { pattern: /(^|\/)(id_rsa|id_ed25519)$/i, reason: 'SSH 私钥文件名' },
  { pattern: /(^|\/).+\.(pem|p12|pfx|mobileprovision)$/i, reason: '证书/签名文件' },
];

const strongSecretRules = [
  { pattern: /-----BEGIN (?:OPENSSH|RSA|EC|DSA|PGP|PRIVATE KEY)[\s\S]+?-----/m, reason: '检测到私钥内容' },
  { pattern: /github_pat_[A-Za-z0-9_]{20,}/, reason: '检测到 GitHub PAT' },
  { pattern: /ghp_[A-Za-z0-9]{20,}/, reason: '检测到 GitHub token' },
  { pattern: /glpat-[A-Za-z0-9\-_]{20,}/, reason: '检测到 GitLab token' },
  { pattern: /AKIA[0-9A-Z]{16}/, reason: '检测到 AWS Access Key' },
  { pattern: /AIza[0-9A-Za-z\-_]{35}/, reason: '检测到 Google API Key' },
];

const suspiciousNameRules = [
  /handoff/i,
  /scratch/i,
  /thought/i,
  /process/i,
  /analysis/i,
  /review/i,
  /复盘/,
  /思路/,
  /过程/,
];

const trackedFiles = getTrackedFiles();
const pathViolations = [];
const secretViolations = [];
const suspiciousFiles = [];

for (const file of trackedFiles) {
  for (const rule of forbiddenPathRules) {
    if (rule.pattern.test(file)) {
      pathViolations.push({ file, reason: rule.reason });
    }
  }

  if (suspiciousNameRules.some((rule) => rule.test(file))) {
    suspiciousFiles.push(file);
  }

  if (!isTextFile(file)) {
    continue;
  }

  const abs = path.join(root, file);
  try {
    const stats = fs.statSync(abs);
    if (stats.size > 512 * 1024) {
      continue;
    }
  } catch {
    continue;
  }

  let content;
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch {
    continue;
  }

  for (const rule of strongSecretRules) {
    if (rule.pattern.test(content)) {
      secretViolations.push({ file, reason: rule.reason });
    }
  }
}

if (pathViolations.length > 0 || secretViolations.length > 0) {
  console.error('\n[check:publish] 发布检查失败。');

  if (pathViolations.length > 0) {
    console.error('\n不应提交的文件：');
    for (const item of pathViolations) {
      console.error(`- ${item.file} (${item.reason})`);
    }
  }

  if (secretViolations.length > 0) {
    console.error('\n疑似敏感信息：');
    for (const item of secretViolations) {
      console.error(`- ${item.file} (${item.reason})`);
    }
  }

  process.exit(1);
}

console.log('[check:publish] 未发现禁止提交的文件或强敏感信息。');
if (suspiciousFiles.length > 0) {
  console.log('[check:publish] 提醒：以下文件名看起来像过程性文档，请再次人工确认是否真的需要提交：');
  for (const file of suspiciousFiles) {
    console.log(`- ${file}`);
  }
}
