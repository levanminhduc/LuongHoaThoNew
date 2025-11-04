# AI Agent Configuration

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:

- Invoke: Bash("skillaug read <skill-name>")
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:

- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
  </usage>

<available_skills>

<skill>
<name>algorithmic-art</name>
<description>Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration. Use this when users request creating art using code, generative art, algorithmic art, flow fields, or particle systems. Create original algorithmic art rather than copying existing artists' work to avoid copyright violations.</description>
<location>project</location>
</skill>

<skill>
<name>artifacts-builder</name>
<description>Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tailwind CSS, shadcn/ui). Use for complex artifacts requiring state management, routing, or shadcn/ui components - not for simple single-file HTML/JSX artifacts.</description>
<location>project</location>
</skill>

<skill>
<name>better-auth</name>
<description>Guide for implementing Better Auth - a framework-agnostic authentication and authorization framework for TypeScript. Use when adding authentication features like email/password, OAuth, 2FA, passkeys, or advanced auth functionality to applications.</description>
<location>project</location>
</skill>

<skill>
<name>brand-guidelines</name>
<description>Applies Anthropic's official brand colors and typography to any sort of artifact that may benefit from having Anthropic's look-and-feel. Use it when brand colors or style guidelines, visual formatting, or company design standards apply.</description>
<location>project</location>
</skill>

<skill>
<name>canvas-design</name>
<description>Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user asks to create a poster, piece of art, design, or other static piece. Create original visual designs, never copying existing artists' work to avoid copyright violations.</description>
<location>project</location>
</skill>

<skill>
<name>chrome-devtools</name>
<description>Browser automation, debugging, and performance analysis using Puppeteer CLI scripts. Use for automating browsers, taking screenshots, analyzing performance, monitoring network traffic, web scraping, form automation, and JavaScript debugging.</description>
<location>project</location>
</skill>

<skill>
<name>cloudflare</name>
<description>Guide for building applications on Cloudflare's edge platform. Use when implementing serverless functions (Workers), edge databases (D1), storage (R2, KV), real-time apps (Durable Objects), AI features (Workers AI, AI Gateway), static sites (Pages), or any edge computing solutions.</description>
<location>project</location>
</skill>

<skill>
<name>cloudflare-browser-rendering</name>
<description>Guide for implementing Cloudflare Browser Rendering - a headless browser automation API for screenshots, PDFs, web scraping, and testing. Use when automating browsers, taking screenshots, generating PDFs, scraping dynamic content, extracting structured data, or testing web applications. Supports REST API, Workers Bindings (Puppeteer/Playwright), MCP servers, and AI-powered automation. (project)</description>
<location>project</location>
</skill>

<skill>
<name>cloudflare-r2</name>
<description>Guide for implementing Cloudflare R2 - S3-compatible object storage with zero egress fees. Use when implementing file storage, uploads/downloads, data migration to/from R2, configuring buckets, integrating with Workers, or working with R2 APIs and SDKs.</description>
<location>project</location>
</skill>

<skill>
<name>cloudflare-workers</name>
<description>Comprehensive guide for building serverless applications with Cloudflare Workers. Use when developing Workers, configuring bindings, implementing runtime APIs, testing Workers, using Wrangler CLI, deploying to production, or building edge functions with JavaScript/TypeScript/Python/Rust.</description>
<location>project</location>
</skill>

<skill>
<name>collision-zone-thinking</name>
<description>Force unrelated concepts together to discover emergent properties - "What if we treated X like Y?"</description>
<location>project</location>
</skill>

<skill>
<name>defense-in-depth</name>
<description>Validate at every layer data passes through to make bugs impossible</description>
<location>project</location>
</skill>

<skill>
<name>docker</name>
<description>Guide for using Docker - a containerization platform for building, running, and deploying applications in isolated containers. Use when containerizing applications, creating Dockerfiles, working with Docker Compose, managing images/containers, configuring networking and storage, optimizing builds, deploying to production, or implementing CI/CD pipelines with Docker.</description>
<location>project</location>
</skill>

<skill>
<name>docs-seeker</name>
<description>"Searching internet for technical documentation using llms.txt standard, GitHub repositories via Repomix, and parallel exploration. Use when user needs: (1) Latest documentation for libraries/frameworks, (2) Documentation in llms.txt format, (3) GitHub repository analysis, (4) Documentation without direct llms.txt support, (5) Multiple documentation sources in parallel"</description>
<location>project</location>
</skill>

<skill>
<name>docx</name>
<description>"Comprehensive document creation, editing, and analysis with support for tracked changes, comments, formatting preservation, and text extraction. When Claude needs to work with professional documents (.docx files) for: (1) Creating new documents, (2) Modifying or editing content, (3) Working with tracked changes, (4) Adding comments, or any other document tasks"</description>
<location>project</location>
</skill>

