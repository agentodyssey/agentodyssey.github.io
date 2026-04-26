# Troubleshooting

This page collects common issues encountered when setting up and running AgentOdyssey, along with suggested fixes.

## Agent ID not found in config agents.

**Cause:** Corrupted config.

**Fix:** Delete the run dir or use --overwrite.

## AssertionError on `assert message_items and message_items[0].content`

**Cause:** Too many reasoning tokens which exceeds max_output_tokens.

**Fix:** Increase max_output_tokens or lower reasoning effort.