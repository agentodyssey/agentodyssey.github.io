---
sidebar_position: 1
title: Ontology Overview
---

This page introduces the key concepts and terminology used throughout AgentOdyssey. If you are looking for how these concepts map onto actual source files, see [Game File Hierarchy](./file-hierarchy).

The diagram below provides a visual overview of the core ontology.

![Ontology diagram](/img/doc/ontology_web.jpg)

## POMDP Formulation

AgentOdyssey models the environment as a partially observable Markov decision process (POMDP). The agent cannot see the full world state; it only receives a natural-language observation of its immediate surroundings at each step. Time advances in fixed increments of 10 simulated minutes per step, and an in-game clock is included in every observation.

The five core elements of the POMDP map onto the ontology as follows:

| POMDP element | What it means in AgentOdyssey |
|---------------|-------------------------------|
| **State** | The world graph at step $t$, plus per-agent status (location, health, inventory, etc.) |
| **Observation** | A natural-language rendering of the agent's local state and any feedback from the previous step |
| **Action** | A parameterized textual command from a fixed verb set, e.g. `pick up coin` |
| **Dynamics**| Deterministic or stochastic updates to the world graph, driven by action rules and step rules |
| **Reward** | A multi-component signal reflecting quest progress, exploration, crafting, combat, and more |

## Game Entities

The world is populated by three types of entities which are defined declaratively in the **world definition**.

### Locations

Locations have a two-level hierarchy: **places** and **areas**. A place (e.g. *Greenwood Forest*, *Old Castle*) is a named region that groups one or more areas. An area (e.g. *plain*, *armory*, *river*) is the atomic unit of space that the agent can occupy. Areas within the same place or across places are connected by **paths**, which can be locked or unlocked. Each area also has a **level** that influences which objects and NPCs appear there.

### Objects

Objects cover everything the agent can interact with: raw materials, crafting stations, tools, weapons, armor, containers, currency, and consumables. Each object has attributes like `category`, `usage`, `value`, `size`, and optional combat stats (`attack`, `defense`). Objects can also have crafting recipes defined by a set of **ingredients** (other objects consumed during crafting) and **dependencies** (objects that must have been crafted first before this recipe unlocks).

### NPCs

Non-playable characters are either **enemies** or **friendly**. Enemy NPCs have a `combat_pattern` (a repeating sequence of attack, defend, and wait actions) and level-scaled stats (`slope_hp`, `slope_attack_power`) that make them stronger in higher-level areas. Friendly NPCs fill roles such as merchants (who buy and sell items) and quest givers (who assign side quests).

## World Graph

Together, the entities and their spatial relationships form the **world graph**. Each node in the graph is an area instance, containing the object instances and NPC instances currently present in that area. Each edge is a path connecting two areas, optionally locked behind a key or quest requirement.

The world graph at a given step $t$ is the **state** $s_t$. The initial world graph is sampled from the world definition: higher-level NPCs and objects are more likely to spawn in higher-level areas, creating a natural difficulty progression across the map.

## Observations

At every step the agent receives a natural-language observation that includes:

- Current in-game time
- Current location (place and area)
- Feedback from the previous action and any triggered step rules
- Items in hand and equipped items
- Objects visible in the current area
- NPCs and other agents in the current area
- Agent stats: level, attack, defense, health, experience
- Names of neighboring areas

The observation is always partial. The agent can only see what is in its current area, so it must build and maintain an internal belief about the rest of the world from memory.

## World Dynamics

The world evolves through a modular two-stage rule system: **action rules** and **step rules**. Both rule types follow the same pattern: check preconditions against the current state, apply state transitions, and emit feedback to the observation.

### Action Rules

Action rules are triggered when the agent performs a specific verb. They capture instantaneous, player-invoked operations like picking up an object, entering a neighboring area, attacking an NPC, crafting an item, or buying from a merchant. Each action rule validates its parameters, checks whether the action is possible given the current state, and then mutates the world graph accordingly.

Actions can form long-range dependencies over time. For example, an object dropped by a defeated NPC might become a crafting ingredient many steps later. Playing well therefore requires the agent to maintain episodic memory across extended sequences of actions.

### Step Rules

Step rules run automatically at the end of every environment step, regardless of what action the agent took. They encode persistent, stateful processes such as:

- Combat rhythm (NPCs follow their attack pattern during active combat)
- NPC active attack
- Death and respawn
- Tutorial progression
- Main quest and side quest advancement
- Dynamic world expansion (generating new areas on the fly)

Many step rules test the agent's memory through indirect, under-specified environmental cues. For instance, enemy NPCs may become stronger during certain in-game hours. These patterns are never explicitly told to the agent; they have to be inferred from accumulated experience.

### Deterministic and Stochastic Transitions

Unlike environments that rely purely on deterministic rules, AgentOdyssey supports both deterministic and stochastic state transitions. Some action rules succeed with a defined probability (e.g. lock-picking), and some step rules introduce random events (e.g. spawning an NPC near the agent at midnight with a 50% chance). This means agents cannot simply memorize outcomes; they need to reason under uncertainty.

## Goals

Goals in AgentOdyssey are formulated as **quests**, each providing textual cues to guide the agent and delivering feedback and rewards upon completion.

### Main Quests

Main quests form a linear chain of objectives with temporal dependencies: each stage can only be completed after the previous one is done, creating a coherent storyline. They are implemented as a step rule that tracks progress through the quest stages.

### Side Quests

Side quests are independent tasks with no preconditions. They can be picked up and completed in any order at any time. Quest-giver NPCs assign these tasks to the agent during dialogue. They are also implemented as a step rule.

## Rewards

The reward signal is multi-component. Each component captures a different aspect of the agent's progress:

| Component | What it measures |
|-----------|-----------------|
| **Quest** | Number of completed main quest stages |
| **Side quest** | Number of completed side quests |
| **Exploration** | Number of newly visited areas |
| **Craft** | Number of unique object types crafted |
| **Defeat** | Number of unique NPCs defeated; two NPCs with the same type but various levels are two unique NPCs |
| **Trade** | Number of unique object types traded |
| **Death** | Agent death count (penalty) |

Each component also contributes to an XP total that drives the agent's leveling system. Leveling up increases the agent's max HP and base attack power.
