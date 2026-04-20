---
sidebar_position: 5
title: World Graph Synthesis
---

# World Graph Synthesis

The file `games/generated/<game_name>/world.py` serves two purposes. First, it declares the Python dataclasses that represent every entity in the game: `Object` (along with its subclasses `Container` and `Writable`), `NPC`, `Area`, `Place`, `Path`, and the top-level `World` container. These dataclasses are what the rest of the engine works with at runtime. For a full reference of every field on these dataclasses, see the [World Definition](./world-definitions.md) page, which documents the JSON schema that maps one-to-one onto these classes. Second, and more importantly for this page, `world.py` contains the `World.generate()` pipeline that takes a world definition JSON and a random seed and produces a fully instantiated, connected, and populated world graph.

This page walks through how that synthesis works.

:::info Customized World Graph Synthesis
The pipeline below only describes the default logic. The rule generator can access and modify `world.py` as part of the generation pipeline, so you can customize or extend the synthesis logic if you want to create specific types of worlds that require special handling.
:::

## Pipeline Overview

When the environment resets, it calls `World.generate(world_definition, seed)`. The method runs six stages in order:

1. **Place and area instantiation**
2. **Object synthesis**
3. **NPC synthesis**
4. **Graph connectivity** (within places, then between places)
5. **Object distribution**
6. **NPC assignment**

Each stage uses its own independent random generator derived from the base seed, so adding or removing entities in one category does not change the randomness of another.

## Stage 1: Place and Area Instantiation

The engine iterates over every place entry in `entities.places` from the world definition and creates `Place` and `Area` instances. Each area gets its `level` directly from the JSON, with one exception: the spawn area (specified in `initializations.spawn.area`) is always forced to level 1, regardless of what the definition says. This ensures the agent starts in the easiest possible area.

After this stage the engine has a flat collection of `Place` and `Area` instances, but they are not connected yet.

## Stage 2: Object Synthesis

