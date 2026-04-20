---
sidebar_position: 6
title: Game Environment
---
# Game Environment

The file `games/generated/<game_name>/env.py` defines `AgentOdysseyEnv`, a [Gymnasium](https://gymnasium.farama.org/)-compatible environment that ties together the world graph, agents, rule engines, and reward function into a runnable game loop. This page explains how the environment initializes, how each step works, and a few other things worth knowing about.

For the world graph that the environment operates on, see [World Graph Synthesis](./world-graph-syn). For the rule abstractions it dispatches, see [World Dynamics](./world-dynamics). For how this file fits into the broader layout, see [Game File Hierarchy](./file-hierarchy).

:::info Customized Game Environment
The `AgentOdysseyEnv` class described below is the default environment used for all games, but it can be modified by the rule generator to create custom environment classes with different mechanics or interfaces.
:::

## Initialization

When `AgentOdysseyEnv` is constructed, it receives a seed, one or more agent instances, a path to the [world definition](./world-definitions) JSON, a run directory for output, and a config path for checkpointing. A few optional flags control features like valid-action lists and dependency graph export.

During `__init__`, the environment does the following:

1. **Loads the world definition** from JSON and, if `"main_quest"` or `"side_quest"` appear in `custom_events`, injects any additional entities required by those quest systems (quest NPCs, quest objects) into the definition.

2. **Discovers all rules** using Python's `inspect` module. It scans the game's `action_rules` module for every concrete subclass of `BaseActionRule` and builds an `ActionRuleEngine` from them. It does the same for `step_rules`, collecting every concrete `BaseStepRule` subclass and sorting them by priority

3. **Sets up the reward function** using `DefaultRewardFunction`. This can be swapped for a custom implementation by subclassing `RewardFunction`.

4. **Loads or initializes the config** from the checkpoint file at `config_path`. If a previous run exists, the environment can resume from any saved step.

## Reset

The game begins when `reset()` is called. There are two modes depending on whether the environment is starting fresh or resuming from a checkpoint.

### Fresh start

The environment calls `World.generate(world_definition, seed)` to synthesize the full world graph (see [World Graph Synthesis](./world-graph-syn) for how that works). It then initializes per-agent tracking state:

- **Location**: every agent is placed in the spawn area specified by `initializations.spawn.area`
- **Progress tracking**: areas visited, objects crafted, objects traded, NPCs killed, and objects acquired are all initialized to empty
- **Tutorial state**: each agent starts with tutorial not yet passed
- **Quest progress**: main quest and side quest tracking is initialized to no progress
- **Combat state**: active combats, defending flag, stamina, and consecutive attack counters are initialized

After all state is set up, the environment writes the initial checkpoint to disk and runs a **bootstrap step**: it calls `step()` with a `wait` action for every agent. This bootstrap step (internally step −1 → step 0) fires all step rules once so that systems like the tutorial room can set up their initial state before the agent takes any real action.

Finally, `reset()` generates the initial observation for each agent and returns it.

### Resuming from checkpoint

Instead of generating a new world, the environment reconstructs the world from the saved config using `World.from_dict()`. Each agent's inventory, equipment, stats, and XP are restored from the checkpoint. All tracking state (combat, quests, expansion) is reloaded. The environment then produces observations from the restored state without running a bootstrap step.

## The Step Loop

Each call to `step(action_strs)` takes a dict mapping agent IDs to their action strings and advances the game by one tick. The step proceeds in several phases:

### 1. State snapshot

Before anything happens, the environment takes a shallow copy of the current tracking state: areas visited, NPCs killed, objects crafted, and objects traded. This snapshot is later passed to the reward function so it can diff against the post-step state to figure out what changed.

### 2. Action rule dispatch

For each agent, the environment:

1. **Parses** the agent's free-text action string into a verb and parameter list using `parse_action()`. The parser tries to match the longest known verb prefix (so "pick up" matches before "pick"), then splits the remainder into parameters using shell-style tokenization (respecting quoted strings).

2. **Dispatches** the parsed action through the `ActionRuleEngine`. The engine looks up the matching `BaseActionRule` by verb, validates the parameter count, and calls `apply()`. If the action string cannot be parsed or the verb is not recognized, the engine writes an error message to the agent's feedback and defaults to `wait`.

All feedback and events produced by action rules are collected into a shared `RuleResult`.

### 3. Step rule execution

After all agents' actions have been dispatched, the environment runs every step rule in priority order. Step rules receive a `RuleContext` with `agent=None` (since they are not tied to any specific agent) and the same shared `RuleResult`.

### 4. Time advancement

The in-game clock advances by 10 minutes (configurable via `step_delta_time`).

### 5. Reward computation

The environment calls `reward_function.compute()`, passing in the pre-step state snapshot and the `RuleResult`. The default reward function diffs the snapshots to count new exploration, crafting, kills, and trades, and scans the event list for quest completions and agent deaths. It returns a `RewardBreakdown` per agent. The XP component of each breakdown is fed into `Agent.gain_xp()`, which may trigger level-ups.

### 6. Observation generation

For each agent, the environment builds a natural-language observation string by calling `verbalize_obs()`. All displayed objects, NPCs, and areas are in their names instead of internal IDs. If `enable_obs_valid_actions` is set, the observation also includes a structured list of all valid actions the agent can currently take. This is used by some agent implementations (like `RandomAgent`) that need to pick from a concrete action set rather than generating free text.

### 7. Checkpoint update

The environment serializes the full game state (world graph, agent states, scores, step counter, time) to the config file. This makes every step resumable.

### Return value

`step()` returns a tuple of `(observations, rewards, terminated, info)`:

- `observations`: dict mapping agent ID to `{"step": int, "text": str}` (and optionally `"valid_actions"`)
- `rewards`: dict mapping agent ID to `RewardBreakdown`
- `terminated`: always `False` (AgentOdyssey games do not have a terminal state; they run for a fixed number of steps set by the evaluation harness)
- `info`: the `info_flags` dict from the `RuleResult`, containing metadata like whether each agent's action was invalid

## Multi-Agent Support

The environment natively supports multiple agents. Each agent has its own entry in `curr_agents_state` tracking its location, combat state, quest progress, and so on. During each step, action rules are dispatched sequentially for each agent (in the order they appear in the agent list), but step rules run once and iterate over all agents internally. Each agent receives its own observation and reward breakdown.

:::warning Multi-Agent Evaluation Still in Early Stages
The multi-agent evaluation pipeline is functional but has not yet been extensively tested or benchmarked. Please expect some rough edges and report any issues you encounter on the GitHub repository.
:::

## Checkpointing

The environment can be fully serialized and restored. `update_config()` writes the entire game state to a JSON file: the current step, in-game time, the full world graph (via `World.to_dict()`), all agent states (inventory, equipment, HP, XP, level), per-agent tracking state, and cumulative scores. On the next run, passing the same config path with `from_config=True` in `reset()` restores the game to that exact state.

Checkpoints are written after every step by default, so a crash or interruption loses at most one step of progress.
