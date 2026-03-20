/** Technical domain definitions — 21 inferred domains for candidate classification. */

export interface DomainDef {
  domainId: string;        // e.g. "domain:ml-engineer"
  label: string;           // e.g. "ML Engineer"
  defining: string[];      // taxonomy IDs — strong signal, weighted 0.60
  supporting: string[];    // taxonomy IDs — weak signal, weighted 0.25
  topicKeywords: string[]; // GitHub topic matches, weighted 0.15
}

export const DOMAIN_DEFINITIONS: DomainDef[] = [
  {
    domainId: 'domain:frontend-engineer',
    label: 'Frontend Engineer',
    defining: [
      'framework:react', 'framework:vue', 'framework:svelte',
      'framework:angular', 'framework:nextjs', 'framework:nuxt',
      'framework:remix', 'framework:astro',
    ],
    supporting: [
      'tool:vite', 'tool:webpack', 'language:typescript',
      'language:javascript', 'language:css',
    ],
    topicKeywords: ['frontend', 'ui', 'ux', 'react', 'vue', 'svelte', 'css'],
  },
  {
    domainId: 'domain:backend-engineer',
    label: 'Backend Engineer',
    defining: [
      'framework:express', 'framework:fastapi', 'framework:django',
      'framework:flask', 'framework:nestjs', 'framework:gin',
      'framework:fiber', 'framework:echo', 'framework:actix',
      'framework:hono',
    ],
    supporting: [
      'tool:postgresql', 'tool:redis', 'tool:mongodb',
      'language:go', 'language:rust', 'language:java', 'language:python',
    ],
    topicKeywords: ['backend', 'api', 'rest', 'server', 'microservice'],
  },
  {
    domainId: 'domain:fullstack-engineer',
    label: 'Full-Stack Engineer',
    defining: [
      'framework:nextjs', 'framework:remix', 'framework:nuxt',
    ],
    supporting: [
      'framework:react', 'framework:vue', 'framework:express',
      'framework:nestjs', 'tool:postgresql',
    ],
    topicKeywords: ['fullstack', 'full-stack'],
  },
  {
    domainId: 'domain:ml-engineer',
    label: 'ML Engineer',
    defining: [
      'tool:tensorflow', 'tool:pytorch', 'tool:scikit-learn',
    ],
    supporting: [
      'tool:pandas', 'tool:numpy', 'language:python',
      'tool:jupyter', 'tool:scipy',
    ],
    topicKeywords: [
      'machine-learning', 'ml', 'deep-learning',
      'neural-network', 'ai', 'model-training',
    ],
  },
  {
    domainId: 'domain:data-scientist',
    label: 'Data Scientist',
    defining: [
      'tool:pandas', 'tool:numpy', 'tool:jupyter',
    ],
    supporting: [
      'tool:scikit-learn', 'tool:scipy', 'language:python', 'language:r',
    ],
    topicKeywords: [
      'data-science', 'data-analysis', 'visualization',
      'notebook', 'statistics',
    ],
  },
  {
    domainId: 'domain:devops-engineer',
    label: 'DevOps Engineer',
    defining: [
      'tool:docker', 'tool:kubernetes',
    ],
    supporting: [
      'tool:terraform', 'tool:ansible', 'tool:github-actions',
      'tool:prometheus', 'tool:grafana', 'language:shell',
    ],
    topicKeywords: ['devops', 'kubernetes', 'docker', 'cicd', 'infrastructure'],
  },
  {
    domainId: 'domain:cloud-engineer',
    label: 'Cloud Engineer',
    defining: [
      'tool:aws', 'tool:firebase', 'tool:terraform',
    ],
    supporting: [
      'tool:kubernetes', 'tool:docker', 'tool:ansible',
      'language:python', 'language:go',
    ],
    topicKeywords: ['cloud', 'aws', 'gcp', 'azure', 'serverless'],
  },
  {
    domainId: 'domain:mobile-engineer',
    label: 'Mobile Engineer',
    defining: [
      'language:swift', 'language:kotlin', 'language:dart',
    ],
    supporting: [
      'language:objective-c', 'language:java',
    ],
    topicKeywords: ['ios', 'android', 'mobile', 'flutter', 'react-native'],
  },
  {
    domainId: 'domain:data-engineer',
    label: 'Data Engineer',
    defining: [
      'tool:kafka', 'tool:postgresql', 'tool:elasticsearch',
    ],
    supporting: [
      'tool:redis', 'tool:mongodb', 'language:python',
      'language:scala', 'tool:aws',
    ],
    topicKeywords: [
      'data-engineering', 'etl', 'pipeline', 'streaming', 'kafka',
    ],
  },
  {
    domainId: 'domain:platform-engineer',
    label: 'Platform Engineer',
    defining: [
      'tool:kubernetes', 'tool:terraform', 'tool:github-actions',
    ],
    supporting: [
      'tool:docker', 'tool:prometheus', 'tool:grafana',
      'language:go', 'language:python',
    ],
    topicKeywords: ['platform', 'infrastructure', 'sre', 'reliability'],
  },
  {
    domainId: 'domain:systems-engineer',
    label: 'Systems Engineer',
    defining: [
      'language:rust', 'language:c', 'language:cpp',
    ],
    supporting: [
      'language:go', 'language:assembly', 'tool:docker',
    ],
    topicKeywords: [
      'systems', 'embedded', 'kernel', 'os',
      'performance', 'low-level',
    ],
  },
  {
    domainId: 'domain:security-engineer',
    label: 'Security Engineer',
    defining: [
      'tool:snyk', 'tool:trivy', 'tool:owasp-zap',
    ],
    supporting: [
      'language:python', 'language:go', 'language:rust',
      'language:c', 'tool:docker',
    ],
    topicKeywords: [
      'security', 'vulnerability', 'penetration',
      'cryptography', 'infosec',
    ],
  },
  {
    domainId: 'domain:blockchain-engineer',
    label: 'Blockchain Engineer',
    defining: [
      'language:solidity',
    ],
    supporting: [
      'language:rust', 'language:typescript', 'language:go',
    ],
    topicKeywords: [
      'blockchain', 'web3', 'ethereum', 'defi',
      'nft', 'solidity', 'smart-contract',
    ],
  },
  {
    domainId: 'domain:game-developer',
    label: 'Game Developer',
    defining: [
      'language:csharp', 'language:cpp', 'language:lua',
    ],
    supporting: [
      'language:c', 'language:rust', 'language:python',
    ],
    topicKeywords: [
      'game', 'gamedev', 'unity', 'unreal',
      'opengl', 'vulkan', 'godot',
    ],
  },
  {
    domainId: 'domain:desktop-developer',
    label: 'Desktop Developer',
    defining: [
      'language:csharp', 'language:cpp', 'language:java',
    ],
    supporting: [
      'language:python', 'language:rust', 'language:swift',
    ],
    topicKeywords: [
      'desktop', 'electron', 'tauri', 'qt', 'gtk', 'wpf',
    ],
  },
  {
    domainId: 'domain:api-developer',
    label: 'API Developer',
    defining: [
      'tool:graphql', 'tool:grpc',
    ],
    supporting: [
      'framework:express', 'framework:fastapi',
      'language:go', 'language:typescript',
    ],
    topicKeywords: ['api', 'graphql', 'grpc', 'rest', 'openapi'],
  },
  {
    domainId: 'domain:functional-programmer',
    label: 'Functional Programmer',
    defining: [
      'language:haskell', 'language:elixir', 'language:erlang',
      'language:clojure', 'language:fsharp', 'language:ocaml',
    ],
    supporting: [
      'language:scala', 'language:typescript',
    ],
    topicKeywords: ['functional', 'fp', 'haskell', 'elixir', 'erlang'],
  },
  {
    domainId: 'domain:enterprise-java',
    label: 'Enterprise Java Developer',
    defining: [
      'framework:spring', 'language:java', 'language:kotlin',
    ],
    supporting: [
      'tool:postgresql', 'tool:kafka', 'language:scala',
    ],
    topicKeywords: ['java', 'spring', 'enterprise', 'microservices', 'jvm'],
  },
  {
    domainId: 'domain:observability-engineer',
    label: 'Observability Engineer',
    defining: [
      'tool:prometheus', 'tool:datadog', 'tool:sentry',
    ],
    supporting: [
      'tool:elasticsearch', 'tool:grafana', 'tool:kubernetes',
      'language:go',
    ],
    topicKeywords: [
      'observability', 'monitoring', 'metrics', 'tracing', 'logging',
    ],
  },
  {
    domainId: 'domain:database-engineer',
    label: 'Database Engineer',
    defining: [
      'language:sql', 'tool:postgresql', 'tool:mongodb',
    ],
    supporting: [
      'tool:mysql', 'tool:redis', 'tool:elasticsearch',
    ],
    topicKeywords: [
      'database', 'sql', 'nosql', 'dba', 'query-optimization',
    ],
  },
  {
    domainId: 'domain:ai-agent-engineer',
    label: 'AI Agent Engineer',
    defining: [
      'ai-agent-pattern:claude-md', 'ai-agent-pattern:agent-definitions',
      'ai-agent-pattern:agent-definition-file', 'ai-agent-pattern:prompt-templates',
      'ai-agent-pattern:mcp-config', 'ai-agent-pattern:github-agents',
    ],
    supporting: [
      'ai-agent-pattern:claude-hooks', 'ai-agent-pattern:claude-rules',
      'ai-agent-pattern:claude-knowledge', 'ai-agent-pattern:claude-commands',
      'ai-agent-pattern:knowledge-base', 'ai-agent-pattern:agent-instincts',
      'ai-agent-pattern:prompt-file', 'ai-agent-pattern:cursor-rules',
      'tool:anthropic-sdk', 'tool:openai-sdk', 'tool:huggingface', 'tool:ollama',
      'framework:langchain', 'framework:llamaindex', 'framework:crewai',
      'framework:autogen', 'framework:semantic-kernel', 'framework:vercel-ai-sdk',
      'framework:langgraph', 'framework:haystack', 'framework:dspy',
      'tool:pinecone', 'tool:chromadb', 'tool:weaviate', 'tool:qdrant', 'tool:milvus',
      'language:python', 'language:typescript',
    ],
    topicKeywords: [
      'ai-agent', 'llm', 'agents', 'agentic', 'context-engineering',
      'prompt-engineering', 'rag', 'langchain', 'crewai', 'autogen',
    ],
  },
];