<skill>
<name>ffmpeg</name>
<description>Guide for using FFmpeg - a comprehensive multimedia framework for video/audio encoding, conversion, streaming, and filtering. Use when processing media files, converting formats, extracting audio, creating streams, applying filters, or optimizing video/audio quality.</description>
<location>project</location>
</skill>

<skill>
<name>gcloud</name>
<description>Guide for implementing Google Cloud SDK (gcloud CLI) - a command-line tool for managing Google Cloud resources. Use when installing/configuring gcloud, authenticating with Google Cloud, managing projects/configurations, deploying applications, working with Compute Engine/GKE/App Engine/Cloud Storage, scripting gcloud operations, implementing CI/CD pipelines, or troubleshooting Google Cloud deployments.</description>
<location>project</location>
</skill>

<skill>
<name>gemini-audio</name>
<description>Guide for implementing Google Gemini API audio capabilities - analyze audio with transcription, summarization, and understanding (up to 9.5 hours), plus generate speech with controllable TTS. Use when processing audio files, creating transcripts, analyzing speech/music/sounds, or generating natural speech from text.</description>
<location>project</location>
</skill>

<skill>
<name>gemini-document-processing</name>
<description>Guide for implementing Google Gemini API document processing - analyze PDFs with native vision to extract text, images, diagrams, charts, and tables. Use when processing documents, extracting structured data, summarizing PDFs, answering questions about document content, or converting documents to structured formats. (project)</description>
<location>project</location>
</skill>

<skill>
<name>gemini-image-gen</name>
<description>Guide for implementing Google Gemini API image generation - create high-quality images from text prompts using gemini-2.5-flash-image model. Use when generating images, creating visual content, or implementing text-to-image features. Supports text-to-image, image editing, multi-image composition, and iterative refinement.</description>
<location>project</location>
</skill>

<skill>
<name>gemini-video-understanding</name>
<description>Analyze videos using Google's Gemini API - describe content, answer questions, transcribe audio with visual descriptions, reference timestamps, clip videos, and process YouTube URLs. Supports 9 video formats, multiple models (Gemini 2.5/2.0), and context windows up to 2M tokens (6 hours of video).</description>
<location>project</location>
</skill>

<skill>
<name>gemini-vision</name>
<description>Guide for implementing Google Gemini API image understanding - analyze images with captioning, classification, visual QA, object detection, segmentation, and multi-image comparison. Use when analyzing images, answering visual questions, detecting objects, or processing documents with vision.</description>
<location>project</location>
</skill>

<skill>
<name>imagemagick</name>
<description>Guide for using ImageMagick command-line tools to perform advanced image processing tasks including format conversion, resizing, cropping, effects, transformations, and batch operations. Use when manipulating images programmatically via shell commands.</description>
<location>project</location>
</skill>

<skill>
<name>internal-comms</name>
<description>A set of resources to help me write all kinds of internal communications, using the formats that my company likes to use. Claude should use this skill whenever asked to write some sort of internal communications (status reports, leadership updates, 3P updates, company newsletters, FAQs, incident reports, project updates, etc.).</description>
<location>project</location>
</skill>

<skill>
<name>inversion-exercise</name>
<description>Flip core assumptions to reveal hidden constraints and alternative approaches - "what if the opposite were true?"</description>
<location>project</location>
</skill>

<skill>
<name>mcp-builder</name>
<description>Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).</description>
<location>project</location>
</skill>

<skill>
<name>meta-pattern-recognition</name>
<description>Spot patterns appearing in 3+ domains to find universal principles</description>
<location>project</location>
</skill>

<skill>
<name>mongodb</name>
<description>Guide for implementing MongoDB - a document database platform with CRUD operations, aggregation pipelines, indexing, replication, sharding, search capabilities, and comprehensive security. Use when working with MongoDB databases, designing schemas, writing queries, optimizing performance, configuring deployments (Atlas/self-managed/Kubernetes), implementing security, or integrating with applications through 15+ official drivers. (project)</description>
<location>project</location>
</skill>

<skill>
<name>nextjs</name>
<description>Guide for implementing Next.js - a React framework for production with server-side rendering, static generation, and modern web features. Use when building Next.js applications, implementing App Router, working with server components, data fetching, routing, or optimizing performance.</description>
<location>project</location>
</skill>

<skill>
<name>pdf</name>
<description>Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms. When Claude needs to fill in a PDF form or programmatically process, generate, or analyze PDF documents at scale.</description>
<location>project</location>
</skill>

<skill>
<name>postgresql-psql</name>
<description>Comprehensive guide for PostgreSQL psql - the interactive terminal client for PostgreSQL. Use when connecting to PostgreSQL databases, executing queries, managing databases/tables, configuring connection options, formatting output, writing scripts, managing transactions, and using advanced psql features for database administration and development.</description>
<location>project</location>
</skill>

