# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

### TypeScript (pnpm workspace)
```bash
pnpm install          # Install all dependencies
pnpm build            # Build all TypeScript packages
pnpm test             # Run tests (Vitest)
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm format           # Check Prettier formatting
pnpm format:fix       # Fix formatting
pnpm fix:all          # Run all fixers (format + lint + markdown)
```

### Python (UV)
```bash
uv sync               # Install Python dependencies

# Run Python examples (from repo root)
uv --directory=python/examples run -- adk run src/examples/a2a/buyer/adk
uv --directory=python/examples run -- adk web src/examples/a2a/buyer

# Run A2A seller server
uv --directory=python/examples run -- uvicorn examples.a2a.seller.adk.agent:a2a_app --host localhost --port 8001
```

### TypeScript Examples
```bash
# FastMCP server
cd typescript/examples/fastmcp-x402-server
pnpm dev              # Development with hot reload
pnpm start            # Run built server

# LangChain MCP
cd typescript/examples/langchain-mcp
pnpm dev              # Run with default query
pnpm dev "your query" # Run with custom query
```

## Architecture

Multi-language monorepo demonstrating x402 payment integration with AI agents:

- **x402**: HTTP payment protocol where services return 402 Payment Required responses
- **A2A**: Agent-to-Agent protocol for inter-agent communication
- **MCP**: Model Context Protocol for tool integration

### Python Examples (`python/examples/src/examples/`)
- `a2a/buyer/adk/` - Direct A2A agent with x402 payments (uses `X402RemoteA2aAgent`)
- `a2a/buyer/local_agent/` - Local orchestrator managing multiple remote agents (uses `X402RemoteAgentToolset`)
- `a2a/seller/adk/` - x402-enabled A2A service provider
- `mcp/buyer/adk/` - MCP client via payment proxy (uses `McpToolset`)

### TypeScript Examples (`typescript/examples/`)
- `fastmcp-x402-server/` - Basic FastMCP server with add/echo tools
- `langchain-mcp/` - LangChain agent using x402 MCP tools

## Linting Configuration

**Python**: Ruff (import sorting `I`, unused imports `F401`) + MyPy strict mode
**TypeScript**: ESLint with strict TypeScript rules, import-x plugin
