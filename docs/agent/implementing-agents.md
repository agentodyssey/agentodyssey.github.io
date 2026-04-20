# Implementing Agents

This page walks through the process of implementing a new agent in AgentOdyssey, using `LongContextAgent` as a running example. By the end you will understand the four things every agent needs: a config, an agent class, a factory function, and a registration entry.

## Step 1: Config

Every LLM agent needs a configuration dataclass. The base class `LLMAgentConfig` already provides the system prompt, action space formatting, response parser, reflection/summarization prompts, and LLM provider factory (see [Unified Designs](unified-designs.md)). If your paradigm does not need any extra parameters, you can use `LLMAgentConfig` directly without subclassing.

`LongContextAgent` is one such case: its only paradigm-specific behavior (the user prompt constructor) lives on the agent class itself, so it accepts a plain `LLMAgentConfig`:

```python
class LongContextAgent:
    def __init__(self, id: str, name: str, cfg: Optional[LLMAgentConfig] = None):
        ...

    def construct_user_prompt_long_context(self, memory: str, observation: str) -> str:
        memory_prompt = "My Memories: " + memory if memory else ""
        user_prompt = memory_prompt + f"My Current Observation: {observation}\n{self.action_prompt}"
        return user_prompt
```

When your paradigm *does* need additional parameters, subclass `LLMAgentConfig`. For example, `LoRASFTAgent` trains a LoRA adapter online, so it ships with a `ParamAgentConfig` that adds training hyperparameters:

```python
@dataclass
class ParamAgentConfig(LLMAgentConfig):
    max_seq_len: int = 4096
    lr: float = 5e-6
    epochs: int = 2
    batch_size: int = 2
    grad_accum: int = 1
    fp16: bool = True

    @property
    def lora_config(self) -> dict:
        return {
            "r": 16,
            "alpha": 32,
            "dropout": 0.05,
            "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj"],
        }

    def construct_user_prompt(self, observation: str) -> str:
        return f"My Current Observation: {observation}\n{self.action_prompt}"
```

The decision of whether to subclass comes down to one question: does your paradigm introduce knobs that someone running the agent might want to change from the command line or config file? If yes, subclass. If no, reuse `LLMAgentConfig`.

## Step 2: Agent Class

The agent class is where your memory mechanism lives. It must implement five things:

1. **`__init__(self, id, name, cfg=None)`**: initialize config, memory, and LLM
2. **`_act(self, obs)`**: the decision loop (retrieve, prompt, generate, parse, memorize, return)
3. **`memorize(self, info)`**: store a piece of text into memory
4. **`save_memory(self, full_memory_dir)`**: persist memory to disk
5. **`load_memory(self, full_memory_dir)`**: restore memory from disk

You also need a `memory_paths` attribute, which is a list of filenames your agent writes to inside its memory directory. The evaluation harness uses this to check whether a saved checkpoint exists.

We'll present `LongContextAgent` in full below.

```python
class Memory:
    def __init__(self):
        self.context: str = ""

    def add(self, info: str):
        self.context += info + "\n"

    def get_all_memory(self) -> str:
        return self.context

    def reset(self):
        self.context = ""

    def load(self, path: str) -> None:
        if not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            self.context = f.read()

    def save(self, path: str) -> None:
        atomic_write(path, self.context)


class LongContextAgent:
    def __init__(self, id: str, name: str, cfg: Optional[LLMAgentConfig] = None):
        super().__init__(id, name)
        if cfg:
            cfg.available_actions = self.available_actions
            cfg.__post_init__()
            self.cfg = cfg
        else:
            self.cfg = LLMAgentConfig(available_actions=self.available_actions)
        self.memory = Memory()
        self.memory_paths = ["content.txt"]
        self.llm = self.cfg.get_llm()
```

A few things to note about `__init__`:

- **`super().__init__(id, name)`** calls the game `Agent`'s constructor via MRO. This is what sets up inventory, HP, and other game state.
- **The two-phase config init.** The config is created first (by `eval.py`), but the action space is not yet known. Inside `__init__`, we attach `available_actions` from the base `Agent` and call `__post_init__()` again to finalize the system prompt with the formatted action list.
- **`self.llm = self.cfg.get_llm()`** creates the LLM client. The provider (OpenAI, vLLM, HuggingFace, etc.) is determined by the config's `llm_provider` field.

The decision loop:

