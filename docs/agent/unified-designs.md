# Unified Designs

A core design goal of AgentOdyssey is experimental fairness. Agents built on different memory paradigms differ fundamentally in how they store and retrieve experience, so we unify everything else: the interface each agent sees, the prompts it receives, and the metrics it is scored on. This page describes the three pillars of that unification.

## Unified Interface

Every agent in AgentOdyssey inherits from a single base `Agent` class that defines the contract between an agent and the game environment. The key interface points are:

- **`act(obs)`**: called once per step with a text observation. Delegates to `_act(obs)` to be overriden.
- **`available_actions`**: a property that dynamically discovers all action rules registered in the current game variant. Every agent, regardless of paradigm, sees exactly the same action space.
- **`save_memory(dir)` / `load_memory(dir)`**: persistence hooks for checkpointing and resuming. The evaluation harness calls these uniformly; what gets saved (a text file, a FAISS index, LoRA weights, latent vectors) is an implementation detail invisible to the harness.

Agent implementations are composed with the base class at runtime via a factory/mixin pattern. For example, `create_long_context_agent(Agent)` produces a new class that inherits from both `LongContextAgent` and the game-specific `Agent`. This means swapping one agent paradigm for another requires changing only the factory call; the environment, observation format, and evaluation pipeline remain identical.

## Unified Prompt

Because prompt wording can significantly affect LLM behavior, we centralize all shared prompt logic in a single base configuration class (`LLMAgentConfig` in `agents/llm_agent_config.py`). Every LLM-based agent either uses `LLMAgentConfig` directly or inherits from it, which guarantees that the following components are identical across paradigms:

- **System prompt.** Describes the agent's role, lists the full action space (dynamically generated from the game's registered action rules), specifies the strict JSON output format (`{"reasoning": "...", "action": "..."}`), and states the rules for valid responses.
- **Response parser.** Extracts the JSON object from the LLM's response, validates structure, and falls back to a safe `"wait"` action on parse failure.
- **Reflection prompt.** When reflection is enabled, the same template asks the agent to analyze its situation, identify failure patterns, and derive concrete lessons.
- **Summarization prompt.** When summarization is enabled, the same template asks the agent to distill key information from its observation–reasoning–action text.

What varies across paradigms is the **user prompt constructor**, which decides how memory is presented to the model. This lives on the agent class itself, since it is tightly coupled to the agent's retrieval logic. Paradigm-specific configs (e.g. `ParamAgentConfig`, `RAGAgentConfig`) subclass `LLMAgentConfig` only when they need to add knobs such as training hyperparameters or retrieval `k`. This separation ensures that any performance difference between paradigms is attributable only to how they manage memory.

## Unified Evaluation

All agents are evaluated with the same set of metrics, computed in the same way regardless of paradigm. For a detailed description of the metrics, see [Evaluation Metrics](evaluation-metrics.md).

### End-to-End Pipeline

A typical evaluation run follows this flow:

1. **Run the game**: `eval.py` steps the agent through the environment for a fixed number of steps, logging every action, observation, reward, and token count.
2. **Post-hoc QA**: `tools/posthoc_eval.py` loads the agent (with and without memory) and evaluates it on World Knowledge and Episodic Memory questions.
3. **Collect results**: `tools/collect_results.py` aggregates scores across runs and produces comparison tables with all metrics.

Because every agent goes through the same pipeline, the results are directly comparable.
