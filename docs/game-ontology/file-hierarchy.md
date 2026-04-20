---
sidebar_position: 2
title: Game File Hierarchy
---

# Game File Hierarchy

Every game in AgentOdyssey — whether it is the built-in `base` game or an [LLM-generated](/game-apis/game-generation.md) one — follows an identical two-folder layout: a **game engine** folder that contains Python source files and a **game assets** folder that contains declarative JSON files. This page explains how the AgentOdyssey ontology maps onto that file structure.

## Directory Layout

A game called `<game_name>` is spread across two top-level directories:

```
assets/
├── world_definitions/
│   └── generated/<game_name>/
│       └── default.json          # World definition (defined entities and initializations)
└── env_configs/
    └── generated/<game_name>/
        └── initial.json          # Environment state checkpoint

games/generated/<game_name>/
├── world.py                  # Entity and world graph dataclasses and logic
├── agent.py                  # Agent and inventory dataclasses
├── env.py                    # Gymnasium environment (observations, stepping)
├── rule.py                   # Abstract rule and reward base classes and engine
└── rules/
    ├── action_rules.py       # Implemented action rules
    ├── reward_functions.py   # Implemented reward function
    └── step_rules/
        ├── __init__.py       # Step rule registry
        ├── general.py        # General-purpose step rules (combat, respawn, side quests, …)
        ├── main_quest.py     # Main quest step rule and quest config
        └── tutorial.py       # Tutorial room step rule
```

The base game follows the same layout at `games/base/` and `assets/world_definitions/base/` / `assets/env_configs/base/`.

## Env Config
The `initial.json` file under `assets/env_configs/generated/<game_name>/` provides a snapshot of the initial environment state. The environment reads this file on reset to bootstrap step counters, in-game time, and agent tracking state:

```json
{
  "step": 0,
  "curr_time": "0001-01-01 08:00:00",
  "curr_agents_state": {
    "area": {},
    "areas_visited": {},
    "objects_crafted": {},
    "npcs_killed": {},
    "objects_acquired": {},
    "objects_traded": {},
    "unique_npcs_killed": {}
  },
  "scores": {},
  "world": {},
  "agents": []
}
```

During evaluation this file is continuously updated to reflect the live game state, allowing runs to be paused and resumed.

---

Future chapters will provide a detailed walkthrough of the contents of each source file and asset file. For an overview of the core concepts and terminology used throughout these files, see [Ontology Overview](ontology-overview.md).
