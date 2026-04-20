---
sidebar_position: 6
title: Agent Interface
---

# Agent Interface

The file `games/generated/<game_name>/agent.py` defines three classes: `Agent`, `Action`, and `Inventory`. Most of the conceptual background on agents is covered in [Game Ontology](./ontology-overview), so this page focuses more on the implementation.

## Overview

`Agent` is the player entity. It holds the agent's stats (HP, attack, defense, level, XP), tracks what the agent is carrying (`items_in_hands`) and wearing (`equipped_items_in_limb`), and exposes an `act(obs)` method that subclasses override to implement decision-making.

`Action` is a small dataclass with `name`, `verb`, `params`, and `description`. The agent's `available_actions` property is computed dynamically by scanning the game's action rules module at runtime, so the action list always stays in sync with whatever rules are defined.

`Inventory` wraps a `Container` instance (from `world.py`) and provides property aliases like `.items` and `.capacity` so that the rest of the codebase can access inventory contents without knowing about the underlying container. The inventory starts detached and only becomes usable once the agent equips a container object like a bag.

## Inventory as a Container Attachment

The inventory does not store items on its own. Instead, it holds a reference to a `Container` object from the world graph. When the agent equips a container (e.g. a small bag), the environment sets `inventory.container` to that container instance. From that point on, `inventory.items` delegates directly to `container.inventory` and `inventory.capacity` delegates to `container.capacity`. If the agent has no container equipped, accessing these properties raises a `RuntimeError`.

This design means inventory state lives in the world graph rather than on the agent, which keeps serialization simple: the inventory checkpoint only stores the container's ID, and on restore it re-attaches to the matching container instance.

## Leveling

`Agent.gain_xp(amount)` adds XP and handles level-ups. Each level requires 100 XP. On each level-up, max HP increases by 20, current HP increases by 20, and base attack (`min_attack`) increases by 5. The method returns the number of levels gained, which the environment uses to emit feedback to the agent.

## Subclassing

The `Agent` class is meant to be subclassed. The `_act(obs)` method is the extension point: it receives the observation dict and should return an action string. All 16 agent implementations in the `agents/` directory (LLM agents, RAG agents, parametric agents, etc.) inherit from `Agent` and override this method.

## Notes

- `available_actions` is a property, not stored state. It introspects the action rules module on every access. The environment can swap the rules module via `_action_rules_module` to point at a different game's rules, and the action list updates automatically.
- `items_in_hands` tracks objects the agent is holding but has not stored or equipped. This is separate from `equipped_items_in_limb` (armor, weapons, containers being worn) and `inventory.items` (objects stashed inside a container).
- `attack` is the *effective* attack power, recalculated each step by the `AgentAttackUpdateStepRule` based on equipped weapons. `min_attack` is the base value that increases with leveling.
