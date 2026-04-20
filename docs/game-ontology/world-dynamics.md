---
sidebar_position: 4
title: World Dynamics
---

# World Dynamics

The file `games/generated/<game_name>/rule.py` defines the abstract framework that powers all world dynamics in AgentOdyssey. Everything that happens in the game, whether triggered by the agent or by the environment itself, flows through the rule system. This page explains the core abstractions: action rules, step rules, the dispatch engine, and the reward model.

For the concrete rule implementations that ship with the base game, see the [Base Game]() pages. For how the rule system fits into the broader file layout, see [Game File Hierarchy](./file-hierarchy).

## Shared Context: `RuleContext` and `RuleResult`

Every rule, whether action or step, receives the same two objects when it runs.

### `RuleContext`

A `RuleContext` bundles everything a rule might need to read from the current game state:

| Field | Type | Description |
|-------|------|-------------|
| `env` | `AgentOdysseyEnv` | The environment instance. Gives access to `curr_agents_state`, the list of agents, configuration, and any other environment-level state |
| `world` | `World` | The instantiated world graph, including all area, object, NPC, and container instances |
| `agent` | `Agent` | The agent that performed the action. For step rules this is `None`, since step rules are not tied to a specific agent |
| `action` | `str` | The canonical verb the agent used (e.g. `"pick up"`). Empty string for step rules |
| `params` | `list[str]` | The parsed parameters that follow the verb (e.g. `["coin"]`). Empty list for step rules |
| `step_index` | `int` | The current step number |

### `RuleResult`

A `RuleResult` is the shared output buffer that rules write into. It accumulates three things:

| Field | Type | Description |
|-------|--------------------------|-------------|
| `feedback` | `dict[str, str]` | Maps agent ID to a feedback string. Rules append to this to tell the agent what happened (e.g. `"You picked up 1 coin."`) |
| `info_flags` | `dict[str, dict]` | Metadata flags for the engine, such as whether the agent's action was invalid |
| `events` | `list[Event]` | Typed events emitted during execution, used for reward computation, quest tracking, and dependency analysis |

Rules call `res.add_feedback(agent_id, text)` to append text to an agent's feedback buffer. The environment collects all feedback at the end of the step and includes it in the agent's next observation.

### `Event`

An `Event` is a lightweight typed record with three fields: `type` (a string like `"agent_died"`), an optional `agent_id`, and a `data` dict for any extra payload. Events are how rules communicate with systems outside themselves. The reward function listens for events like `"quest_stage_advanced"` and `"side_quest_completed"` to assign rewards. The quest step rules emit events to signal progress. The dependency tracker uses special `track.*` events to record causal relationships between actions.

## Action Rules

An action rule represents something the agent can *do*. It is the abstraction behind every verb in the game: `pick up`, `attack`, `craft`, `enter`, `buy`, and so on.

### `BaseActionRule`

All action rules inherit from `BaseActionRule`, an abstract base class with the following interface:

```python
class BaseActionRule(ABC):
    name: str          # internal identifier, e.g. "action_pick_up"
    verb: str          # the verb the agent types, e.g. "pick up"
    params: list[str]  # parameter names for help text, e.g. ["object"]
    param_min: int     # minimum number of parameters
    param_max: int     # maximum number of parameters (None = unlimited)
    description: str   # human-readable description of what the rule does

    def validate_params(self, ctx: RuleContext, res: RuleResult) -> bool: ...

    @abstractmethod
    def apply(self, ctx: RuleContext, res: RuleResult) -> None: ...
```

To create a new action rule, you subclass `BaseActionRule`, set the class-level attributes (`name`, `verb`, `params`, etc.), and implement the `apply` method. Inside `apply`, you read from the context (the world state, the agent, the parameters), mutate whatever needs to change (move objects, update HP, change area state), and write feedback and events into the result.

Parameter validation is handled by the base class. Before `apply` is called, `validate_params` checks that the number of parameters the agent provided falls within the `[param_min, param_max]` range. If validation fails, the engine writes an error message to the agent's feedback and skips the rule entirely, defaulting to a wait action.

### How action rules are discovered

Action rules are not registered manually. The `Agent` class uses Python's `inspect` module to find every concrete subclass of `BaseActionRule` in the game's `action_rules` module at runtime. This means you can add a new action rule simply by defining a new class in `action_rules.py` and it will automatically appear in the agent's available actions list. No registration code needed.

### `ActionRuleEngine`

The `ActionRuleEngine` is the dispatcher. When the environment initialises, it collects all action rule instances and indexes them by verb in a lookup table. During each step, after the agent's free-text action is parsed into a verb and parameter list, the engine looks up the matching rule by verb and calls its `apply` method. If no rule matches the verb, the engine writes an invalid-action message to the agent's feedback and defaults to wait.

