---
sidebar_position: 1
title: "Features: Base"
---

# Game Features: Base

The base game ships with a written world definition file and a complete set of implemented action rules, step rules, and a default reward function that together define a playable text-world RPG. The latter lives under `games/base/rules/` and is automatically loaded by the environment at initialization time (see [Game Environment](/docs/game-ontology/game-environment.md) for how that works). This page quickly walks through the philosophies under the base game's world definition, and gives a tour of what each rule does without repeating the abstract interfaces already covered in [World Dynamics](/docs/game-ontology/world-dynamics.md). The base game is the starting point for all generated games, so these features are present in every game variant unless explicitly removed and modified by the generator.

## World Definition

The base game's world definition provides a compact starting map with **2 places and 6 areas**: Greenwood Forest (plain at level 3, river at level 1, hills at level 2) and Old Castle (hall at level 1, armory at level 3, library at level 2). The forest starts unlocked; the castle is locked behind a key gate. The agent spawns in the castle hall with 10 coins, 2 keys, a small bag, paper, a pen, and a workbench already on the ground.

### Crafting Hierarchy

Crafting is built around deep, multi-step chains across four raw material families — **wood**, **cloth**, **stone**, and **iron** — plus a rare **star-metal** tier. Each family follows a progression of 3–5 processing steps (e.g. wood log → plank → strip → rod) before becoming usable in weapon or armor recipes. Materials branch at intermediate stages so that the same raw input feeds into both weapon and armor crafting paths.

Two crafting stations gate progress: the **workbench** (required for nearly every recipe) and the **furnace** (required for metal smelting). A workbench is provided at spawn; the furnace must be crafted. Key crafting (iron bar → key blank → key) is especially important since keys are consumed when unlocking paths and the agent only starts with two.

These deep hierarchies ensure that the agent must learn and execute long multi-step plans to reach high-tier equipment, which is necessary for defeating tougher enemies and accessing higher-level areas.

### NPCs

The base game defines three NPC types: **Elinor Gray** (merchant), **Marcus Dane** (friendly scout), and the **goblin warrior** (enemy, non-unique, level-scaled with 20 HP and 10 attack per level). Goblins drop goblin eyes and cloth on death.

## Action Rules

