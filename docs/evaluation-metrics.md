# Evaluation Metrics

AgentOdyssey evaluates agents with two categories of metrics. **Game progress** measures how far the agent advances through the game's objectives. **Diagnostic testing** probes specific capabilities like world knowledge, episodic memory, exploration breadth, and behavioral diversity.

## Game Progress

Game progress is measured using the reward system defined in the game's ontology. The **main reward** is the `quest` reward, which tracks how many main quest stages the agent has completed. The **supplementary reward** is the sum of `side_quest`, `exploration`, `craft`, and `defeat` rewards, which together capture progress outside the main quest line.

To visualize both components together and compare agents fairly, we normalize each component against the global maximum observed across all runs. Let $R^{\text{main}}_t$ and $R^{\text{sup}}_t$ denote the cumulative main and supplementary rewards up to step $t$. We compute reference maxima across all runs:

$$M_{\text{main}} = \max_{\text{runs},\, t}\; R^{\text{main}}_t, \qquad M_{\text{sup}} = \max_{\text{runs},\, t}\; R^{\text{sup}}_t$$

The normalized combined reward is then:

$$R^{\text{combined}}_t = \frac{1}{2} \left( \frac{R^{\text{main}}_t}{M_{\text{main}}} + \frac{R^{\text{sup}}_t}{M_{\text{sup}}} \right)$$

This ensures both components contribute equally despite differing magnitudes, and keeps the combined metric bounded in $[0, 1]$ for comparison across agents and LLM backbones.

## Diagnostic Testing

Beyond reward signals that directly reflect game progress, we evaluate a suite of diagnostic tests targeting key capabilities for test-time continual learning agents. The question generation scripts live in `tools/` and the diagnostic evaluation script is `tools/diagnostic_eval.py`.

### World Knowledge QA

Multiple-choice questions are generated to evaluate how well the agent understands the game world's facts, rules, and structure. Questions span seven categories: crafting ingredients, ingredient quantities, NPC inventories, object distributions across areas, spatial connections between areas, action rule mechanics, and step rule mechanics.

For most categories (crafting, NPC, distribution, spatial), the ground-truth answer is derived from the game's world definition in a rule-based manner. An LLM is then used only to generate plausible distractors, which are mixed roughly 50/50 with real-but-incorrect game entities to make common-sense guessing unreliable. For action rule and step rule questions, the LLM generates the entire question and answer set, conditioned on the actual rule source code. Objects and areas closer to the agent's spawn point are sampled more frequently, since the agent has more opportunity to encounter them during gameplay.

World Knowledge QA is evaluated **twice** per agent, once before gameplay (to establish a baseline) and once after. This measures not only the final accuracy but also the knowledge the agent acquired through interaction.

The generation script is `tools/generate_world_knowledge_qa.py`:

```bash
python tools/generate_world_knowledge_qa.py \
  --game_name remnant \
  --env_config_path output/game_remnant/gpt-5/LongContextAgent/no_extras/config.json \
  --world_definition_path assets/world_definitions/generated/remnant/default.json \
  --action_rules_path games/generated/remnant/rules/action_rules.py \
  --step_rules_path games/generated/remnant/rules/step_rules/general.py \
  --augment_candidates \
  --llm_provider openai \
  --llm_name gpt-5-mini
```

Pass `--full` to generate all possible questions rather than sampling a subset. Pass `--augment_candidates` to use an LLM for generating additional distractor candidates. The output JSON is later consumed by `diagnostic_eval.py`.

### Episodic Memory QA

Multiple-choice questions are constructed from the agent's actual trajectory, covering visited areas, crafted and acquired objects, dropped objects, defeated NPCs, and temporally ordered actions. These questions evaluate the agent's episodic memory, specifically its ability to recall specific events from its own past experience.

All episodic questions are **entirely rule-based** with no LLM involvement. Ground-truth answers come from the game state (areas visited, objects crafted, NPCs killed) and the agent's action log. Distractors are drawn from the universe of real game entities that the agent did not interact with. The generator also produces sequence-completion questions ("given these five consecutive actions, what did you do next?") and location-specific questions ("where did you drop this object?") to test temporal and spatial recall.

The generation script is `tools/memory_test/episodic.py`. It is typically called programmatically by `diagnostic_eval.py` rather than from the command line, but can also be imported directly:

```python
from tools.memory_test.episodic import generate_episodic_qa

episodic_qa = generate_episodic_qa(
  world_definition_path="assets/world_definitions/generated/remnant/default.json",
  env_config_path="output/game_remnant/gpt-5/LongContextAgent/no_extras/0/config.json",
  agent_log_path="output/game_remnant/gpt-5/LongContextAgent/no_extras/0/agent_adam_davis/agent_log.jsonl",
  num_samples_per_category=20,
  seed=0,
)
```

### Object and Action Exploration

Area exploration is already captured by the `exploration` reward, but objects and actions are equally central to successful gameplay. We report two additional exploration metrics. **Object Exploration (OE)** measures the proportion of objects the agent has acquired (picked up or stored) out of all available objects. **Action Exploration (AE)** measures the proportion of available action types the agent has actually executed. Together these capture how broadly the agent interacts with the environment beyond simply visiting new areas.

### Action Diversity

We quantify action diversity over the agent's action history using entropy computed within a sliding window. An effective agent should maintain sufficiently diverse behavior rather than repeatedly executing a small set of actions or exhibiting a sharp decline in diversity over time.

The action diversity score is defined as:

$$\text{AD} = -\frac{\sum_{i=1}^{N} p_i \log p_i}{\log N}$$

where $N$ is the total number of available actions and $p_i$ is the empirical probability of action $i$ within the window. The denominator normalizes the score to $[0, 1]$, where 1 indicates a perfectly uniform distribution over all action types.

## Running Diagnostic Evaluation

After a game run completes, `tools/diagnostic_eval.py` orchestrates the full diagnostic evaluation. It builds the agent, optionally loads its saved memory, loads pre-generated World Knowledge QA, generates Episodic Memory QA on the fly from the agent's log, prompts the agent to answer each question, and computes per-category and overall accuracy.

```bash
python tools/diagnostic_eval.py
  --game_name remnant
  --agent_full LongContextAgent_withreflection
  --llm_provider huggingface
  --llm_name Qwen/Qwen3-4B
  --world_definition_path assets/world_definitions/generated/remnant/default.json
  --enable_memory
```

Pass `--enable_memory` to load the agent's saved memory before prompting (producing `results_after.json`). Without it, the agent answers from scratch (producing `results_before.json`). Comparing the two reveals how much the agent's memory mechanism contributes to its answers. Pass `--overwrite` to re-evaluate even if results already exist.
