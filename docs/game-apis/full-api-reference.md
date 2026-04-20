# Running Evaluations

AgentOdyssey provides three equivalent interfaces for running evaluations:

| Interface | When to use |
|---|---|
| **`eval.py`** | Direct command-line usage — run a single evaluation from the terminal |
| **`AgentOdyssey.run()`** | Python API — integrate evaluations into scripts, sweeps, or notebooks |
| **`agentodyssey run`** | CLI tool — available after installing AgentOdyssey as a package (`pip install -e .`) |

:::info Additional Dependencies
The base `requirements.txt` covers most of AgentOdyssey's functionality, but certain agents and LLM providers require extra packages:

| Feature | Extra packages |
|---|---|
| **RaptorRAGAgent** | `tiktoken`, `umap-learn`, `tenacity` |
| **Mem1Agent** | `mem0ai` |
| **Gemini** (`llm_provider="gemini"`) | `google-genai` |
| **Claude** (`llm_provider="claude"`) | `anthropic` |

Install only what you need, e.g.:
```bash
pip install tiktoken umap-learn tenacity   # for RaptorRAGAgent
```
:::

## `AgentOdyssey.run()`

```python
from agentodyssey import AgentOdyssey

AgentOdyssey.run(
    game_name="remnant",
    agent="LongContextAgent",
    llm_provider="openai",
    llm_name="gpt-5",
    max_steps=300,
)
```

`AgentOdyssey.run()` is a thin wrapper that builds and executes the corresponding `eval.py` command as a subprocess. Every keyword argument maps one-to-one to an `eval.py` flag.

### Agent Configuration