The base game registers **17 action rules**. Each one maps a verb (the first word of the agent's action string) to game logic that validates the action, mutates the world, and returns feedback text. The table below groups them by purpose.

### Combat

**`wait`** — The agent idles for a turn. Outside of combat this has no mechanical effect. During active combat, however, waiting fully recovers the agent's stamina back to 100% and resets the consecutive-attack counter. This makes it an important pacing tool: after several consecutive attacks stamina drops by 20% each time (down to a 20% floor), so the agent must decide when to pause and recover.

**`defend`** — The agent takes a defensive stance for the current step. While defending, any incoming NPC damage is reduced to just 10%. Stamina also partially recovers (50% of the missing portion). Like `wait`, defending resets the agent's consecutive-attack counter. The defending state is cleared at the end of each step, so the agent must re-issue it every turn it wants to stay protected.

**`attack <npc>`** — The agent deals one round of damage to a target NPC. Damage equals the agent's current attack power multiplied by current stamina (so tired agents hit weaker). If the NPC is currently in a `defend` state, damage is further reduced to 10%. Attacking a hostile NPC that has a combat pattern automatically initiates rhythm-based combat (see `CombatRhythmStepRule` below), after which the NPC will respond each step according to its pattern. When an NPC's HP reaches zero, it is removed from the area and all items in its inventory are dropped on the ground as loot. The agent cannot attack invincible quest guide NPCs.

### Movement and Exploration

**`enter <area>`** — The agent moves to a connected neighboring area by name. The rule looks up the target among the current area's neighbors. If the connecting path is locked, the agent must be holding a key, which is consumed to unlock the path in both directions. If no matching neighbor exists, or the path is locked and the agent has no key, the action fails with an error message.

### Item Manipulation

**`pick up <object>`** — Picks up one unit of an object from the ground in the current area into the agent's hand. The agent has two hands and can hold at most two objects at once. If both hands are full, the action fails and the agent is told there is not enough space.

**`drop <object>`** — Drops one unit of an object from the agent's hand onto the ground in the current area, freeing up a hand slot.

**`store <amount> <object> <container>`** — Stores a specified quantity of an object into a container or the agent's equipped inventory. Objects are sourced from the agent's hands first, then from the ground. The rule checks container capacity (based on each object's size) and silently reduces the amount if space is insufficient. Containers themselves cannot be nested inside other containers. If the target is `inventory`, the agent must have a container equipped as inventory first.

**`discard <amount> <object> <container>`** — Removes a specified quantity of an object from a container or inventory and places it on the ground in the current area. Unlike `drop` (which works on hand-held items), `discard` works on items stored inside containers. If the requested amount exceeds what is available, the rule adjusts down automatically.

**`take out <object> <container>`** — Takes one unit of an object out of a container or inventory back into the agent's hand. Like `pick up`, this requires a free hand slot. The container can be held in hand, equipped as inventory, or sitting on the ground in the current area.

**`equip <object>`** — Equips an item currently held in hand. There are two equip modes: if the object is a container (e.g. a bag), it becomes the agent's inventory, giving the agent portable storage; if the object is armor, it is worn and its defense value is added to the agent's defense stat. Only one container and one armor piece can be equipped at a time. Writable objects and other non-equippable categories are rejected.

**`unequip <object>`** — Moves an equipped item back into the agent's hand, requiring a free hand slot. If the unequipped item is a container, the inventory link is removed (but items inside the container are preserved). If it is armor, the agent's defense is reduced accordingly.

### Crafting and Knowledge

**`craft <amount> <object>`** — Crafts the specified number of copies of an object. The rule checks that the object has a known recipe (a set of ingredients and optional dependencies). Ingredients are items that get consumed in the process and can be sourced from the agent's hands, inventory, or held containers. Dependencies are items that must be present in the current area but are not consumed (e.g. a workbench or furnace). If the agent lacks sufficient ingredients for the full amount, the rule automatically crafts as many as possible. Crafted items appear on the ground in the current area.

**`inspect <object>`** — Inspects an object to reveal information about it. If the target is `inventory`, it shows the contents and remaining capacity of the equipped container. If the target is a container (bag, chest, etc.), it lists what is stored inside. For regular objects, it displays the object's description, any text written on it (for writable objects), and which items can be crafted using it as an ingredient. The object must be accessible to the agent (in hand, equipped, in inventory, or on the ground in the current area).

**`write <text> on <writable>`** — Writes text on a writable object such as paper. The agent must be holding both a writing tool (e.g. a pen) and the writable object in hand. Each writable has a maximum text length, and writing is truncated if the limit is reached. This action is used during quests where the agent must record information.

### Social and Economy

**`talk to <npc>`** — Talks to an NPC in the current area. The NPC's description and dialogue text are returned as feedback. If the NPC is a merchant, the feedback also lists all items the merchant has for sale along with their prices. Quest-related NPCs (guide, chronicler, etc.) deliver quest-relevant dialogue through this action.

**`buy <amount> <object> from <npc>`** — Buys items from a merchant NPC. The agent pays with coins, which are automatically collected from hands, inventory, and held containers. If the agent does not have enough coins, or the merchant is out of stock, the purchase fails. Purchased items are placed on the ground in the current area (not directly into the agent's hands).

**`sell <amount> <object> to <npc>`** — Sells items to a merchant NPC. Items are consumed from the agent's hands, inventory, and held containers. The payout is 50% of each item's defined value, and the coins are placed on the ground. The merchant must have enough coins to afford the purchase. Containers and writable objects cannot be sold.

## Step Rules

Step rules run automatically after every agent action, in priority order. The base game has **9 step rules** that handle combat, progression, questing, and world dynamics.

### Combat and Survival

**Agent Attack Update** (priority 1) recalculates each agent's attack power at the start of every step based on what the agent is currently holding. If the agent has a weapon in hand, its attack bonus is applied on top of the agent's base attack; otherwise the agent reverts to base stats. This means swapping weapons mid-fight or dropping a weapon immediately changes combat effectiveness.

**Combat Rhythm** (priority 2) drives the turn-based combat loop. Once the agent attacks a hostile NPC that has a defined combat pattern, rhythm combat begins. The NPC's combat pattern is a fixed sequence of actions (combinations of `attack`, `defend`, and `wait`) that repeats cyclically. Each step while combat is active, the NPC advances one position in its pattern and executes that action. On an `attack` action, the NPC deals damage equal to its attack power minus the agent's defense; if the agent is defending, that damage is further reduced to 10%. On `defend`, the NPC takes a stance that reduces incoming damage to 10%. On `wait`, the NPC idles. Combat ends when either the NPC or the agent dies, or the agent leaves the area (which removes that NPC from the active combat list). When all active combats end, the agent's stamina and consecutive-attack counter are reset.

**Active Attack** (priority 6) introduces ambient danger from hostile NPCs. Each step, every enemy NPC in the same area as the agent (that is not already in rhythm combat) has a small random chance of attacking. The probability scales with the area's level, ranging from 5% in low-level areas to 15% in the highest-level areas. If the agent is already in rhythm combat with other NPCs, the ambient attack probability is halved to 2.5%. The damage from ambient attacks is half the NPC's normal attack power (minus defense), and defending still reduces it to 10%. This keeps hostile areas consistently dangerous even when the agent is not actively engaging enemies.

**Death and Respawn** (priority 7) triggers when an agent's HP drops to zero or below. Everything the agent was carrying is dropped in the area where they died: items in hand, equipped armor, equipped inventory container, and all items inside the inventory. The agent then respawns at the starting (spawn) area with full HP but completely empty-handed, with no equipped items, no inventory container, and zero defense. A death event is emitted, which the reward function picks up as a penalty.

### Feedback

**New Craftable Feedback** (priority 5) monitors what items the agent has acquired and checks whether any of them serve as ingredients in crafting recipes. When the agent obtains an item for the first time, this rule lists all recipes that use it as an ingredient, including the full ingredient list for each recipe (if the `show_crafting_recipes` feature is enabled). This is suppressed while the agent is in the tutorial room. The rule helps the agent progressively discover the crafting tree as it explores and picks up new materials.

### Progression and Questing

**Tutorial Room** (priority 1) runs a 28-step interactive tutorial for agents that have just spawned. When the environment starts and tutorial is enabled, a dedicated Tutorial area is created and connected to the spawn point. All agents are teleported into this area before the game begins.

The tutorial is designed around a learn-by-doing philosophy. Rather than explaining game mechanics with lengthy verbal descriptions, each step directly instructs the agent to perform a specific action and lets the agent observe the effect from the environment's feedback. The prompts are deliberately minimal: each step shows a short label (e.g. "Pick up the bag") and the exact action string the agent should type (e.g. `pick up small_bag_0`). There is no explanation of *why* the action works or what happens internally. The agent learns the relationship between actions and their effects purely by seeing the feedback that comes back. When a situational constraint arises (for example, when the agent's hands are full and it needs to pick up something else), the tutorial does not explain the concept of hand capacity or ask the agent to reason about it. Instead, it simply instructs the agent to store or drop something first, and the agent observes the result. This removes all reasoning burden from the tutorial and focuses entirely on demonstrating the physical actions and their outcomes.

The 28 steps cover: picking up objects, equipping a container as inventory, inspecting inventory, unequipping, storing items into held containers, inspecting containers, taking items out, dropping items, re-equipping inventory, storing into and discarding from inventory, picking up a pen and paper, writing on a writable, preparing coins for trading, talking to an NPC, buying from a merchant, inspecting non-container objects to discover crafting recipes, managing hand space (by storing an item when hands are full), selling to a merchant, defeating an enemy NPC, gathering crafting ingredients and stations, performing multi-step crafting (intermediate material then final product), and finally using a crafted key to unlock and enter a locked exit. Each step is gated by an event or state check, and the tutorial re-prompts the agent if it takes an incorrect action.

Once all agents complete the tutorial, the Tutorial area and all tutorial-only entities (NPCs, objects) are cleaned up and removed from the world. Any additional actions that exist beyond the base game (from generated game variants) are listed for the agent at the end.

**Main Quest** (priority 2) drives the central storyline. The base game's main quest, *The Tide and the Ember*, spans two chapters built around exploration, memory, crafting, and combat. In Chapter 1 (*The Furnace Oath*), the agent must find a chronicler NPC who reveals a number (the "oath"), locate a shrine in one of several candidate regions, write the remembered number on a piece of paper and leave it at the shrine to prove memory, and then defeat a shrine guardian boss. In Chapter 2 (*The Ocean Mystery*), the agent must find a special tide-merchant to buy a rare crafting material (the Heart of the Ocean), remember a sea-word the merchant reveals, locate a boss lair in another set of candidate regions, write the remembered word at the lair entrance, and defeat a stronger final boss that is weak to a specially crafted water sword. An invincible objective guide NPC is placed in the world to give the agent directions and track chapter progress. Quest-specific NPCs (chronicler, bosses, merchants) and objects (crafting materials, the water sword recipe) are injected into the world definition at initialization and distributed across existing areas. Advancing a quest stage emits a `quest_stage_advanced` event that feeds into the reward function, and completing the final boss ends the quest.

**Side Quests** (priority 3) are unlocked once the agent has explored at least two areas beyond the spawn point. Four scenario types are randomly generated from the world's current state: **collect** (gather a specific number of a non-craftable object found somewhere in explored areas), **craft** (craft a target item whose recipe ingredients exist in explored areas), **talk** (find and speak to a specific NPC located somewhere in the world), and **trade** (buy a specific item from a merchant NPC). A side quest guide NPC is placed near the agent to track progress and list current tasks. On completion, the agent receives a coin reward (1 to 3 coins for collect/talk, 3 to 6 coins for craft/trade) and a `side_quest_completed` event is emitted. New tasks of the same type are generated when the agent explores additional areas, so the side quest pool stays fresh as the world grows.

### World Dynamics

**World Expansion** (priority 100) keeps the world from running out of content. When the agent has explored all currently accessible areas, this rule uses an LLM to generate a new batch of places, areas, objects, NPCs, and crafting recipes that extend the map. The generated content follows difficulty-progression guidelines (level 1-2 for basics, level 3-4 for intermediate, level 5+ for advanced) so that expansions produce tougher enemies, rarer materials, and deeper crafting chains as the agent advances. Area names are kept short and generic (e.g. "clearing", "ridge") since the containing place already provides thematic context. The generation prompt enforces mechanical usefulness: every material must appear in at least one recipe, every NPC must drop useful loot or sell useful items, and crafting chains should form multi-step progressions from raw materials to equipment. Because the LLM call can be slow, the expansion runs asynchronously in the background and is stitched into the world once the result is ready and validated.

## Reward Breakdown

The base game uses `DefaultRewardFunction`, which computes a per-agent `RewardBreakdown` at the end of every step. The breakdown tracks eight components: **exploration** (+1 for each newly visited area), **craft** (+1 for each new object type crafted), **kill** (+1 per NPC killed), **unique kill** (+1 per unique NPC type killed for the first time), **trade** (+1 for each new object type traded), **quest** (+1 when a main quest chapter is advanced), **side quest** (+1 on side quest completion), and **death** (+1 penalty when the agent dies). Each component contributes to both a scalar score and an XP total; accumulated XP feeds into the agent's leveling system. Notably, no rewards are granted while the agent is still inside the tutorial area, so the tutorial serves purely as a learning phase.