Every entry in `entities.objects` is parsed into an `Object` dataclass (or its subclasses like `Container` or `Writable` depending on the object's `category` and `usage` fields).

The engine also builds two lookup tables during this stage: a name-to-ID map (so the rest of the engine can resolve display names to IDs) and an ingredient-to-product map (so the crafting feedback system can tell the agent which new recipes just became available).

Any JSON fields that are not part of the reserved schema are collected into an `extra` dict on the dataclass, accessible as regular Python attributes. This means you can add arbitrary metadata to objects in the JSON without touching the engine's source code.

## Stage 3: NPC Synthesis

Every entry in `entities.npcs` is parsed into an `NPC` dataclass. At this point the engine is only creating *prototype* NPCs, not the actual instances that will appear in the world. The prototypes store base stats and scaling slopes. Actual instances with concrete levels, HP, and attack power are created later during NPC assignment.

## Stage 4: Graph Connectivity

Connectivity happens in two passes.

### Intra-place connections

For each place, the engine takes the list of area IDs, shuffles them randomly, and chains them together in sequence. Area A connects to area B, B connects to C, and so on. This guarantees that every area within a place is reachable from every other area in that place, while keeping the topology random across seeds.

Some of these edges may be **locked**. If the place itself is marked as `unlocked: false` in the world definition and there are objects with `usage: "unlock"` (i.e. keys), the engine has a 60% chance of locking each intra-place edge and assigning a random key object as the required unlock item.

### Inter-place connections

The engine then connects places to each other. It shuffles all place IDs and chains them in sequence, picking one random area from each place as the bridge endpoint. The locking logic for inter-place edges depends on the unlock status of both places.

## Stage 5: Object Distribution

Object distribution is the most involved stage. The engine divides the object pool into several categories and distributes them across all areas except the spawn area.

### Object pools

The engine classifies objects into pools based on their attributes:

| Pool | Criteria | Description |
|------|----------|-------------|
| **Craft pool** | Has non-empty `areas` list, not a given object, not undistributable | Area-specific raw materials and intermediates |
| **Global pool** | No crafting recipe, no area binding, not undistributable | Generic items that can appear anywhere |
| **Station pool** | `category` is `"station"`, not undistributable | Crafting stations like workbenches and furnaces |
| **Unlock pool** | `usage` is `"unlock"` or `"lockpick"`, not undistributable | Keys and lockpicks |

Objects listed in `initializations.undistributable_objects` are excluded from all pools entirely. They can only enter the game through specific mechanics like NPC drops or quest rewards.

### Distribution logic

For each non-spawn area, the engine samples objects using weighted random selection (`random.choices` with replacement). The number of items placed per area scales with the area level: higher-level areas get slightly fewer total draws but the same item can be selected multiple times.

The weighting scheme favours objects that match the area:

| Object type | Weight |
|-------------|--------|
| Craft material whose `areas` list includes this area, and whose level matches the area level | 0.8 |
| Craft material within ±1 level of the area | 0.4 |
| Craft material outside that range | 0.1 |
| Global pool object | 0.03 |
| Unlock pool object | 0.01 |

This means raw materials overwhelmingly appear in the areas they are assigned to and at the level they are designed for, while keys and generic items are rare everywhere. Stations are capped at one per area.

Currency objects like coins get a separate pass: each area has a 50% chance of receiving some coins, with the quantity scaling with the area level.

### Writable and container instantiation

Writable objects (like paper and books) and containers (like bags) are special. Instead of placing the same object ID in multiple areas, the engine creates unique *instances* with distinct IDs (e.g. `obj_paper_0`, `obj_paper_1`). This is because each writable can hold different text and each container tracks its own inventory, so they need separate identities.

### Spawn area override

After distributing objects everywhere else, the engine handles the spawn area separately. It clears any randomly placed objects from the spawn area and instead places exactly the items specified in `initializations.spawn.objects` (previously named `starting_objects`).

## Stage 6: NPC Assignment

NPC assignment works differently for unique and non-unique NPCs.

### Unique NPCs

Each unique NPC (e.g. a named merchant or a quest-specific character) is placed in exactly one randomly chosen area, excluding the spawn area and any NPCs that have the `quest` flag set (those are placed by the quest step rules instead). The unique NPC's level is drawn from the host area's level ±1, weighted towards the area's own level:

| Level relative to area | Weight |
|----------------------|--------|
| area level − 1 | 0.2 |
| area level | 0.6 |
| area level + 1 | 0.2 |

For level-1 areas, the −1 option is dropped.

### Non-unique NPCs

Non-unique NPCs (e.g. goblin warriors) can spawn multiple times across the map. For each non-spawn area, the engine calculates an enemy budget between `⌊level / 2⌋` and `level`. It then iterates over all non-unique NPC prototypes and, with probability proportional to the area level, creates a new instance and assigns it to that area. Higher-level areas get more enemies and have a higher chance of spawning each prototype.

Each instance is created through `NPC.create_instance()`, which deep-copies the prototype and scales its stats:

$$\text{HP} = \text{base\_hp} + \text{slope\_hp} \times (\text{level} - 1)$$

$$\text{attack} = \text{base\_attack\_power} + \text{slope\_attack\_power} \times (\text{level} - 1)$$

The instance also receives a random coin purse and a randomly populated inventory drawn from the prototype's object list, both scaling with level. Each instance gets a unique ID (e.g. `npc_goblin_warrior_0`, `npc_goblin_warrior_1`) so the engine can track them individually.

### Spawn area NPCs

If the world definition specifies NPCs under `initializations.spawn.npcs`, those are placed in the spawn area after clearing any randomly assigned NPCs.

## Dynamic World Expansion

Beyond the initial synthesis, `world.py` also supports expanding the world graph at runtime through `World.expand()`. When the `auto_expansion` feature is enabled, the `WorldExpansionStepRule` can call this method to add new places, areas, objects, and NPCs on the fly as the agent explores boundary regions.

The expansion pipeline mirrors the initial synthesis: it parses new entity definitions, creates place and area instances, connects them to the existing graph by bridging to the furthest reachable area from the spawn point, and then populates the new areas with objects and NPCs. The bridge is always unlocked so the agent can reach the new content immediately.

Each new area is populated with a mix of objects assigned by the LLM that generated the expansion, existing objects selected by level proximity as a fallback, and new expansion-specific craft materials. NPC assignment follows the same level-scaled budgeting logic as the initial synthesis.

## Seeding and Reproducibility

`World.generate()` derives six independent random generators from the single input seed, one for each concern: NPC parsing, place instantiation, intra-place connections, inter-place connections, object distribution, and NPC assignment. This design means that changes to one part of the world definition (say, adding a new object) do not cascade into different NPC placements or graph topologies. As long as the seed stays the same and you only modify one entity category, the rest of the world remains stable.
