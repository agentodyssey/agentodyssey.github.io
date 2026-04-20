// @ts-check

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.

 @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  docsSidebar: [
    "getting-started",
    {
      type: "category",
      label: "Game APIs",
      collapsible: false,
      collapsed: false,
      items: ["game-apis/full-api-reference", "game-apis/game-generation"],
    },
    {
      type: "category",
      label: "Game Ontology",
      collapsible: false,
      collapsed: false,
      items: [
        "game-ontology/ontology-overview",
        "game-ontology/file-hierarchy",
        "game-ontology/world-definitions",
        "game-ontology/world-dynamics",
        "game-ontology/world-graph-syn",
        "game-ontology/game-environment",
        "game-ontology/agent-interface",
      ],
    },
    {
      type: "category",
      label: "Game Features",
      collapsible: false,
      collapsed: false,
      items: ["game-features/base", "game-features/v1", "game-features/v2", "game-features/other"],
    },
    {
      type: "category",
      label: "Agent Implementations",
      collapsible: false,
      collapsed: false,
      items: [
        "agent/agent-paradigms",
        "agent/unified-designs",
        "agent/implementing-agents",
      ],
    },
    "evaluation-metrics",
    "visualization",
    "troubleshooting",
  ],
};

export default sidebars;
