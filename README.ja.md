<p align="center">
  <a href="https://slopcode.dev">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="SlopCode logo">
    </picture>
  </a>
</p>
<p align="center">オープンソースのAIコーディングエージェント。</p>
<p align="center">
  <a href="https://slopcode.dev/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/slopcode"><img alt="npm" src="https://img.shields.io/npm/v/slopcode?style=flat-square" /></a>
  <a href="http://github.com/grappeggia/slopcode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/grappeggia/slopcode/publish.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a>
</p>

[![SlopCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://slopcode.dev)

---

### インストール

```bash
# YOLO
curl -fsSL https://slopcode.dev/install | bash

# パッケージマネージャー
npm i -g slopcode@latest        # bun/pnpm/yarn でもOK
scoop install slopcode             # Windows
choco install slopcode             # Windows
brew install grappeggia/slopcode/slopcode # macOS と Linux（推奨。常に最新）
brew install slopcode              # macOS と Linux（公式 brew formula。更新頻度は低め）
sudo pacman -S slopcode            # Arch Linux (Stable)
paru -S slopcode-bin               # Arch Linux (Latest from AUR)
mise use -g slopcode               # どのOSでも
nix run nixpkgs#slopcode           # または github:grappeggia/slopcode で最新 dev ブランチ
```

> [!TIP]
> インストール前に 0.1.x より古いバージョンを削除してください。

### デスクトップアプリ (BETA)

SlopCode はデスクトップアプリとしても利用できます。[releases page](http://github.com/grappeggia/slopcode/releases) から直接ダウンロードするか、[slopcode.dev/download](https://slopcode.dev/download) を利用してください。

| プラットフォーム      | ダウンロード                          |
| --------------------- | ------------------------------------- |
| macOS (Apple Silicon) | `slopcode-desktop-darwin-aarch64.dmg` |
| macOS (Intel)         | `slopcode-desktop-darwin-x64.dmg`     |
| Windows               | `slopcode-desktop-windows-x64.exe`    |
| Linux                 | `.deb`、`.rpm`、または AppImage       |

```bash
# macOS (Homebrew)
brew install --cask slopcode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/slopcode-desktop
```

#### インストールディレクトリ

インストールスクリプトは、インストール先パスを次の優先順位で決定します。

1. `$SLOPCODE_INSTALL_DIR` - カスタムのインストールディレクトリ
2. `$XDG_BIN_DIR` - XDG Base Directory Specification に準拠したパス
3. `$HOME/bin` - 標準のユーザー用バイナリディレクトリ（存在する場合、または作成できる場合）
4. `$HOME/.slopcode/bin` - デフォルトのフォールバック

```bash
# 例
SLOPCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://slopcode.dev/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://slopcode.dev/install | bash
```

### Agents

SlopCode には組み込みの Agent が2つあり、`Tab` キーで切り替えられます。

- **build** - デフォルト。開発向けのフルアクセス Agent
- **plan** - 分析とコード探索向けの読み取り専用 Agent
  - デフォルトでファイル編集を拒否
  - bash コマンド実行前に確認
  - 未知のコードベース探索や変更計画に最適

また、複雑な検索やマルチステップのタスク向けに **general** サブ Agent も含まれています。
内部的に使用されており、メッセージで `@general` と入力して呼び出せます。

[agents](https://slopcode.dev/docs/agents) の詳細はこちら。

### ドキュメント

SlopCode の設定については [**ドキュメント**](https://slopcode.dev/docs) を参照してください。

### コントリビュート

SlopCode に貢献したい場合は、Pull Request を送る前に [contributing docs](./CONTRIBUTING.md) を読んでください。

### SlopCode の上に構築する

SlopCode に関連するプロジェクトで、名前に "slopcode"（例: "slopcode-dashboard" や "slopcode-mobile"）を含める場合は、そのプロジェクトが SlopCode チームによって作られたものではなく、いかなる形でも関係がないことを README に明記してください。

### FAQ

#### Claude Code との違いは？

機能面では Claude Code と非常に似ています。主な違いは次のとおりです。

- 100% オープンソース
- 特定のプロバイダーに依存しません。[SlopCode Zen](https://slopcode.dev/zen) で提供しているモデルを推奨しますが、SlopCode は Claude、OpenAI、Google、またはローカルモデルでも利用できます。モデルが進化すると差は縮まり価格も下がるため、provider-agnostic であることが重要です。
- そのまま使える LSP サポート
- TUI にフォーカス。SlopCode は neovim ユーザーと [terminal.shop](https://terminal.shop) の制作者によって作られており、ターミナルで可能なことの限界を押し広げます。
- クライアント/サーバー構成。例えば SlopCode をあなたのPCで動かし、モバイルアプリからリモート操作できます。TUI フロントエンドは複数あるクライアントの1つにすぎません。

---

**コミュニティに参加** [Discord](https://discord.gg/slopcode) | [X.com](https://x.com/slopcode)
