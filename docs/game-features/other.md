# More Generated Games

The four games below were each produced by a single call to `AgentOdyssey.generate()`. They are meant to give a concrete feel for how much the generator varies across themes: the scale of the world, the custom mechanics introduced, and the shape of the quest narrative all change substantially depending on what was asked for.

## Game Statistics

| Game | Places | Areas | Objects | NPCs | Action Rules (+New) | Step Rules (+New) | Quest Chapters |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **metropolis** | 3 | 10 | 47 | 7 | 20 (+3) | 17 (+8) | 3 |
| **quarantine** | 2 | 7 | 79 | 5 | 23 (+6) | 12 (+3) | 2 |
| **robot_kingdom** | 4 | 13 | 96 | 8 | 23 (+6) | 17 (+8) | 4 |
| **saltglass** | 1 | 8 | 28 | 5 | 19 (+2) | 14 (+5) | 1 |

"+New" counts rules that do not exist in the base game. Object and NPC totals include quest-injected entities defined inside the step rules.

## Game Descriptions

### metropolis

> *A courtroom metropolis where laws rewrite physics each night.*

Metropolis is a civic-legal thriller set inside a living courthouse city. The generator introduced three new action rules (`InvokeLawRule`, `FileObjectionRule`, `AppealVerdictRule`) alongside eight new step rules that model a functioning legal ecosystem: `NightlyLawRewriteStepRule`, `BindingPrecedentStepRule`, `ContemptOfCourtStepRule`, `ContrabandSuspicionStepRule`, and a few others. The world has 47 objects spread across 10 areas, mostly legal artifacts, evidence, and craftable tools for navigating the courtroom.

**Main Quest: *The Midnight Rewrite Conspiracy***

The laws of the courtroom metropolis have been rewriting themselves at midnight, but lately the changes have grown malicious. Entire districts wake to find their rights erased and property reassigned. Someone is manipulating the Codex Engine that governs all law, and the player is summoned to the Central Courthouse to find out who.

| Chapter | Title | Summary |
|:-:|---|---|
| 1 | **The Paper Trail** | Investigate the courthouse lobby and gather the first threads of evidence, uncovering signs of tampering in the archive records. |
| 2 | **Shadows in the Statute District** | Track the conspiracy into the Statute District, confronting rogue advocates and corrupt bailiffs guarding forged subpoenas. |
| 3 | **The Final Verdict** | Confront Chief Magistrate Vosk, the mastermind behind the midnight rewrites, and restore the original charter before the next midnight strikes. |

### quarantine

> *A Resident Evil-like survival game.*

Quarantine is a survival-horror game set inside a sealed hospital overrun by infection. The generator added six action rules that fit the setting well: `BarricadeRule`, `ConcocRule`, `ShoveRule`, `EavesdropRule`, `BurnCorpsesRule`, and `RefuelRule`. On the step rules side, `CorpseCorruptionStepRule`, `QuarantineLockdownStepRule`, and `LightSourceDepletionStepRule` make the facility feel like it is actively deteriorating around the player. The world is relatively compact (2 places, 7 areas) but packed with 79 objects, mostly medical supplies, improvised weapons, and hazardous materials.

**Main Quest: *Patient Zero***

You awaken on the cold tile floor of Raccoon Hospital's lobby. Fluorescent lights flicker over overturned gurneys and shattered glass. The air reeks of antiseptic and something far worse. Shuffling footsteps echo from deeper within the building, and the exits are locked.

| Chapter | Title | Summary |
|:-:|---|---|
| 1 | **Waking Nightmare** | Get your bearings, scavenge for supplies, and piece together what triggered the outbreak. |
| 2 | **Into the Abyss** | Descend into the quarantine wing to locate Patient Zero and find a way out before a full lockdown seals the facility forever. |

### robot_kingdom

> *Ruined kingdoms unite to hunt devil-forged war machines.*

Robot Kingdom is the broadest and most campaign-like of the four games. The generator built out a full siege-warfare setting with six new action rules (`SalvageRule`, `RallyRule`, `SiphonRule`, `JamRule`, `OverloadRule`, `ScavengeRule`) that reflect a scavenger economy on a broken battlefield. Eight new step rules handle the faction simulation: `DevilForgedCorruptionStepRule`, `TerritoryReclamationStepRule`, `WarMachineCannibalizeStepRule`, `ForgeEchoMigrationStepRule`, and others that make the world feel like an active warzone.

**Main Quest: *The Siege of Broken Gears***

You arrive at the Ashen Bastion, the last fortified outpost still standing against the demon robot horde. The commander has orders for you. The bastion is barely holding and every resource counts.

| Chapter | Title | Summary |
|:-:|---|---|
| 1 | **Ashes and Orders** | Report to the Ashen Bastion, receive your first orders, and begin gathering intelligence on the horde's movements. |
| 2 | **Scorched Reconnaissance** | Venture beyond the bastion into the Scorched Vale, a blasted wasteland of craters and crumbling ruins, to map enemy positions. |
| 3 | **The Iron Gulch** | Fight through a fortified chokepoint controlled by elite war machines to clear the path toward the source of the horde. |
| 4 | **Heart of the Foundry** | Infiltrate the devil-forged Foundry at the kingdom's core and destroy the mechanism producing the endless machine army. |

### saltglass

> *Endless, blinding salt flat strewn with toppled observatories.*

Saltglass is the most minimal and atmospheric of the four games. Instead of emphasizing combat or inventory depth, it focuses on environmental mechanics and navigation. Two new action rules, `ListenRule` and `RefractRule`, let the player interact with the salt flat in ways the base game does not support. Five new step rules (`SaltGlazeStepRule`, `ForgeAlertStepRule`, `CollectUnattendedStepRule`, `ResonanceImprintStepRule`, `SaltMirageStepRule`) shape the rhythm of exploration. The single quest chapter reflects the tight, focused scope of the design.

**Main Quest: *The Salt Oath***

Across the endless salt flat, toppled observatories lie half-buried like broken compasses. Somewhere among the ruins, a surviving chart can still align the fallen spire. An oath must be carried across the flat and sealed at the spire's base before the salt wind erases the final mark.

| Chapter | Title | Summary |
|:-:|---|---|
| 1 | **Map of the Fallen Sky** | Locate a scholar in the ruins of Saltreach who holds the last surviving chart, then carry and seal the oath at the base of the fallen spire. |

## Takeaways

Together, these four games demonstrate that the generator is not just filling in a fixed template. The scale changes: saltglass is a tight single-location puzzle while robot_kingdom is a multi-region campaign. The mechanics change: each game gets action and step rules that make thematic sense for its setting rather than generic additions. And the quest structure changes: quarantine gets two brisk chapters that suit its claustrophobic feel, while robot_kingdom gets four that trace a full military arc. All four games also ship with `online_expansion` enabled, so the world can keep growing at runtime as the agent explores areas the generator left unspecified.

