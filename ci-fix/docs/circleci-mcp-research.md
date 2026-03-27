# CircleCI MCP Research

**Date:** 2026-03-27
**Purpose:** Investigation for ci-fix Iteration 2 implementation

## Summary

✅ **Official CircleCI MCP Server exists and is publicly available**

CircleCI has released an official MCP (Model Context Protocol) server that provides exactly what we need for Iteration 2.

## Key Findings

### Official Package
- **Repository:** [CircleCI-Public/mcp-server-circleci](https://github.com/CircleCI-Public/mcp-server-circleci)
- **Status:** Publicly available, actively maintained
- **Documentation:** [CircleCI Docs - Using the CircleCI MCP server](https://circleci.com/docs/guides/toolkit/using-the-circleci-mcp-server/)

### Capabilities
The CircleCI MCP server provides:
- **Diagnose failing builds** - Get structured error summaries and logs
- **Trace failures to recent changes** - Connect regressions to commits, diffs, or workflows
- **Spot flaky tests** - Surface instability patterns from test history

These capabilities map directly to our ci-fix agent needs:
- `get_pipeline_status()` → Fetch build/workflow status
- `get_job_logs()` → Retrieve structured error logs
- `get_test_results()` → Access test failure data

### Integration
- Works with MCP-compatible clients (Claude Code, Cursor, Windsurf, etc.)
- Uses natural language interface
- Lightweight standard for LLM-powered agents to fetch structured data
- Requires CircleCI API token for authentication

## Recommendation for Iteration 2

**Proceed with CircleCI MCP integration** as planned. The official server provides:
1. ✅ Structured data access (no need to parse raw API responses)
2. ✅ Built-in authentication handling
3. ✅ Maintained by CircleCI (handles API versioning)
4. ✅ AI-optimized interface (designed for LLM agents)

## Implementation Notes

### Dependencies
```json
{
  "@modelcontextprotocol/sdk": "latest",
  "@circleci/mcp-server-circleci": "latest"  // Need to verify exact package name
}
```

### Configuration
- Requires `CIRCLE_TOKEN` environment variable
- MCP server runs as a separate process
- Agent connects via MCP client

### Architecture
```
ci-fix Agent (streamText)
    ↓
CI Tools (tools/ci-tools.ts)
    ↓
MCP Client (@modelcontextprotocol/sdk)
    ↓
CircleCI MCP Server (@circleci/mcp-server-circleci)
    ↓
CircleCI API
```

## Next Steps

For Iteration 2:
1. Install `@modelcontextprotocol/sdk` and CircleCI MCP server package
2. Configure MCP server with CircleCI token
3. Replace fixture-based CI tools with MCP client calls
4. Test against real CircleCI builds

## Sources

- [GitHub - CircleCI-Public/mcp-server-circleci](https://github.com/CircleCI-Public/mcp-server-circleci)
- [CircleCI MCP server - CircleCI](https://circleci.com/product/mcp/)
- [MCP Server for CircleCI now available - CircleCI Changelog](https://circleci.com/changelog/mcp-server-for-circleci-now-available/)
- [Using the CircleCI MCP server - CircleCI Docs](https://circleci.com/docs/guides/toolkit/using-the-circleci-mcp-server/)
- [Transform CI/CD pipelines with CircleCI's MCP and AWS Agentic AI](https://aws.amazon.com/blogs/awsmarketplace/transform-ci-cd-pipelines-with-circleci-mcp-and-aws-agentic-ai/)
