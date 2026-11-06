export interface ChapterItem {
  id: string;
  number: string;
  displayNumber: string;
  title: string;
  headline: string;
  summary: string;
  category: string;
  side: 'left' | 'right';
  nodeIndex: number; // 0 to 4 on left, 0 to 4 on right
  // Authentic narrative paragraphs from docs/STORY_CONTENT.md
  fullStory: string[];
  ctaLabel: string;
  ctaAction: 'start' | 'modal' | 'work' | 'contact';
}

export const CHAPTERS_DATA: ChapterItem[] = [
  // --- LEFT SIDE: CHAPTERS 01 TO 05 ---
  {
    id: 'chapter-01',
    number: '01',
    displayNumber: 'CHAPTER 01',
    title: 'The Beginning',
    headline: 'I follow questions until they become something I can build.',
    summary: 'Curiosity across software development, AI, automation and Linux systems.',
    category: 'Software Engineering · AI · Exploration',
    side: 'left',
    nodeIndex: 0, // Terminal Node L1
    ctaLabel: 'Return to Start ↗',
    ctaAction: 'start',
    fullStory: [
      "I'm Aditya Dugar, a Software Engineering student at Jain University.",
      "I find myself drawn towards things I don't fully understand yet — how intelligent systems work, what's happening behind an interface, how different technologies connect, and what becomes possible when you bring them together.",
      "That curiosity has taken me through software development, artificial intelligence, automation, Linux environments, and a growing interest in the systems that power modern technology.",
      "I enjoy learning by exploring, experimenting, making mistakes, and eventually turning an idea into something tangible.",
      "I don't see myself as someone following one fixed path. I'm interested in discovering where technology, engineering and creativity meet.",
    ],
  },
  {
    id: 'chapter-02',
    number: '02',
    displayNumber: 'CHAPTER 02',
    title: 'Beyond the Interface',
    headline: "There's always more happening beneath the surface.",
    summary: 'Investigating what makes applications, services, and operating systems run.',
    category: 'Systems · Architecture · Deep Logic',
    side: 'left',
    nodeIndex: 1, // Terminal Node L2
    ctaLabel: 'Read Chapter ↗',
    ctaAction: 'modal',
    fullStory: [
      'A tool can be useful. A system can be powerful. An interface can be beautiful.',
      'But what interests me is understanding what makes them possible.',
      'I find myself looking beyond what something does and becoming curious about how it actually works.',
      'What happens behind an application? How do different services communicate? What makes an AI model useful? What happens when you start exploring an operating system beyond its default boundaries?',
      'Whether I\'m exploring a Linux environment, inspecting an application, experimenting with an AI model, or building a web experience, I enjoy going a little deeper than what\'s immediately visible.',
      'For me, understanding the underlying system is just as interesting as using the final product.',
    ],
  },
  {
    id: 'chapter-03',
    number: '03',
    displayNumber: 'CHAPTER 03',
    title: 'The Learning Curve',
    headline: "I learn best when there's something I want to figure out.",
    summary: 'Strengthening fundamentals, debugging independently, and applying concepts.',
    category: 'Fundamentals · Growth · Independence',
    side: 'left',
    nodeIndex: 2, // Terminal Node L3
    ctaLabel: 'Read Chapter ↗',
    ctaAction: 'modal',
    fullStory: [
      "My journey into Software Engineering hasn't been a perfectly structured sequence of technologies.",
      "It's been a combination of fundamentals, curiosity-driven experiments, practical projects, and plenty of debugging.",
      "I've worked through programming concepts, data structures, application development, backend systems, and different parts of the technology ecosystem.",
      'I believe learning becomes more meaningful when you move beyond copying solutions and begin making decisions independently.',
      'That means understanding why something works, recognizing why it breaks, researching alternatives, and having the patience to try again.',
      "I'm still strengthening my fundamentals and expanding my engineering capabilities. Because learning something is only the beginning. Applying it is where the real understanding develops.",
    ],
  },
  {
    id: 'chapter-04',
    number: '04',
    displayNumber: 'CHAPTER 04',
    title: 'What Draws My Attention',
    headline: 'Different technologies. One curiosity: what can we make possible?',
    summary: 'Intelligent systems, autonomous workflows, Linux environments, and creative tech.',
    category: 'AI Models · Automation · Systems',
    side: 'left',
    nodeIndex: 3, // Terminal Node L4
    ctaLabel: 'Read Chapter ↗',
    ctaAction: 'modal',
    fullStory: [
      'My interests have never been limited to a single programming language or development framework.',
      'Intelligent Systems: AI, language models, retrieval systems, and agent-based applications that move beyond simple chat into real-world systems.',
      'Automation & Autonomous Workflows: Connecting tools, simplifying repetitive work, and building systems that perform actions.',
      'Systems & The Technology Beneath Them: Linux, operating systems, hardware, and developer environments beyond default configurations.',
      'Software Engineering: APIs, backend architecture, interfaces, and turning ideas into reliable systems.',
      'Creative Technology: Visual storytelling, animation, experimental interfaces, and combining engineering with design.',
    ],
  },
  {
    id: 'chapter-05',
    number: '05',
    displayNumber: 'CHAPTER 05',
    title: 'How I Turn Ideas Into Systems',
    headline: 'I like the space between an interesting idea and a working solution.',
    summary: 'Approaching problems with Python, TypeScript, React, Docker, and system design.',
    category: 'Engineering · Architecture · Execution',
    side: 'left',
    nodeIndex: 4, // Terminal Node L5
    ctaLabel: 'Read Chapter ↗',
    ctaAction: 'modal',
    fullStory: [
      'My approach to building starts with understanding the problem.',
      'I explore what already exists, investigate underlying requirements, experiment with different approaches, and gradually turn the pieces into something functional.',
      'Programming & Problem Solving: Python, JavaScript, TypeScript, C and Java.',
      'Web & Application Development: React, Next.js, Node.js, FastAPI and Tailwind CSS.',
      'Artificial Intelligence: LLM applications, RAG, AI agents, Gemini and local model experimentation with Ollama.',
      'Systems & Infrastructure: Linux, Docker, PostgreSQL, Supabase, MongoDB and Git.',
      "It's about knowing how to approach a problem and learning the right tools to solve it.",
    ],
  },

  // --- RIGHT SIDE: CHAPTERS 06 TO 10 ---
  {
    id: 'chapter-06',
    number: '06',
    displayNumber: 'CHAPTER 06',
    title: 'The Work I Choose to Show',
    headline: 'Ideas are interesting. Building them makes them real.',
    summary: 'Curated pinned repositories loaded dynamically from verified GitHub work.',
    category: 'Selected Work · Public Code · Projects',
    side: 'right',
    nodeIndex: 0, // Terminal Node R1
    ctaLabel: 'Explore Repositories →',
    ctaAction: 'work',
    fullStory: [
      'Every project begins somewhere.',
      'Sometimes with a problem worth solving. Sometimes with a technology I want to understand. Sometimes with an idea that simply refuses to leave my mind.',
      "This collection represents the public repositories I've chosen to pin on GitHub.",
      "They're a window into the problems I've explored, the systems I've experimented with, and the direction my engineering interests are taking.",
      'Some demonstrate practical applications. Others represent technical exploration.',
      'Together, they reflect an evolving journey of learning through building.',
    ],
  },
  {
    id: 'chapter-07',
    number: '07',
    displayNumber: 'CHAPTER 07',
    title: 'Engineering With Others',
    headline: 'Building software changes when it becomes a shared responsibility.',
    summary: 'Internship at GrooveIt contributing to active products, auth, and team architecture.',
    category: 'Collaboration · Codebases · Professional',
    side: 'right',
    nodeIndex: 1, // Terminal Node R2
    ctaLabel: 'Read Chapter ↗',
    ctaAction: 'modal',
    fullStory: [
      'Personal projects give you the freedom to explore. Working with an existing team and codebase introduces a different perspective.',
      "During my internship experience with GrooveIt, I've had the opportunity to work within a collaborative development environment and contribute to an active software product.",
      "I've explored practical aspects of backend and application development, authentication, debugging, security-related changes, and working with existing project architecture.",
      'You need to understand the decisions already made, communicate with other contributors, investigate unexpected behaviour, and consider how a change affects the wider system.',
      "Because engineering is not just about what you can build independently. It's also about what you can contribute together.",
    ],
  },
  {
    id: 'chapter-08',
    number: '08',
    displayNumber: 'CHAPTER 08',
    title: 'The Experimental Lab',
    headline: "Some of my favourite questions don't have a clear answer yet.",
    summary: 'Local AI models, autonomous agents, Linux configurations, and hands-on probes.',
    category: 'R&D · Local LLMs · Agentic Workflows',
    side: 'right',
    nodeIndex: 2, // Terminal Node R3
    ctaLabel: 'Read Chapter ↗',
    ctaAction: 'modal',
    fullStory: [
      'Not every interesting idea needs to become a finished product immediately. Some deserve experimentation.',
      "I've been exploring the possibilities of local AI models, personal AI assistants, autonomous agents, intelligent automation, and different ways of connecting software with the systems around it.",
      "I've also spent time experimenting with Linux, development environments, hardware capabilities, and understanding how existing technologies can be configured or extended.",
      'There\'s a particular satisfaction in making an unfamiliar system do something you initially thought was outside your understanding.',
      'Not everything here is finished. That\'s what makes it an experiment.',
    ],
  },
  {
    id: 'chapter-09',
    number: '09',
    displayNumber: 'CHAPTER 09',
    title: 'Still Becoming',
    headline: "There's a lot more I want to understand.",
    summary: 'Evolving as an engineer who unites technical systems with thoughtful design.',
    category: 'Vision · Architectural Depth · Craft',
    side: 'right',
    nodeIndex: 3, // Terminal Node R4
    ctaLabel: 'Read Chapter ↗',
    ctaAction: 'modal',
    fullStory: [
      "I'm still discovering the areas of engineering I want to explore more deeply.",
      'Artificial intelligence and intelligent systems are among my strongest interests, but I also want to strengthen my understanding of software architecture, computer systems, backend engineering, and the foundations that make complex applications reliable.',
      'I want to become someone who can move comfortably between understanding a technical problem, investigating possible solutions, and building something meaningful from them.',
      'I also want to keep exploring the creative side of technology — making digital experiences that are not only functional but thoughtfully designed and enjoyable to interact with.',
      'The journey is still taking shape.',
    ],
  },
  {
    id: 'chapter-10',
    number: '10',
    displayNumber: 'CHAPTER 10',
    title: 'The Next Connection',
    headline: 'Good work often begins with a conversation.',
    summary: 'Open to technical discussions, collaborations, and engineering opportunities.',
    category: 'Dialogue · Collaboration · Contact',
    side: 'right',
    nodeIndex: 4, // Terminal Node R5
    ctaLabel: 'Get in Touch ↗',
    ctaAction: 'contact',
    fullStory: [
      "You've seen a little of what interests me, what I've been exploring, and how I approach building things.",
      'But a portfolio can only show a part of someone\'s journey.',
      'I\'m interested in meeting people who enjoy thinking differently, exploring challenging ideas, sharing knowledge, and working together to build useful things.',
      "Whether it's a technical discussion, an interesting collaboration, or an opportunity to work on something meaningful, I'd be glad to connect.",
      'Let\'s see what we can create together.',
    ],
  },
];