```python
    def _act(self, obs: Dict[str, Any]):
        obs_text = obs["text"]
        retrieved_text = self.memory.get_all_memory()

        # Optional reflection
        if self.cfg.enable_reflection and retrieved_text:
            reflection = self.cfg.reflect(self.llm, obs_text, retrieved_text)
            if reflection:
                self.memorize(reflection)

        # Build prompt and generate
        prompt_memory = self.memory.get_all_memory()
        user_prompt = self.construct_user_prompt_long_context(prompt_memory, obs_text)
        lm_output = self.llm.generate(user_prompt=user_prompt, system_prompt=self.cfg.system_prompt)

        # Parse response
        parsed = self.cfg.response_parser(lm_output["response"])
        parsed_action = parsed["action"]

        # Store observation + action into memory
        readable = self.cfg.format_response(parsed)
        to_store = f"{obs_text}\n{readable}"

        if self.cfg.enable_summarization:
            self.memorize(self.cfg.summarize(self.llm, to_store))
        else:
            self.memorize(to_store)

        return parsed_action, lm_output["num_input_tokens"], lm_output["num_output_tokens"], lm_output["response"]
```

The return value is always a 4-tuple: `(action_string, input_tokens, output_tokens, raw_response)`. The evaluation harness expects this format from every agent.

Notice that reflection, summarization, and the response parser are all called through `self.cfg`. These are shared methods from `LLMAgentConfig` that you get for free. The user prompt constructor, on the other hand, lives on the agent class, since it is the part that actually varies across paradigms. For `LongContextAgent` that means concatenating the full history; for a RAG agent it would be the top-*k* retrieved entries; for an SFT or latent agent there is no explicit memory in the prompt at all.

Persistence:

```python
    def save_memory(self, full_memory_dir: str) -> None:
        self.memory.save(os.path.join(full_memory_dir, self.memory_paths[0]))

    def load_memory(self, full_memory_dir: str) -> None:
        self.memory.load(os.path.join(full_memory_dir, self.memory_paths[0]))
```

The harness calls `save_memory` periodically during gameplay (default every 5 steps) and once at the end. It calls `load_memory` at startup if a checkpoint exists. Use `atomic_write` from `utils.py` when writing files, as it writes to a temporary file first and atomically replaces the target, preventing corruption if the process is interrupted.

## Step 3: Factory Function

The factory function creates the combined class at runtime:

```python
@lru_cache(maxsize=None)
def create_long_context_agent(Agent: Type):
    class_name = f"LongContextAgent__{Agent.__module__}.{Agent.__name__}"
    return type(
        class_name,
        (LongContextAgent, Agent),
        {"__module__": Agent.__module__, "__agent__": Agent},
    )
```

`@lru_cache` ensures the class is created only once per game variant. The naming convention `YourAgent__module.Agent` helps with debugging. This function is the same boilerplate for every agent, so just change the class names.

## Step 4: Register

Two places in `eval.py` need an entry for your new agent.

**`build_agent_config()`** maps the agent type string to its config class. Agents that reuse `LLMAgentConfig` directly group under that branch:

```python
elif agent_type in {"LongContextAgent", ...}:
    from agents.llm_agent_config import LLMAgentConfig
    return LLMAgentConfig(**common_cfg_kwargs)
```

Agents with a paradigm-specific config group under their own branch. For example, `LoRASFTAgent` uses `ParamAgentConfig`:

```python
elif agent_type in {"LoRASFTAgent", ...}:
    from agents.parametric.param_agent_config import ParamAgentConfig
    return ParamAgentConfig(**common_cfg_kwargs)
```

**`factory_map` in `instantiate_agent()`** maps the agent type string to the module and factory function:

```python
"LongContextAgent": ("agents.long_context_agent", "create_long_context_agent"),
"LoRASFTAgent":     ("agents.parametric.lora_sft_agent", "create_lora_sft_agent"),
```

After this, your agent can be selected from the command line:

```bash
python eval.py --game_name remnant --agent LongContextAgent --llm_provider openai --llm_name gpt-5
```

## Summary

| What | Where | Purpose |
|---|---|---|
| Config dataclass | `agents/<paradigm>/<config>.py` (or reuse `LLMAgentConfig`) | Paradigm-specific parameters, if any |
| Agent class | `agents/<paradigm>/<agent>.py` | Memory mechanism: init, act, memorize, save, load, plus the user prompt constructor |
| Factory function | Same file as agent class | Composes your mixin with the game `Agent` at runtime |
| Registration | `eval.py` (two entries) | Connects the CLI agent name to your config and factory |

Everything else is shared infrastructure that your agent inherits automatically.