These parameters control which agent is created and how it is configured. When `agents_config` is provided, all other agent parameters in this group are ignored.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `agent` | `str` | `"HumanAgent"` | The agent class to evaluate. See [Supported Agents](#supported-agents) for the full list. |
| `agent_id` | `str` | `"agent_adam_davis"` | A unique identifier for the agent. Used as the agent's subdirectory name inside the run directory. |
| `agent_name` | `str` | `"adam_davis"` | A human-readable name for the agent. Appears in game dialogue and logs. |
| `llm_name` | `str` | `None` | The LLM model identifier. Required for all LLM-based agents. Examples: `"gpt-5"`, `"Qwen/Qwen3-4B"`, `"Qwen/Qwen3-32B"`. Models starting with `gpt` use the OpenAI provider; all others are loaded locally via vLLM / HuggingFace. |
| `llm_provider` | `str` | `None` | Which LLM provider to use. One of `"openai"`, `"azure"`, `"azure_openai"`, `"claude"`, `"gemini"`, `"vllm"`, or `"huggingface"`. When `None`, the provider is auto-detected from `llm_name`. |
| `agents_config` | `str` | `None` | Path to a JSON file defining multiple agents for multi-agent evaluation. When provided, the single-agent parameters (`agent`, `agent_id`, `agent_name`, `llm_name`, `llm_provider`, and all `enable_*` flags) are ignored. |

### Agent Memory Modules

These boolean flags toggle optional memory-augmentation modules on the agent. They are mutually informative and you can enable any combination.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `enable_short_term_memory` | `bool` | `False` | Enable the short-term memory module. Gives the agent a sliding window of recent observations that persists across steps. |
| `short_term_memory_size` | `int` | `5` | Number of recent observations to keep in the short-term memory sliding window. Only used when `enable_short_term_memory` is `True`. |
| `enable_reflection` | `bool` | `False` | Enable the reflection module. The agent periodically generates high-level reflections about its experience and stores them for future retrieval. |
| `enable_summarization` | `bool` | `False` | Enable the summarization module. The agent periodically summarizes its accumulated observations to compress context. |

### Game & Environment

These parameters select which game world to run and optionally override the default asset paths.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `game_name` | `str` | `"base"` | The game variant to run. Built-in options: `"base"` (the default game), `"remnant"`, `"mark"`, etc. For custom generated worlds, use the name passed to `AgentOdyssey.generate()`. The game code is loaded from `games/generated/<game_name>/` and assets from `assets/generated/<game_name>/`. |
| `world_definition_path` | `str` | `None` | Explicit path to a world definition JSON file. When `None`, the path is automatically resolved from `game_name` as `assets/<generated>/<game_name>/world_definitions/default.json`. |
| `env_config_path` | `str` | `None` | Explicit path to the initial environment config JSON or JSONL file. When `None`, the path is automatically resolved from `game_name` as `assets/<generated>/<game_name>/env_configs/initial.json`. |
| `enable_obs_valid_actions` | `bool` | `False` | Include the list of valid actions in each observation. **Required** for `RandomAgent` (which selects uniformly from valid actions). Optional for other agents. |

### Execution Control

These parameters control how many steps to run, reproducibility, and run resumption.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `max_steps` | `int` | `300` | Maximum number of environment steps before the episode is terminated. The episode may also end earlier if the game's termination condition is met. |
| `seed` | `int` | `42` | Random seed for reproducibility. Controls environment randomness (e.g. NPC behaviour, loot drops). |
| `resume_from_step` | `int` | `None` | Resume a previously interrupted run from the given step number. Requires that the run directory already exists and that `cumulative_config_save` was enabled during the original run. |
| `enforce_same_hardware` | `bool` | `False` | When resuming a run, verify that the current hardware (GPU model, CPU, RAM) matches the hardware recorded in the original run. Raises an error on mismatch. Useful for ensuring reproducible benchmarks. |

### Output & Logging

These parameters control where outputs are saved and how frequently checkpoints are written.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `output_dir` | `str` | `"output"` | Root directory for all evaluation outputs. Each run creates a subdirectory tree under this path. |
| `run_dir` | `str` | `None` | Explicit path for this run's output directory. When `None`, the path is auto-generated as `<output_dir>/game_<game_name>/<llm_name>/<agent>/<extras>/`. |
| `extra_dir` | `str` | `None` | An additional directory level appended under `run_dir`. Useful for organising multiple runs with the same configuration (e.g. different seeds). |
| `overwrite` | `bool` | `False` | If the run directory already exists, delete it and start fresh. Without this flag, the run will continue from the existing state. |
| `cumulative_config_save` | `bool` | `False` | Save the environment config cumulatively each step. **Required** if you intend to use `resume_from_step`. |
| `debug` | `bool` | `False` | Deprecated alias for `cumulative_config_save`. |
| `memory_dir` | `str` | `"memory"` | Name of the subdirectory (under each agent's run directory) where memory checkpoints are saved. |
| `agent_memory_save_frequency` | `int` | `5` | Save the agent's memory checkpoint every N environment steps. Set to `0` or `None` to disable periodic saves (a final checkpoint is always saved at episode end). |
| `save_dep_graph_steps` | `int` | `None` | Save a dependency graph snapshot every N steps. When `None`, dependency tracking is disabled entirely. |

## `agentodyssey run`

The CLI mirrors every parameter from `AgentOdyssey.run()` using hyphenated flag names:

```bash
agentodyssey run \
    --game-name remnant \
    --agent LongContextAgent \
    --llm-provider openai \
    --llm-name gpt-5 \
    --max-steps 300 \
    --seed 42 \
    --output-dir output \
    --overwrite \
    --enable-reflection
```

## Multi-Agent Configuration

For multi-agent evaluation, provide a JSON file via `agents_config` / `--agents_config` instead of specifying a single agent on the command line. The JSON file contains an `"agents"` array where each entry defines one agent:

```json
{
    "agents": [
        {
            "agent_type": "LongContextAgent",
            "agent_id": "agent_adam_davis",
            "agent_name": "adam_davis",
            "llm_name": "Qwen/Qwen3-4B",
            "llm_provider": null,
            "enable_short_term_memory": false,
            "short_term_memory_size": 5,
            "enable_reflection": false,
            "enable_summarization": false
        },
        {
            "agent_type": "VanillaRAGAgent",
            "agent_id": "agent_bella_chen",
            "agent_name": "bella_chen",
            "llm_name": "gpt-5",
            "llm_provider": "openai",
            "enable_short_term_memory": false,
            "short_term_memory_size": 5,
            "enable_reflection": true,
            "enable_summarization": false
        }
    ]
}
```

Each agent entry supports the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `agent_type` | `str` | Yes | Agent class name (see [Supported Agents](#supported-agents)). |
| `agent_id` | `str` | Yes | Unique identifier. Must be different for each agent. |
| `agent_name` | `str` | Yes | Human-readable name (used in game dialogue). |
| `llm_name` | `str \| null` | No | LLM model identifier. Required for LLM-based agents. |
| `llm_provider` | `str \| null` | No | LLM provider override (e.g. `"openai"`, `"vllm"`). Auto-detected if `null`. |
| `enable_short_term_memory` | `bool` | No | Enable short-term memory module. Default `false`. |
| `short_term_memory_size` | `int` | No | Sliding window size for short-term memory. Default `5`. |
| `enable_reflection` | `bool` | No | Enable reflection module. Default `false`. |
| `enable_summarization` | `bool` | No | Enable summarization module. Default `false`. |

Usage:

```bash
# eval.py
python eval.py --game_name remnant --agents_config assets/agents_configs/three_agents.json

# Python API
AgentOdyssey.run(game_name="remnant", agents_config="assets/agents_configs/three_agents.json")

# CLI
agentodyssey run --game-name remnant --agents-config assets/agents_configs/three_agents.json
```

:::warning Multi-Agent Evaluation Still in Early Stages
The multi-agent evaluation pipeline is functional but has not yet been extensively tested or benchmarked. Please expect some rough edges and report any issues you encounter on the GitHub repository.
:::

## Output Directory Structure

Each evaluation run produces the following directory tree:

```
<output_dir>/
└── game_<game_name>/
    └── <llm_name>/
        └── <AgentType>/
            └── <no_extras | with_short_term_memory | with_reflection | with_summarization>/
                ├── config.json           # (or config.jsonl if cumulative_config_save is enabled)
                └── <agent_id>/
                    ├── agent_log.jsonl   # per-step log entries
                    └── <memory_dir>/     # agent memory checkpoints
```

Each line in `agent_log.jsonl` is a JSON object:

```json
{
    "step": 0,
    "action": "go north",
    "decision_time": 1.234,
    "num_input_tokens": 512,
    "num_output_tokens": 32,
    "invalid_action": false,
    "reward": {"exploration": 1, "combat": 0, "quest": 0, "total": 1},
    "observation": "You are in the castle hall...",
    "response": "{\"action\": \"go north\"}"
}
```

| Field | Description |
|---|---|
| `step` | Zero-indexed step number. |
| `action` | The action string the agent chose. |
| `decision_time` | Wall-clock seconds the agent took to produce the action. |
| `num_input_tokens` | Number of input tokens sent to the LLM (0 for non-LLM agents). |
| `num_output_tokens` | Number of output tokens received from the LLM. |
| `invalid_action` | Whether the action was rejected by the environment's rule engine. |
| `reward` | Reward breakdown by category and total. |
| `observation` | The text observation the agent received before acting. |
| `response` | The raw LLM response string (or `""` for non-LLM agents). |
