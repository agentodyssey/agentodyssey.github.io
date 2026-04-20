import { useRef, useState, useEffect, useCallback } from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import styles from './index.module.css';

/* ────────────────────────────────────────
   Data — replace with your real content
   ──────────────────────────────────────── */
const AUTHORS = [
  { name: 'Zheyuan Zhang', sup: '*', href: 'https://zheyuanzhang.me/' },
  { name: 'Zehao Wen', sup: '*', href: 'https://zehaowen.com/' },
  { name: 'Alvin Zhang', href: 'https://scholar.google.com/citations?user=BLkk5kYAAAAJ' },
  { name: 'Andrew Wang', href: 'https://andrewwnlp.github.io/' },
  { name: 'Jianwen Xie', href: 'http://www.stat.ucla.edu/~jxie/' },
  { name: 'Daniel Khashabi', sup: '†', href: 'https://danielkhashabi.com/' },
  { name: 'Tianmin Shu', sup: '†', href: 'https://www.tshu.io/' }
];

const AFFILIATIONS = [
  'Johns Hopkins University'
];

const AUTHOR_NOTE = '* Equal contribution · † Equal advising';

const LINKS = [
  { label: '🎮 Interactive Demo', href: '/demo', color: 'green' },
  { label: '📖 Documentation', href: '/docs', color: 'blue' },
  { label: '📄 Paper', href: '/paper.pdf', color: 'red' },
  { label: 'Code', href: 'https://github.com/agentodyssey/agentodyssey', color: 'purple', icon: 'github' },
];

