---
sidebar_position: 3
title: World Definitions
---

# World Definitions

The world definition file (`assets/world_definitions/generated/<game_name>/default.json`) is the single source of truth for what exists in a game world. It is a pure-data JSON file that declares all game entities, their attributes, the initial spawn configuration, and feature flags. No game logic lives here. The game engine reads this file during `World.generate()` and uses it to instantiate and distribute entities across the world graph.

If you are unfamiliar with terms like "world graph", "action rules", or "step rules", see the [Game Ontology](./ontology-overview) page first. For how this file fits into the broader file layout, see [Game File Hierarchy](./file-hierarchy).

## Top-Level Structure

```json
{
  "entities": { ... },
  "initializations": { ... },
  "graph": { ... },  // optional predefined graph structure
  "custom_events": [ ... ],
  "features": { ... }
}
```

| Key | Description |
|-----|-------------|
| `entities` | All game entities: places (with areas), objects, and NPCs |
| `initializations` | Where the agent spawns, what items it starts with, and which objects are excluded from random distribution |
| `custom_events` | In-game events (selected from main quest, side quest, tutorial room) to be enabled |
| `features` | Env-level features (e.g., dynamic world expansion) to be enabled |

## Entities

The `entities` object has three arrays: `places`, `objects`, and `npcs`. Each entry in these arrays corresponds to an entity *definition* (i.e. a template). At runtime the engine instantiates the definitions into concrete instances and distributes them across the world graph.

### Places

A place is a named region (e.g. "Greenwood Forest") that contains one or more areas. Areas are the atomic spatial unit in the game. The agent is always located in exactly one area at a time.

```json
{
  "type": "place",
  "id": "place_greenwood_forest",
  "name": "Greenwood Forest",
  "unlocked": true,
  "areas": [
    {
      "type": "area",
      "id": "area_forest_plain",
      "name": "plain",
      "light": true,
      "level": 3,
      "neighbors": {
        "area_forest_river": { "locked": false }
      }
    },
    {
      "type": "area",
      "id": "area_forest_river",
      "name": "river",
      "level": 1
    }
  ]
}
```

**Place fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | Always `"place"` |
| `id` | string | yes | Unique identifier, conventionally `place_<snake_case_name>` |
| `name` | string | yes | Display name shown to the agent |
| `unlocked` | bool | yes | Whether the place is accessible from the start. Locked places require the agent to unlock a path to reach them |
| `areas` | array | yes | List of area definitions belonging to this place |

**Area fields (nested inside a place):**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | yes | — | Always `"area"` |
| `id` | string | yes | — | Unique identifier, conventionally `area_<snake_case_name>` |
| `name` | string | yes | — | Display name shown to the agent |
| `level` | int | yes | — | Difficulty level. Higher-level objects and NPCs spawn more frequently in higher-level areas |
| `neighbors` | object | no | `{}` | Predefined connections to other areas. Each key is an area ID and the value is `{ "locked": bool }`. The engine also generates additional random connections within and between places, so you do not need to wire up every edge by hand |
| other | any | no | — | Generated rules may create more custom fields on area definitions, for example, `light` for game v1. |

:::tip
You only need to specify neighbors when you want a *guaranteed* connection (for example, a locked gate between two specific areas). The engine handles the rest of the graph connectivity automatically.
:::

### Objects

Objects are anything the agent can interact with: raw materials, crafted items, weapons, armor, tools, containers, currency, and writable items like paper or notes.

```json
{
  "type": "object",
  "id": "obj_iron_sword",
  "name": "iron sword",
  "category": "weapon",
  "usage": "attack",
  "value": 50,
  "size": 3,
  "description": "A sturdy sword forged from iron.",
  "attack": 21,
  "defense": 0,
  "level": 3,
  "areas": ["area_castle_armory"],
  "craft": {
    "ingredients": { "obj_sharpened_iron_blade": 1, "obj_wooden_rod": 1 },
    "dependencies": ["obj_stone_sword"]
  }
}
```

