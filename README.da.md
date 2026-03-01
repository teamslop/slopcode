<p align="center">
  <a href="https://slopcode.dev">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="SlopCode logo">
    </picture>
  </a>
</p>
<p align="center">Den open source AI-kodeagent.</p>
<p align="center">
  <a href="https://slopcode.dev/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/slopcode"><img alt="npm" src="https://img.shields.io/npm/v/slopcode?style=flat-square" /></a>
  <a href="http://github.com/teamslop/slopcode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/teamslop/slopcode/publish.yml?style=flat-square&branch=dev" /></a>
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

### Installation

```bash
# YOLO
curl -fsSL https://slopcode.dev/install | bash

# Pakkehåndteringer
npm i -g slopcode@latest        # eller bun/pnpm/yarn
scoop install slopcode             # Windows
choco install slopcode             # Windows
brew install teamslop/slopcode/slopcode # macOS og Linux (anbefalet, altid up to date)
brew install slopcode              # macOS og Linux (officiel brew formula, opdateres sjældnere)
sudo pacman -S slopcode            # Arch Linux (Stable)
paru -S slopcode-bin               # Arch Linux (Latest from AUR)
mise use -g slopcode               # alle OS
nix run nixpkgs#slopcode           # eller github:teamslop/slopcode for nyeste dev-branch
```

> [!TIP]
> Fjern versioner ældre end 0.1.x før installation.

### Desktop-app (BETA)

SlopCode findes også som desktop-app. Download direkte fra [releases-siden](http://github.com/teamslop/slopcode/releases) eller [slopcode.dev/download](https://slopcode.dev/download).

| Platform              | Download                              |
| --------------------- | ------------------------------------- |
| macOS (Apple Silicon) | `slopcode-desktop-darwin-aarch64.dmg` |
| macOS (Intel)         | `slopcode-desktop-darwin-x64.dmg`     |
| Windows               | `slopcode-desktop-windows-x64.exe`    |
| Linux                 | `.deb`, `.rpm`, eller AppImage        |

```bash
# macOS (Homebrew)
brew install --cask slopcode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/slopcode-desktop
```

#### Installationsmappe

Installationsscriptet bruger følgende prioriteringsrækkefølge for installationsstien:

1. `$SLOPCODE_INSTALL_DIR` - Tilpasset installationsmappe
2. `$XDG_BIN_DIR` - Sti der følger XDG Base Directory Specification
3. `$HOME/bin` - Standard bruger-bin-mappe (hvis den findes eller kan oprettes)
4. `$HOME/.slopcode/bin` - Standard fallback

```bash
# Eksempler
curl -fsSL https://slopcode.dev/install | SLOPCODE_INSTALL_DIR=/usr/local/bin bash
curl -fsSL https://slopcode.dev/install | XDG_BIN_DIR=$HOME/.local/bin bash
```

### Agents

SlopCode har to indbyggede agents, som du kan skifte mellem med `Tab`-tasten.

- **build** - Standard, agent med fuld adgang til udviklingsarbejde
- **plan** - Skrivebeskyttet agent til analyse og kodeudforskning
  - Afviser filredigering som standard
  - Spørger om tilladelse før bash-kommandoer
  - Ideel til at udforske ukendte kodebaser eller planlægge ændringer

Derudover findes der en **general**-subagent til komplekse søgninger og flertrinsopgaver.
Den bruges internt og kan kaldes via `@general` i beskeder.

Læs mere om [agents](https://slopcode.dev/docs/agents).

### Dokumentation

For mere info om konfiguration af SlopCode, [**se vores docs**](https://slopcode.dev/docs).

### Bidrag

Hvis du vil bidrage til SlopCode, så læs vores [contributing docs](./CONTRIBUTING.md) før du sender en pull request.

### Bygget på SlopCode

Hvis du arbejder på et projekt der er relateret til SlopCode og bruger "slopcode" som en del af navnet; f.eks. "slopcode-dashboard" eller "slopcode-mobile", så tilføj en note i din README, der tydeliggør at projektet ikke er bygget af SlopCode-teamet og ikke er tilknyttet os på nogen måde.

### FAQ

#### Hvordan adskiller dette sig fra Claude Code?

Det minder meget om Claude Code i forhold til funktionalitet. Her er de vigtigste forskelle:

- 100% open source
- Ikke låst til en udbyder. Selvom vi anbefaler modellerne via [SlopCode Zen](https://slopcode.dev/zen); kan SlopCode bruges med Claude, OpenAI, Google eller endda lokale modeller. Efterhånden som modeller udvikler sig vil forskellene mindskes og priserne falde, så det er vigtigt at være provider-agnostic.
- LSP-support out of the box
- Fokus på TUI. SlopCode er bygget af neovim-brugere og skaberne af [terminal.shop](https://terminal.shop); vi vil skubbe grænserne for hvad der er muligt i terminalen.
- Klient/server-arkitektur. Det kan f.eks. lade SlopCode køre på din computer, mens du styrer den eksternt fra en mobilapp. Det betyder at TUI-frontend'en kun er en af de mulige clients.

---

**Bliv en del af vores community** [Discord](https://discord.gg/slopcode) | [X.com](https://x.com/slopcode)
