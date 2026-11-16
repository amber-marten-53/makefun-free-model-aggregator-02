# free-model-aggregator-02

[![make.fun · free-model-aggregator-02](https://make.fun/badge/free-model-aggregator-02.svg)](https://make.fun/bounty/free-model-aggregator-02?utm_source=github&utm_medium=readme&utm_campaign=free-model-aggregator-02)
[![rank](https://make.fun/badge/free-model-aggregator-02/amber-marten-53/makefun-free-model-aggregator-02/rank.svg)](https://make.fun/bounty/free-model-aggregator-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=free-model-aggregator-02)
[![reward](https://make.fun/badge/free-model-aggregator-02/amber-marten-53/makefun-free-model-aggregator-02/reward.svg)](https://make.fun/bounty/free-model-aggregator-02/reward.svg?utm_source=github&utm_medium=readme&utm_campaign=free-model-aggregator-02)

A dependency-free Node.js tool that aggregates free LLM models from multiple providers into a single catalog, with caching, retry, usage accounting and provider health checks.

## Features
- Multi-provider free-model catalog derived from `catalog.json`.
- Intelligent response caching.
- Robust retry mechanisms with backoff and Retry-After header handling.
- Comprehensive token usage accounting.
- Provider health probing with a text-based status report.
- Full streaming support for LLM responses.

## Usage

List all available models in the aggregated catalog:
```bash
node main.ts --list
```

Generate a health report for all configured model providers:
```bash
node main.ts --health
```

## License
This project is MIT licensed (see the LICENSE file).
