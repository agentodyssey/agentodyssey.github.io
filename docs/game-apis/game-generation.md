# Generating Games

AgentOdyssey ships with a built-in base game, but its core strength is the ability to generate entirely new game worlds from natural-language descriptions. The generation pipeline creates places, objects, NPCs, action and step rules, and quest chapters from a single CLI command or Python call.

## Overview

Generation runs in four stages:

1. **Scaffold** copies the base game into `games/generated/<name>/` and the corresponding asset directories, giving you a working game skeleton.
2. **Entity generation** populates the world definition with places, areas, objects, and NPCs that match your theme. This stage **completely rewrites** the entities section of the world definition.
3. **Rule generation** adds new action rules and step rules. Unlike entities, rules are **appended** to the existing rule files; the base rules are never removed or modified.
4. **Quest generation** writes a main quest into `step_rules/main_quest.py`. Like entities, this **completely rewrites** the quest step rule file.

After all stages finish, a smoke test runs a `RandomAgent` for 1000 steps to verify the world loads and runs without errors.

:::warning Reliability Note
We have found that **Claude Opus 4.6** is generally able to produce games that are mostly bug-free. However, logical errors can still occur because the full environment codebase is large and some changes may require coordinated edits in places that the coding agent does not recognize, even though we provide most of the relevant files as context to all generators. We believe that with better reasoning abilities of future models, we can achieve near-perfect reliability, but for now we recommend carefully reviewing generated code and running the smoke test before proceeding to evaluation.
:::

## Quick Start

```bash
agentodyssey generate "a pirate-themed island adventure"
agentodyssey run --agent HumanAgent --game-name pirate
```

Or generate with full control:

```bash
agentodyssey generate "a haunted castle with undead enemies" \
    --game-name haunted \
    --num-places 4 \
    --num-objects 20 \
    --num-npcs 10 \
    --max-level 7 \
    --num-quest-chapters 2 \
    --quest-description "Defeat the Lich King and restore the castle" \
    --num-action-rules 2 \
    --num-step-rules 1 \
    --generate-graph \
    --llm-name gpt-5
```

Generate with no description to get a random fantasy world:

```bash
agentodyssey generate
```

## Entity Generation

*Source: `tools/generators/entity_generator.py`*

The entity generator creates places (each containing 2 to 4 areas), objects (weapons, armor, materials, consumables, containers, tools, etc.), and NPCs (merchants, enemies, quest givers). It reads the existing action rules and step rules to infer which entity categories, usages, and NPC roles are required, so the generated content is rules-aware.

| Flag | Default | Description |
|---|---|---|
| `--num-places` | `2` | Number of places to generate. |
| `--num-objects` | `10` | Number of objects to generate across all categories. |
| `--num-npcs` | `5` | Number of NPCs to generate across all roles. |
| `--max-level` | `5` | Maximum difficulty level. Entities are distributed across levels 1 through this value. |
| `--backend` | `"llm"` | `"llm"` for direct structured LLM output, `"aider"` for code-aware generation with iterative testing. The default is `"llm"` because coding agents tend to struggle with structured JSON edits as large as a full world definition file, whereas the LLM backend generates entities programmatically and merges them with full validation. |
| `--generate-graph` | off | When set, the LLM also generates an explicit area connection graph in the world definition. LLMs are quite good at producing topology-aware graphs, and having a predefined graph at this stage is helpful because the quest planner can later plan quest progression around the known area layout (e.g. gating locked areas behind keys for later chapters). |
| `--llm-name` | `"gpt-5"` | LLM model for generation. |
| `--llm-provider` | auto-detected | LLM provider to use: `openai`, `azure`, `azure_openai`, `claude`, `gemini`, `vllm`, or `huggingface`. If omitted, the provider is inferred from the model name. |

## Rule Generation

*Source: `tools/generators/rule_generator.py`*

The rule generator adds new action rules (player actions) or step rules (automatic per-step dynamics) to the game. Rules are always appended to the existing rule files; the generator verifies that no existing rule classes are removed or modified.

| Flag | Default | Description |
|---|---|---|
| `--num-action-rules` | `0` | Number of new action rules to auto-generate. The LLM first suggests a novel dynamic, then a coding agent implements and tests it. |
| `--num-step-rules` | `0` | Number of new step rules to auto-generate. |
| `--llm-name` | `"gpt-5"` | LLM model for the coding agent. |
| `--llm-provider` | auto-detected | LLM provider (`openai`, `claude`, `gemini`, etc.). Inferred from the model name if omitted. |

You can also provide explicit descriptions of rules you want instead of letting the LLM suggest them. This is available through the Python API via the `new_action_rules` and `new_step_rules` list parameters.

## Quest Generation

*Source: `tools/generators/quest_generator.py`*

The quest generator writes the main quest into `step_rules/main_quest.py`. It runs a two-stage pipeline:

1. **LLM Planner** builds a structured quest spec as JSON. The planner prompt includes entity summaries, available actions, area topology, and existing step rules so that objectives are grounded in what the world actually contains.
2. **Code Generation** compiles the structured spec into executable Python code for the `MainQuestStepRule`, including all completion conditions (e.g. "visited 3 of these 5 areas", "talked to NPC X while carrying object Y").

| Flag | Default | Description |
|---|---|---|
| `--num-quest-chapters` | `1` | Number of main-quest chapters to generate. Set to `0` to skip quest generation. |
| `--quest-description` | `None` | Theme for the quest. Falls back to the game description if not provided. |
| `--branching-factor` | `1` | Controls the goal structure within each chapter (see below). |
| `--llm-name` | `"gpt-5"` | LLM model for the planner and code generation. |
| `--llm-provider` | auto-detected | LLM provider (`openai`, `claude`, `gemini`, etc.). Inferred from the model name if omitted. |
| `--branching-factor` | `1` | See below. |

### Goal Tree Structure

The `--branching-factor` flag determines how quest objectives are organized within each chapter.

With `--branching-factor 1` (the default), stages are purely sequential: the player completes one objective before the next unlocks. This produces a linear quest structure like that in the built-in `remnant` game.

With `--branching-factor 2` or higher, each chapter is structured as a **goal tree**. A root goal decomposes into sub-goals (up to `branching_factor` children per node), and those sub-goals may further decompose until reaching leaf nodes. Leaf goals carry concrete completion conditions (e.g. "visited 3 of these 5 areas", "defeated NPC X while carrying object Y"), and parent goals unlock bottom-up as their children are completed. This creates a DAG of objectives that allows the player to tackle certain goals in parallel rather than following a single linear path.

:::info Controlling Difficulty
Beyond `--branching-factor` and `--max-level`, the most flexible way to influence game difficulty is through the description itself. You can specify things like "break the quest into shorter, easier sub-goals", "make combat encounters forgiving", or "require the player to solve multi-step puzzles across distant areas" directly in your `--quest-description` or top-level description, and the LLM planner will incorporate those constraints when generating objectives and conditions. Please make use of the description to steer the generator towards the kind of gameplay experience you want, not only limited to controlling difficulty!
:::

## Python API

All of the above is also available through `AgentOdyssey.generate()`, which calls the same generator scripts under the hood. See `agentodyssey.py` for the full signature. The returned `GeneratedGame` object has a `.run()` method that delegates to `AgentOdyssey.run()` with the game name pre-filled:

```python
from agentodyssey import AgentOdyssey

game = AgentOdyssey.generate("a pirate island", num_places=3, num_quest_chapters=2)
game.run(agent="LongContextAgent", llm_provider="openai", llm_name="gpt-5")
```
