# srx

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/jimmy-guzman/srx/cd.yml?style=flat-square&logo=github-actions)
[![version](https://img.shields.io/npm/v/srx.svg?logo=npm&style=flat-square)](https://www.npmjs.com/package/srx)
[![downloads](https://img.shields.io/npm/dm/srx.svg?logo=npm&style=flat-square)](http://www.npmtrends.com/srx)
[![Install Size][install-size-badge]][packagephobia]

> Smart package.json script runner

Run scripts directly by name, across workspaces, or fall back to fuzzy search when you don’t remember the exact command.

## Usage

```bash
pnpx srx
```

## Features

- **Interactive fuzzy search** - Quickly find and run scripts with autocomplete
- **Workspace support** - Works seamlessly with monorepos and single projects
- **Smart sorting** - Frequently used scripts appear first
- **Direct execution** - Run scripts directly by name without prompting
- **History tracking** - Remembers your most-used scripts per project

## Installation

```bash
pnpm add -D srx
```

## CLI Options

```bash
srx - Smart package.json script runner

Usage:
  srx                       Interactive mode - fuzzy find and select script
  srx <script>              Run a script from package.json
  srx [workspace] <script>  Run a script in a specific workspace

Options:
  -h, --help               Show this help message
  -v, --version            Show version number
```

## Examples

```bash
# Interactive mode - select from all available scripts
pnpx srx

# Run a specific script
pnpx srx build

# Run a script in a workspace (monorepo)
pnpx srx my-workspace build

# Fuzzy search - type partial name and select from matches
pnpx srx bui

# Run workspace script by workspace folder name
pnpx srx packages/utils test
```

[packagephobia]: https://packagephobia.com/result?p=srx
[install-size-badge]: https://img.shields.io/badge/dynamic/json?url=https://packagephobia.com/v2/api.json%3Fp=srx&query=$.install.pretty&label=install%20size&style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDggMTA4Ij48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzAwNjgzOCIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzMyZGU4NSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGZpbGw9InVybCgjYSkiIGQ9Ik0yMS42NjcgNzMuODA5VjMzLjg2N2wyOC4zMy0xNi4xODggMjguMzM3IDE2LjE4OFY2Ni4xM0w0OS45OTcgODIuMzIxIDM1IDczLjc1VjQxLjYwNGwxNC45OTctOC41N0w2NSA0MS42MDR2MTYuNzg4bC0xNS4wMDMgOC41NzEtMS42NjMtLjk1di0xNi42NzJsOC4zODItNC43OTItNi43MTktMy44MzgtOC4zMyA0Ljc2M1Y2OS44OGw4LjMzIDQuNzYyIDIxLjY3LTEyLjM4M1YzNy43MzdsLTIxLjY3LTEyLjM3OS0yMS42NjMgMTIuMzc5djM5Ljg4TDQ5Ljk5NyA5MCA4NSA3MFYzMEw0OS45OTcgMTAgMTUgMzB2NDB6Ii8+PC9zdmc+