```
Agent action string → parse_action() → (verb, params)
                                            ↓
                               ActionRuleEngine.dispatch()
                                            ↓
                                  rule.validate_params()
                                            ↓
                                      rule.apply()
```

:::tip
Action rules are implemented *statelessly* in the game versions that we ship. They can be written statefully, but we recommend maintaining states through step rules and using action rules purely as stateless transformers of the world in response to agent input, which helps keep the logic cleanly separated.
:::

## Step Rules

A step rule represents something that *happens* in the world at the end of every step based on the current environment state (e.g., world time, agent's location, etc). Step rules are the mechanism behind combat rhythms, NPC active attack, death and respawn, quest progression, dynamic world expansion, and more.

### `BaseStepRule`

All step rules inherit from `BaseStepRule`:

```python
class BaseStepRule(ABC):
    name: str          # internal identifier, e.g. "combat_rhythm_step"
    description: str   # human-readable description
    priority: int      # execution order (lower = runs first)

    @abstractmethod
    def apply(self, ctx: RuleContext, res: RuleResult) -> None: ...
```

The key difference from action rules is that step rules have no verb, no parameters, and no parameter validation. They always run. The `RuleContext` they receive has `agent` set to `None`, `action` set to an empty string, and `params` as an empty list, because step rules are not responding to any particular agent's action. Instead, they typically iterate over all agents internally and apply their logic to each one.

### Priority ordering

Step rules have a `priority` field that controls the order in which they execute within a single step. Lower numbers run first. This ordering matters because step rules can depend on each other's effects. For example, the agent attack update rule (priority 1) recalculates attack power from equipped weapons before the combat rhythm rule (priority 2) processes NPC attacks, which needs to know the agent's current attack stat.

### Action rule vs step rule

This two-tier design is central to how AgentOdyssey models world dynamics:

- **Action rules** are reactive. They fire in response to a specific agent action and affect that agent's immediate situation. They are the game's verbs.
- **Step rules** are proactive. They run unconditionally every step and model processes that evolve over time regardless of player input. They are the game's background systems.

The same `RuleContext` and `RuleResult` types are used for both, so the output interface is identical: both types of rules mutate the world, write feedback, and emit events in exactly the same way. The only structural difference is who triggers them and whether they operate on a single agent or the entire environment.

:::tip
In implementation, you can nearly always implement any non-action game logic as a step rule. For example, a rule that triggers when two agents locate in two specific areas (like the ones from *It Takes Two*) could be implemented as a step rule that checks all agent locations every step and emits an event when the condition is met.
:::

## Reward Model

The reward system is built on two classes: `RewardBreakdown` and `RewardFunction`.

### `RewardBreakdown`

It is a simple dataclass that tallies reward across categories listed in [Ontology Overview](./ontology-overview.md). Each category has a numeric value that can be positive or negative. The environment computes these values based on the events emitted by rules each step, and then feeds them into the reward function to produce a final reward signal for the agent.

The breakdown exposes three computed totals:

| Property | Formula | Use case |
|----------|---------|----------|
| `total` | Sum of all components minus `death` | General progress metric |
| `xp_total` | Weighted sum (quest × 20, trade × 10, others × 5) | Drives the agent's leveling system |
| `score_total` | `total` minus `kill` | Progress metric that excludes non-unique kills |

The XP total is fed into `Agent.gain_xp()`, which handles leveling up. Each level increases the agent's max HP by 20 and base attack by 5.

### `RewardFunction`

This is an abstract base class with a single method:

```python
class RewardFunction(ABC):
    @abstractmethod
    def compute(
        self,
        env: AgentOdysseyEnv,
        prev_state: dict,
        res: RuleResult,
    ) -> dict[str, RewardBreakdown]: ...
```

The environment calls `compute` once per step, passing in the environment instance, a snapshot of the previous state (areas visited, NPCs killed, objects crafted, objects traded), and the `RuleResult` from this step's rule execution. The function returns a `RewardBreakdown` per agent.

The default implementation (`DefaultRewardFunction` in `rules/reward_functions.py`) works by diffing the previous state against the current state to detect what changed (new areas visited, new objects crafted, new kills, new trades), and by scanning the `RuleResult`'s event list for quest and death events. You can subclass `RewardFunction` to implement a completely different reward scheme if needed.

## Dependency Tracker

`rule.py` also defines a `DependencyTracker` class that records causal dependencies between rule executions across steps. When enabled, every time a rule moves, spawns, or consumes an object, the tracker logs which previous rule execution produced that object. Over the course of a game this builds up a directed dependency graph where nodes are individual rule invocations and edges represent "this action used a resource that was produced by that earlier action." The tracker can export this graph in several formats (JSON, Graphviz DOT, Mermaid, and SVG) for analysis and visualization. This is primarily a research tool for studying long-range action dependencies in agent trajectories, and does not affect gameplay.

<br></br>
![Dependency graph example](/img/doc/dep_graph_web.jpg)

Above provides an example of a dependency graph visualized.