function GitHubIcon({ size = 16 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const TERMINAL_LINES = [
  { type: "input", text: "> craft 1 lockpick" },
  {
    type: "output",
    text: "Current Time: 0001-01-02 08:30:00\nCurrent Location: Old Castle, hall\n\nI successfully crafted 1 lockpick. It is now on the ground.\nEvening inspiration grants +1 lockpick.\nI was attacked by goblin_warrior_1 and lost 11 HP.\n\nI am holding no objects.\nI have equipped 1 small_bag_0.\nI see 1 paper_7, 1 pen, 1 workbench, 2 lockpick near me.\nI see bob_johnson, goblin_warrior_1 nearby.\n\nMy level is 1.\nMy attack is at 10.\nMy defense is at 0.\nMy health is at 56.\nMy experience is at 80.\n\nNeighboring areas: armory, library.",
  },
  { type: "input", text: "\n> pick up lockpick" },
  {
    type: "output",
    text: "...\nI picked up lockpick.\n...",
  },
  { type: "input", text: "\n> lockpick plain" },
  { type: "output", text: "...\nI failed to pick the lock." },
  {
    type: "output",
    text: "Tension tightens across the world. Hostile intent grows sharper and less restrained.\n...",
  },
];

const KEY_ABILITIES = [
  {
    icon: '🧭',
    title: 'Exploration',
    desc: 'Actively discovering new areas, objects, and actions to find resources and unlock future possibilities.',
    accent: '#6E3C14', // darkbrown (matches paper)
  },
  {
    icon: '🧠',
    title: 'Episodic Memory',
    desc: 'Remembering past experiences, such as where items were dropped, which areas were visited, and what happened when.',
    accent: '#2846A0', // darkroyalblue (matches paper)
  },
  {
    icon: '🌍',
    title: 'World Knowledge Acquisition',
    desc: 'Learning novel facts about the environment through interaction, such as crafting recipes and NPC behaviors.',
    accent: '#96146E', // darkmagenta (matches paper)
  },
  {
    icon: '⚔️',
    title: 'Skill Learning',
    desc: 'Acquiring procedural skills like combat strategies and note-taking to improve task efficiency over time.',
    accent: '#006E6E', // darkcyan (matches paper)
  },
  {
    icon: '🗺️',
    title: 'Long-Horizon Planning',
    desc: 'Decomposing complex objectives into subgoals and managing multiple goals across hundreds of steps.',
    accent: '#8C7814', // darkolivegold (matches paper)
  },
];

const HIGHLIGHTS = [
  {
    icon: '🎮',
    title: 'Procedural Game Generation',
    img: '/img/procedural_generation.png',
    accent: '#1d4ed8',
  },
  {
    icon: '🤖',
    title: 'Diverse Agent Paradigms',
    img: '/img/agent_paradigms.png',
    accent: '#0ea5e9',
  },
  {
    icon: '📊',
    title: 'Multifaceted Evaluation',
    img: '/img/semantic.png',
    accent: '#8b5cf6',
  },
];

const FINDINGS = [
  {
    title: 'Critical limits across all five key abilities',
    desc: 'Agents show myopic exploration that ignores useful objects, repetitive action loops despite corrective feedback, semantic hallucinations about crafting recipes and world rules, inability to acquire procedural combat strategies or note-taking skills, and frequent failure to re-anchor on primary objectives after completing subgoals.',
    highlighted: true,
  },
  {
    title: 'Performance scales with memory capacity and reasoning ability',
    desc: 'The Long Context agent achieves the strongest game progress, and performance degrades with weaker backbones (GPT-5 > GPT-5-mini > Qwen3-4B). Even the best-performing model, Claude Opus 4.6, still falls well below human performance.',
  },
  {
    title: 'Diagnostic metrics strongly correlate with game progress',
    desc: 'World Knowledge QA accuracy (+34.8% for the best agent), Episodic Memory QA accuracy, object/action exploration coverage, and action diversity all show strong positive correlation with cumulative reward. Declining action diversity coincides with reward plateaus.',
  },
  {
    title: 'Procedural generation remains contamination-resistant',
    desc: 'Together with the performance among LLM-based agents, the low accuracy in World Knowledge QA before gameplay shows that the games generated by AgentOdyssey are not saturated by frontier models, indicating no or only limited data contamination.',
  },
  {
    title: 'Short-term memory consistently boosts performance',
    desc: 'Adding short-term memory improves both RAG and SFT agents. Game progress and World Knowledge QA accuracy increase monotonically with short-term memory size. SFT agents augmented with short-term memory outperform vanilla short-term memory agents, confirming that parametric updates serve as effective long-term memory.',
  },
  {
    title: 'SFT agents exhibit catastrophic forgetting after training',
    desc: 'The SFT agents show decreased World Knowledge QA accuracy after training and very low Episodic Memory QA accuracy. This suggests that test-time training can degrade general language capability through catastrophic forgetting, so future agent training methods should focus on continuously acquiring environmental knowledge and skills without catastrophic forgetting.',
  },
  {
    title: 'Reflection and summarization do not help reasoning models',
    desc: 'Explicit reflection and summarization mechanisms provide no benefit for reasoning-capable models, which likely perform implicit reflection during their reasoning process. Adding reflection also accelerates context window exhaustion for Long Context agents.',
  },
  {
    title: 'Long Context agents face quadratic token cost',
    desc: 'While Long Context agents perform best, their cumulative token usage grows quadratically with steps, limiting the meaningful horizon under fixed budgets. Other paradigms (RAG, SFT, STM) scale linearly and can sustain longer deployments.',
  },
];

const CITATION = `@inproceedings{agentodyssey2026,
  title     = {AgentOdyssey: Open-Ended Long-Horizon Text Game Generation for Test-Time Continual Learning Agents},
  author    = {Zhang, Zheyuan and Wen, Zehao and Zhang, Alvin and Wang, Andrew and Xie, Jianwen and Khashabi, Daniel and Shu, Tianmin},
  year      = {2026},
}`;

/* ────────────────────────────────────────
   Utility Components
   ──────────────────────────────────────── */

function RevealSection({ children, className, delay = 0 }) {
  const ref = useRef(null);
  const isVisible = useIntersectionObserver(ref);
  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${isVisible ? styles.revealVisible : ''} ${className || ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}


function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button className={styles.copyButton} onClick={handleCopy} aria-label="Copy citation">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

/* ────────────────────────────────────────
   Terminal Typewriter
   ──────────────────────────────────────── */

function TerminalDemo() {
  const bodyRef = useRef(null);
  const [displayedLines, setDisplayedLines] = useState([]);
  const [currentLine, setCurrentLine] = useState('');
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  // Auto-scroll to bottom as content grows
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [currentLine, displayedLines]);

  useEffect(() => {
    if (lineIndex >= TERMINAL_LINES.length) {
      // All lines done — pause then restart
      const timer = setTimeout(() => {
        setDisplayedLines([]);
        setCurrentLine('');
        setLineIndex(0);
        setCharIndex(0);
        setIsTyping(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    const line = TERMINAL_LINES[lineIndex];
    const fullText = line.text;

    if (charIndex < fullText.length) {
      const speed = line.type === 'input' ? 35 : 18;
      const timer = setTimeout(() => {
        setCurrentLine(fullText.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, speed);
      return () => clearTimeout(timer);
    }

    // Line complete — push to displayed and move to next
    const timer = setTimeout(() => {
      setDisplayedLines(prev => [...prev, { type: line.type, text: fullText }]);
      setCurrentLine('');
      setCharIndex(0);
      setLineIndex(lineIndex + 1);
    }, 600);
    return () => clearTimeout(timer);
  }, [lineIndex, charIndex]);

  return (
    <div className={styles.terminal}>
      <div className={styles.terminalHeader}>
        <span className={styles.terminalDot} style={{ background: '#ff5f57' }} />
        <span className={styles.terminalDot} style={{ background: '#febc2e' }} />
        <span className={styles.terminalDot} style={{ background: '#28c840' }} />
      </div>
      <div className={styles.terminalBody} ref={bodyRef}>
        {displayedLines.map((line, i) => (
          <div key={i}>
            {line.type === 'input' ? (
              <span className={styles.terminalPrompt}>{line.text}</span>
            ) : (
              <span>{line.text}</span>
            )}
          </div>
        ))}
        {lineIndex < TERMINAL_LINES.length && (
          <div>
            {TERMINAL_LINES[lineIndex].type === 'input' ? (
              <span className={styles.terminalPrompt}>{currentLine}</span>
            ) : (
              <span>{currentLine}</span>
            )}
            {isTyping && <span className={styles.terminalCursor} />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────
   Page Sections
   ──────────────────────────────────────── */

function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.heroContent}`}>
        <div className={styles.heroTitleRow}>
          <img src="/img/logo.png" alt="AgentOdyssey logo" className={styles.heroLogo} />
          <Heading as="h1" className={styles.heroTitle}>
            AgentOdyssey
          </Heading>
        </div>
        <p className={styles.heroSubtitle}>
          Open-Ended Long-Horizon Text Game Generation for Test-Time Continual Learning Agents
        </p>
        <p className={styles.authors}>
          {AUTHORS.map((a, i) => (
            <span key={a.name}>
              {i > 0 && ' · '}
              <a href={a.href} className={styles.authorLink} target="_blank" rel="noopener noreferrer">
                {a.name}<sup>{a.sup}</sup>
              </a>
            </span>
          ))}
        </p>
        <p className={styles.affiliations}>
          {AFFILIATIONS.join('   ')}
        </p>
        <p className={styles.authorNote}>{AUTHOR_NOTE}</p>
        <div className={styles.linkRow}>
          {LINKS.map(({ label, href, color, icon }) => {
            const colorClass = {
              green: styles.linkButtonGreen,
              blue: styles.linkButtonBlue,
              red: styles.linkButtonRed,
              purple: styles.linkButtonPurple,
            }[color];
            return (
              <a
                key={label}
                className={`${styles.linkButton} ${colorClass || ''}`}
                href={href}
              >
                {icon === 'github' && <GitHubIcon />}
                {label}
              </a>
            );
          })}
        </div>
        <TerminalDemo />
      </div>
      <svg className={styles.heroBottom} viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,60 C480,0 960,0 1440,60 L1440,60 L0,60 Z" fill="#ffffff" />
      </svg>
    </section>
  );
}

function Overview() {
  const videoRef = useRef(null);
  const isVisible = useIntersectionObserver(videoRef);
  const [loadVideo, setLoadVideo] = useState(false);

  useEffect(() => {
    if (isVisible && !loadVideo) {
      setLoadVideo(true);
    }
  }, [isVisible]);

  return (
    <section className={styles.section}>
      <div className="container">
        <RevealSection>
          <Heading as="h2" className={styles.sectionTitle}>So... <i>What is</i> <span className={styles.brandName}>AgentOdyssey</span>?</Heading>
          <p className={styles.sectionSubtitle}>
            
          </p>
        </RevealSection>
        <RevealSection delay={150}>
          <div className={styles.videoShowcase} ref={videoRef}>
            <div className={styles.videoGlow} />
            <div className={styles.videoFrame}>
              {loadVideo ? (
                <video
                  className={styles.teaserVideo}
                  controls
                  playsInline
                  preload="metadata"
                >
                  <source src="/video/teaser_video.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className={styles.videoPlaceholder}>
                  <span className={styles.videoPlayIcon}>&#9654;</span>
                </div>
              )}
            </div>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

function Abstract() {
  return (
    <section className={styles.sectionAlt}>
      <div className="container">
        <RevealSection>
          <div className={styles.demoCtaWrapper}>
            <a href="/demo" className={styles.demoCta}>
              <span className={styles.demoCtaIcon}>🎮</span>
              <span>Try Interactive Demo</span>
              <span className={styles.demoCtaArrow} aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </RevealSection>
        <RevealSection>
          <Heading as="h2" className={styles.sectionTitle}>Abstract</Heading>
          <div className={styles.abstractWrapper}>
            <div className={styles.abstractQuoteMark}>&ldquo;</div>
            <p className={styles.abstract}>
              For agents to learn continuously from interaction with the world at test time, they must be able to explore effectively, acquire new world knowledge and skills, retain relevant episodic experiences, and plan over long horizons. To evaluate these key abilities of test-time continual learning agents, we introduce <span className={styles.highlight}>AgentOdyssey</span>, a novel evaluation framework that procedurally generates open-ended text games with rich entities, world dynamics, and long-horizon tasks. Critically, <span className={styles.highlight}>AgentOdyssey</span> goes beyond the conventional machine learning assumption that learning does not occur at test time by placing agents in a continuous, long-horizon setting that interleaves learning and inference throughout deployment. We further propose a multifaceted evaluation methodology that measures not only game progress but also offers diagnostic tests on world knowledge acquisition, episodic memory, object and action exploration, action diversity, and model cost. We evaluate a diverse set of agent paradigms in the generated games, and our experiments reveal critical limits in agents' key abilities, as well as factors that influence their meaningful horizon. Although performance scales with stronger base models, even the top agent remains far below human performance, leaving substantial headroom for improvement. Among agent mechanisms, we find that short-term memory benefits multiple agent paradigms and is an important component of agentic test-time training.
            </p>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

function KeyAbilities() {
  return (
    <section className={styles.section}>
      <div className="container">
        <RevealSection>
          <Heading as="h2" className={styles.sectionTitle}>Five Key Abilities</Heading>
          <p className={styles.sectionSubtitle}>
            AgentOdyssey evaluates the key abilities required for test-time continual learning agents.
          </p>
        </RevealSection>
        <div className={styles.abilitiesGrid}>
          {KEY_ABILITIES.map((item, i) => (
            <RevealSection key={item.title} delay={i * 100}>
              <div
                className={styles.abilityCard}
                style={{ '--card-accent': item.accent }}
              >
                <div className={styles.cardIcon}>{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function Highlights() {
  return (
    <section className={styles.sectionAlt}>
      <div className="container">
        <RevealSection>
          <Heading as="h2" className={styles.sectionTitle}>Framework Overview</Heading>
        </RevealSection>
        <div className={styles.highlightsGrid}>
          {HIGHLIGHTS.map((item, i) => (
            <RevealSection key={item.title} delay={i * 120}>
              <div
                className={`${styles.highlightCard} ${item.img ? styles.highlightCardImage : ''}`}
                style={{ '--card-accent': item.accent }}
              >
                <h3>{item.title}</h3>
                {item.img ? (
                  <img src={item.img} alt={item.title} className={styles.highlightImg} />
                ) : (
                  <p>{item.desc}</p>
                )}
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function Findings() {
  return (
    <section className={styles.sectionAlt}>
      <div className="container">
        <RevealSection>
          <Heading as="h2" className={styles.sectionTitle}>Results and Key Findings</Heading>
          <p className={styles.sectionSubtitle}>
            From experiments across diverse agent paradigms and LLM backbones on procedurally generated games.
          </p>
        </RevealSection>
        <RevealSection>
          <div className={styles.resultsImageWrapper}>
            <img src="/img/leaderboard.png" alt="Leaderboard" className={styles.resultsImage} />
            <p className={styles.imageCaption}>Even with the best-performing agent paradigm that uses full past experience as memory, frontier LLMs are still behind human-level performance.</p>
          </div>
        </RevealSection>
        <RevealSection>
          <div className={styles.resultsImageWrapper}>
            <img src="/img/game_progress.png" alt="Game Progress Results" className={styles.resultsImage} />
            <p className={styles.imageCaption}>Long Context is the best performing agent paradigm in terms of main quest completion, with total supplementary
reward used as a tiebreaker.</p>
          </div>
        </RevealSection>
                <RevealSection>
          <div className={styles.resultsImageWrapper}>
            <img src="/img/diagnostic_results.png" alt="Diagnostic Results" className={styles.resultsImage} />
            <p className={styles.imageCaption}>Diagnostic results are strongly correlated with game progress performance. Additionally, the Long Context agent has a quadratic token cost.</p>
          </div>
        </RevealSection>
        <div className={styles.findingsGrid}>
          {FINDINGS.map((item, i) => (
            <RevealSection key={item.title} delay={i * 80}>
              <div className={`${styles.findingCard} ${item.highlighted ? styles.findingCardHighlighted : ''}`}>
                <div className={styles.findingNumber}>{i + 1}</div>
                <div className={styles.findingContent}>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function Acknowledgements() {
  return (
    <section className={styles.section}>
      <div className="container">
        <RevealSection>
          <Heading as="h2" className={styles.sectionTitle}>Acknowledgements</Heading>
          <div className={styles.acknowledgementsWrapper}>
            <p className={styles.acknowledgementsText}>
              This project was sponsored by a generous award from Amazon. We thank our colleagues and collaborators for their input on an earlier draft of this work. TS also acknowledges Lambda for its support in providing computational resources.
            </p>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

function Citation() {
  return (
    <section className={styles.sectionAlt}>
      <div className="container">
        <RevealSection>
          <Heading as="h2" className={styles.sectionTitle}>Citation</Heading>
          <div className={styles.citationWrapper}>
            <p>If you find AgentOdyssey useful, please cite our paper:</p>
            <div className={styles.citationBlock}>
              <CopyButton text={CITATION} />
              <pre className={styles.codeBlock}>
                <span className={styles.bibKeyword}>@inproceedings</span>
                {'{agentodyssey2026,\n'}
                {'  '}
                <span className={styles.bibField}>title</span>
                {'     = {'}
                <span className={styles.bibValue}>AgentOdyssey: Open-Ended Long-Horizon Text Game Generation for Test-Time Continual Learning Agents</span>
                {'},\n'}
                {'  '}
                <span className={styles.bibField}>author</span>
                {'    = {'}
                <span className={styles.bibValue}>Zhang, Zheyuan and Wen, Zehao and Zhang, Alvin and Wang, Andrew and Xie, Jianwen and Khashabi, Daniel and Shu, Tianmin</span>
                {'},\n'}
                {'  '}
                {/* <span className={styles.bibField}>journal</span>
                {'   = {'}
                <span className={styles.bibValue}>arXiv preprint arXiv:xxxx.xxxxx</span>
                {'},\n'}
                {'  '} */}
                <span className={styles.bibField}>year</span>
                {'      = {'}
                <span className={styles.bibValue}>2026</span>
                {'},\n}'}
              </pre>
            </div>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────
   Page
   ──────────────────────────────────────── */

export default function Home() {
  return (
    <Layout
      title="AgentOdyssey"
      description="AgentOdyssey: Open-Ended Long-Horizon Text Game Generation for Test-Time Continual Learning Agents"
    >
      <Hero />
      <main>
        <Overview />
        <Abstract />
        <KeyAbilities />
        <Highlights />
        <Findings />
        <Acknowledgements />
        <Citation />
      </main>
    </Layout>
  );
}