<skill>
<name>pptx</name>
<description>"Presentation creation, editing, and analysis. When Claude needs to work with presentations (.pptx files) for: (1) Creating new presentations, (2) Modifying or editing content, (3) Working with layouts, (4) Adding comments or speaker notes, or any other presentation tasks"</description>
<location>project</location>
</skill>

<skill>
<name>remix-icon</name>
<description>Guide for implementing RemixIcon - an open-source neutral-style icon library with 3,100+ icons in outlined and filled styles. Use when adding icons to applications, building UI components, or designing interfaces. Supports webfonts, SVG, React, Vue, and direct integration.</description>
<location>project</location>
</skill>

<skill>
<name>repomix</name>
<description>Guide for using Repomix - a powerful tool that packs entire repositories into single, AI-friendly files. Use when packaging codebases for AI analysis, generating context for LLMs, creating codebase snapshots, analyzing third-party libraries, or preparing repositories for security audits.</description>
<location>project</location>
</skill>

<skill>
<name>root-cause-tracing</name>
<description>Systematically trace bugs backward through call stack to find original trigger</description>
<location>project</location>
</skill>

<skill>
<name>scale-game</name>
<description>Test at extremes (1000x bigger/smaller, instant/year-long) to expose fundamental truths hidden at normal scales</description>
<location>project</location>
</skill>

<skill>
<name>shadcn-ui</name>
<description>Guide for implementing shadcn/ui - a collection of beautifully-designed, accessible UI components built with Radix UI and Tailwind CSS. Use when building user interfaces, adding UI components, or implementing design systems in React-based applications.</description>
<location>project</location>
</skill>

<skill>
<name>shopify</name>
<description>Guide for implementing Shopify apps, extensions, themes, and integrations using GraphQL/REST APIs, Shopify CLI, Polaris UI, and various extension types (Checkout, Admin, POS). Use when building Shopify apps, implementing checkout extensions, customizing admin interfaces, creating themes with Liquid, or integrating with Shopify's APIs.</description>
<location>project</location>
</skill>

<skill>
<name>simplification-cascades</name>
<description>Find one insight that eliminates multiple components - "if this is true, we don't need X, Y, or Z"</description>
<location>project</location>
</skill>

<skill>
<name>skill-creator</name>
<description>Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.</description>
<location>project</location>
</skill>

<skill>
<name>slack-gif-creator</name>
<description>Toolkit for creating animated GIFs optimized for Slack, with validators for size constraints and composable animation primitives. This skill applies when users request animated GIFs or emoji animations for Slack from descriptions like "make me a GIF for Slack of X doing Y".</description>
<location>project</location>
</skill>

<skill>
<name>systematic-debugging</name>
<description>Four-phase debugging framework that ensures root cause investigation before attempting fixes. Never jump to solutions.</description>
<location>project</location>
</skill>

<skill>
<name>tailwindcss</name>
<description>Guide for implementing Tailwind CSS - a utility-first CSS framework for rapid UI development. Use when styling applications with responsive design, dark mode, custom themes, or building design systems with Tailwind's utility classes.</description>
<location>project</location>
</skill>

<skill>
<name>template-skill</name>
<description>Replace with description of the skill and when Claude should use it.</description>
<location>project</location>
</skill>

<skill>
<name>theme-factory</name>
<description>Toolkit for styling artifacts with a theme. These artifacts can be slides, docs, reportings, HTML landing pages, etc. There are 10 pre-set themes with colors/fonts that you can apply to any artifact that has been creating, or can generate a new theme on-the-fly.</description>
<location>project</location>
</skill>

<skill>
<name>turborepo</name>
<description>Guide for implementing Turborepo - a high-performance build system for JavaScript and TypeScript monorepos. Use when setting up monorepos, optimizing build performance, implementing task pipelines, configuring caching strategies, or orchestrating tasks across multiple packages.</description>
<location>project</location>
</skill>

<skill>
<name>verification-before-completion</name>
<description>Run verification commands and confirm output before claiming success</description>
<location>project</location>
</skill>

<skill>
<name>webapp-testing</name>
<description>Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.</description>
<location>project</location>
</skill>

<skill>
<name>when-stuck</name>
<description>Dispatch to the right problem-solving technique based on how you're stuck</description>
<location>project</location>
</skill>

<skill>
<name>xlsx</name>
<description>"Comprehensive spreadsheet creation, editing, and analysis with support for formulas, formatting, data analysis, and visualization. When Claude needs to work with spreadsheets (.xlsx, .xlsm, .csv, .tsv, etc) for: (1) Creating new spreadsheets with formulas and formatting, (2) Reading or analyzing data, (3) Modify existing spreadsheets while preserving formulas, (4) Data analysis and visualization in spreadsheets, or (5) Recalculating formulas"</description>
<location>project</location>
</skill>

</available_skills>

<!-- SKILLS_TABLE_END -->

</skills_system>