**Object fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | yes | — | Always `"object"` |
| `id` | string | yes | — | Unique identifier, conventionally `obj_<snake_case_name>` |
| `name` | string | yes | — | Display name shown to the agent |
| `category` | string | yes | — | One of: `"raw_material"`, `"weapon"`, `"armor"`, `"tool"`, `"container"`, `"currency"`, `"station"`, or any custom category |
| `usage` | string | yes | — | What the object does: `"attack"`, `"defense"`, `"unlock"`, `"lockpick"`, `"write"`, `"writable"`, or empty string for passive objects |
| `value` | int | no | `null` | Price in coins. Objects with a value can be bought/sold at merchants |
| `size` | int | yes | — | How much space the object takes in a container |
| `description` | string | no | `""` | Shown when the agent inspects the object |
| `text` | string | no | `""` | Content of writable objects (e.g. a note's text) |
| `attack` | int | no | `0` | Attack bonus when the object is held in hand |
| `defense` | int | no | `0` | Defense bonus when the object is equipped; only works for armors |
| `level` | int | no | `1` | Objects are more likely to spawn in areas of matching level |
| `quest` | bool | no | `false` | If true, the object is reserved for quest mechanics |
| `areas` | array | no | `[]` | Area IDs where this object may be distributed. If empty, the object is placed through the global pool |
| `craft` | object | no | `{}` | Crafting recipe (see below) |
| other | any | no | — | Generated rules may create more custom fields on object definitions, for example, `hp_increase` for consumables in game v1. |

Note that the categories and usages are not a fixed schema. You can create new ones and write custom rules that depend on them. For example, you could add a `"food"` category with `usage: "eat"` and then write a step rule that restores health when the agent eats food.

**Category-specific fields:**

Some categories require additional fields:

| Category | Extra field | Type | Description |
|----------|-----------|------|-------------|
| `container` | `capacity` | int | Maximum total size of items that fit inside |
| writable (`usage: "writable"`) | `max_text_length` | int | Maximum character count for writing |

**Crafting recipes:**

The `craft` object has two sub-fields:

| Sub-field | Type | Description |
|-----------|------|-------------|
| `ingredients` | object | Map of `object_id → count`. These objects are consumed when crafting |
| `dependencies` | array | List of object IDs that must have been crafted at least once before this recipe unlocks |

If an object has no `craft` field (or it is empty), the object cannot be crafted and must be found in the world.

:::tip
You can add arbitrary extra fields to any object entry. The engine collects anything outside the reserved field set into an `extra` dict on the `Object` dataclass, accessible as regular attributes in Python. This lets you attach custom metadata without modifying the source code. For full details on how object entries are parsed into dataclasses, see the World module documentation.
:::

### NPCs

NPCs are either enemies that the agent can fight, or friendly characters with roles like merchant or quest giver.

**Enemy NPC example:**

```json
{
  "type": "npc",
  "id": "npc_goblin_warrior",
  "name": "Goblin Warrior",
  "enemy": true,
  "unique": false,
  "role": "goblin",
  "description": "A small but fierce creature.",
  "base_hp": 30,
  "base_attack_power": 5,
  "slope_hp": 20,
  "slope_attack_power": 10,
  "combat_pattern": ["attack", "attack", "defend", "attack", "wait"],
  "objects": ["obj_goblin_eye", "obj_cloth"]
}
```

**Friendly NPC example:**

```json
{
  "type": "npc",
  "id": "npc_elinor_gray",
  "name": "Elinor Gray",
  "enemy": false,
  "unique": true,
  "role": "merchant",
  "description": "A traveling merchant who sells weapons and armor.",
  "base_hp": 1000,
  "base_attack_power": 10,
  "slope_hp": 50,
  "slope_attack_power": 5,
  "objects": ["obj_paper", "obj_pen", "obj_iron_sword", "obj_stone_plate_armor"]
}
```

**NPC fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | yes | — | Always `"npc"` |
| `id` | string | yes | — | Unique identifier, conventionally `npc_<snake_case_name>` |
| `name` | string | yes | — | Display name shown to the agent |
| `enemy` | bool | yes | — | Whether this NPC is hostile |
| `unique` | bool | yes | — | If true, exactly one instance is placed in the world. If false, multiple instances can spawn across areas |
| `role` | string | yes | — | Role label, e.g. `"merchant"`, `"scout"`, `"goblin"`. Merchants can buy and sell items |
| `description` | string | no | `""` | Shown when the agent encounters or inspects the NPC |
| `base_hp` | int | no | 60 (enemy) / 1000 (friendly) | Base health points at level 1 |
| `base_attack_power` | int | no | 15 (enemy) / 10 (friendly) | Base attack power at level 1 |
| `slope_hp` | int | no | 20 (enemy) / 50 (friendly) | HP gained per level above 1. Final HP = `base_hp + slope_hp × (level - 1)` |
| `slope_attack_power` | int | no | 15 (enemy) / 5 (friendly) | Attack power gained per level. Final attack = `base_attack_power + slope_attack_power × (level - 1)` |
| `combat_pattern` | array | no | `[]` | Repeating sequence of `"attack"`, `"defend"`, and `"wait"` actions the NPC cycles through during combat. Only meaningful for enemy NPCs |
| `objects` | array | no | `[]` | Object IDs the NPC may carry in its inventory. For merchants this is the item catalog; for enemies these are potential drops |
| `quest` | bool | no | `false` | If true, the NPC is reserved for quest mechanics and will not be randomly placed |
| `dialogue` | string | no | `""` | Text shown when the agent talks to the NPC |
| other | any | no | — | Generated rules may create more custom fields on NPC definitions. |

:::info Level scaling
When the engine places a non-unique enemy NPC into an area, it creates a new instance whose level is drawn from the area's level (±1). The instance's HP and attack power are then computed from the base stats and slopes. This means a single NPC definition like "Goblin Warrior" produces increasingly dangerous instances in higher-level areas without you having to define separate entries for each difficulty tier.
:::

## Initializations

The `initializations` object controls the starting conditions for each game run.

```json
{
  "spawn": {
    "area": "area_castle_hall",
    "npcs": {},
    "objects": {
      "obj_coin": 10,
      "obj_key": 2,
      "obj_small_bag": 1,
      "obj_paper": 1,
      "obj_pen": 1,
      "obj_workbench": 1
    },
  },
  "undistributable_objects": ["obj_goblin_eye", "obj_heart_of_the_ocean"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `spawn.area` | string | The area ID where the agent begins. This area is cleared of randomly spawned objects and enemies, so the agent always starts in a safe, predictable location |
| `starting_objects` | object | Map of `object_id → count`. These items are placed in the spawn area at the start of every run |
| `undistributable_objects` | array | Object IDs that should never be randomly placed in areas. Use this for objects that should only come from specific sources, such as enemy drops or crafting |

## Graph Connections

You can also explicitly specify area-to-area connections and lockability in the world definition file. Without specifying, the engine generates a random connected graph with a certain average degree.

```json
"graph": {
  "connections": [
    {"from": "area_castle_hall", "to": "area_castle_gate", "locked": false},
    {"from": "area_castle_gate", "to": "area_forest_plain", "locked": true, "key": "obj_gate_key"}
  ]
}
```

When provided, these connections are loaded directly as the world graph links.

## Custom Events

A simple array of event type strings that the game supports. The engine's step rules check this list to decide which systems to activate. The only supported event types for now are `"main_quest"`, `"side_quest"`, and `"tutorial"`, which toggle the corresponding quest/tutorial step rules. You can also write your own custom step rules that check for custom event flags in this list to create new gameplay systems without modifying the engine code. If you omit `"main_quest"` from this list, the main quest step rule will not run. Same for `"side_quest"`.

```json
"custom_events": ["main_quest", "side_quest", "tutorial"]
```

## Features

Feature flags that toggle optional engine behaviours.

```json
"features": {
  "auto_expansion": true,
  "expansion_model": "gpt-5-mini"
}
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `auto_expansion` | bool | `false` | When enabled, the engine dynamically generates new places and areas when agents reach boundary regions of the world graph. Requires an OpenAI API key |
| `expansion_model` | string | — | The model used for generating expansion content |
