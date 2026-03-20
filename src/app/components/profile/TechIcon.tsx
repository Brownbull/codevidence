/**
 * src/app/components/profile/TechIcon.tsx — Technology brand icons for skill tags.
 *
 * Maps taxonomy IDs (e.g. "language:typescript") to branded color indicators.
 * Uses devicon CDN SVGs where available, with colored-initial fallback.
 */

import React, { useState } from 'react';

/** Devicon CDN base URL — well-known open-source icon set for developer technologies. */
const DEVICON_CDN = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons';

/** Maps taxonomy IDs to devicon folder/variant names. */
const DEVICON_MAP: Record<string, { folder: string; variant: string }> = {
  // Languages
  'language:typescript': { folder: 'typescript', variant: 'original' },
  'language:javascript': { folder: 'javascript', variant: 'original' },
  'language:python': { folder: 'python', variant: 'original' },
  'language:rust': { folder: 'rust', variant: 'original' },
  'language:go': { folder: 'go', variant: 'original-wordmark' },
  'language:java': { folder: 'java', variant: 'original' },
  'language:kotlin': { folder: 'kotlin', variant: 'original' },
  'language:swift': { folder: 'swift', variant: 'original' },
  'language:c': { folder: 'c', variant: 'original' },
  'language:cpp': { folder: 'cplusplus', variant: 'original' },
  'language:csharp': { folder: 'csharp', variant: 'original' },
  'language:ruby': { folder: 'ruby', variant: 'original' },
  'language:elixir': { folder: 'elixir', variant: 'original' },
  'language:html': { folder: 'html5', variant: 'original' },
  'language:css': { folder: 'css3', variant: 'original' },
  'language:php': { folder: 'php', variant: 'original' },
  'language:scala': { folder: 'scala', variant: 'original' },
  'language:r': { folder: 'r', variant: 'original' },
  'language:dart': { folder: 'dart', variant: 'original' },
  'language:lua': { folder: 'lua', variant: 'original' },
  'language:perl': { folder: 'perl', variant: 'original' },
  'language:haskell': { folder: 'haskell', variant: 'original' },
  'language:shell': { folder: 'bash', variant: 'original' },
  'language:bash': { folder: 'bash', variant: 'original' },
  'language:powershell': { folder: 'powershell', variant: 'original' },
  'language:groovy': { folder: 'groovy', variant: 'original' },
  'language:objective-c': { folder: 'objectivec', variant: 'plain' },
  'language:clojure': { folder: 'clojure', variant: 'original' },
  'language:erlang': { folder: 'erlang', variant: 'original' },
  'language:fsharp': { folder: 'fsharp', variant: 'original' },
  // Frameworks
  'framework:react': { folder: 'react', variant: 'original' },
  'framework:nextjs': { folder: 'nextjs', variant: 'original' },
  'framework:vue': { folder: 'vuejs', variant: 'original' },
  'framework:angular': { folder: 'angular', variant: 'original' },
  'framework:svelte': { folder: 'svelte', variant: 'original' },
  'framework:express': { folder: 'express', variant: 'original' },
  'framework:nestjs': { folder: 'nestjs', variant: 'original' },
  'framework:nuxt': { folder: 'nuxtjs', variant: 'original' },
  'framework:fastapi': { folder: 'fastapi', variant: 'original' },
  'framework:django': { folder: 'django', variant: 'plain' },
  'framework:flask': { folder: 'flask', variant: 'original' },
  'framework:spring': { folder: 'spring', variant: 'original' },
  'framework:rails': { folder: 'rails', variant: 'plain' },
  'framework:streamlit': { folder: 'streamlit', variant: 'original' },
  'framework:flutter': { folder: 'flutter', variant: 'original' },
  'framework:laravel': { folder: 'laravel', variant: 'original' },
  'framework:dotnet': { folder: 'dot-net', variant: 'original' },
  'framework:gatsby': { folder: 'gatsby', variant: 'original' },
  'framework:ember': { folder: 'ember', variant: 'original-wordmark' },
  'framework:ionic': { folder: 'ionic', variant: 'original' },
  'framework:phoenix': { folder: 'phoenix', variant: 'original' },
  // Tools — databases
  'tool:docker': { folder: 'docker', variant: 'original' },
  'tool:firebase': { folder: 'firebase', variant: 'plain' },
  'tool:postgresql': { folder: 'postgresql', variant: 'original' },
  'tool:redis': { folder: 'redis', variant: 'original' },
  'tool:mongodb': { folder: 'mongodb', variant: 'original' },
  'tool:mysql': { folder: 'mysql', variant: 'original' },
  'tool:sqlite': { folder: 'sqlite', variant: 'original' },
  'tool:elasticsearch': { folder: 'elasticsearch', variant: 'original' },
  'tool:neo4j': { folder: 'neo4j', variant: 'original' },
  // Tools — infrastructure
  'tool:kubernetes': { folder: 'kubernetes', variant: 'plain' },
  'tool:terraform': { folder: 'terraform', variant: 'original' },
  'tool:ansible': { folder: 'ansible', variant: 'original' },
  'tool:nginx': { folder: 'nginx', variant: 'original' },
  'tool:jenkins': { folder: 'jenkins', variant: 'original' },
  'tool:github-actions': { folder: 'githubactions', variant: 'original' },
  'tool:azure': { folder: 'azure', variant: 'original' },
  'tool:gcp': { folder: 'googlecloud', variant: 'original' },
  'tool:heroku': { folder: 'heroku', variant: 'original' },
  'tool:digitalocean': { folder: 'digitalocean', variant: 'original' },
  // Tools — ML/data
  'tool:tensorflow': { folder: 'tensorflow', variant: 'original' },
  'tool:pytorch': { folder: 'pytorch', variant: 'original' },
  'tool:pandas': { folder: 'pandas', variant: 'original' },
  'tool:numpy': { folder: 'numpy', variant: 'original' },
  'tool:jupyter': { folder: 'jupyter', variant: 'original' },
  'tool:anaconda': { folder: 'anaconda', variant: 'original' },
  'tool:matlab': { folder: 'matlab', variant: 'original' },
  // Tools — services & monitoring
  'tool:graphql': { folder: 'graphql', variant: 'plain' },
  'tool:aws': { folder: 'amazonwebservices', variant: 'plain-wordmark' },
  'tool:prometheus': { folder: 'prometheus', variant: 'original' },
  'tool:grafana': { folder: 'grafana', variant: 'original' },
  'tool:sentry': { folder: 'sentry', variant: 'original' },
  'tool:rabbitmq': { folder: 'rabbitmq', variant: 'original' },
  'tool:kafka': { folder: 'apachekafka', variant: 'original' },
  // Tools — build & frontend
  'tool:vite': { folder: 'vitejs', variant: 'original' },
  'tool:webpack': { folder: 'webpack', variant: 'original' },
  'tool:tailwindcss': { folder: 'tailwindcss', variant: 'original' },
  'tool:sass': { folder: 'sass', variant: 'original' },
  'tool:eslint': { folder: 'eslint', variant: 'original' },
  'tool:babel': { folder: 'babel', variant: 'original' },
  'tool:npm': { folder: 'npm', variant: 'original-wordmark' },
  'tool:yarn': { folder: 'yarn', variant: 'original' },
  // Tools — hosting/CI
  'tool:vercel': { folder: 'vercel', variant: 'original' },
  'tool:gitlab-ci': { folder: 'gitlab', variant: 'original' },
  'tool:circleci': { folder: 'circleci', variant: 'plain' },
  'tool:supabase': { folder: 'supabase', variant: 'original' },
  // Tools — version control & editors
  'tool:git': { folder: 'git', variant: 'original' },
  'tool:github': { folder: 'github', variant: 'original' },
  'tool:vim': { folder: 'vim', variant: 'original' },
  'tool:vscode': { folder: 'vscode', variant: 'original' },
};

/** Brand colors for colored-initial fallback. */
const BRAND_COLORS: Record<string, { bg: string; fg: string }> = {
  // Languages
  'language:typescript': { bg: '#3178C6', fg: '#fff' },
  'language:javascript': { bg: '#F7DF1E', fg: '#000' },
  'language:python': { bg: '#3776AB', fg: '#FFD43B' },
  'language:rust': { bg: '#DEA584', fg: '#000' },
  'language:go': { bg: '#00ADD8', fg: '#fff' },
  'language:java': { bg: '#ED8B00', fg: '#fff' },
  'language:kotlin': { bg: '#7F52FF', fg: '#fff' },
  'language:swift': { bg: '#F05138', fg: '#fff' },
  'language:c': { bg: '#A8B9CC', fg: '#000' },
  'language:cpp': { bg: '#00599C', fg: '#fff' },
  'language:csharp': { bg: '#68217A', fg: '#fff' },
  'language:ruby': { bg: '#CC342D', fg: '#fff' },
  'language:elixir': { bg: '#4B275F', fg: '#fff' },
  'language:html': { bg: '#E34F26', fg: '#fff' },
  'language:css': { bg: '#1572B6', fg: '#fff' },
  'language:php': { bg: '#777BB4', fg: '#fff' },
  'language:scala': { bg: '#DC322F', fg: '#fff' },
  'language:r': { bg: '#276DC3', fg: '#fff' },
  'language:dart': { bg: '#0175C2', fg: '#fff' },
  'language:lua': { bg: '#2C2D72', fg: '#fff' },
  'language:perl': { bg: '#39457E', fg: '#fff' },
  'language:haskell': { bg: '#5D4F85', fg: '#fff' },
  'language:shell': { bg: '#4EAA25', fg: '#fff' },
  'language:bash': { bg: '#4EAA25', fg: '#fff' },
  'language:powershell': { bg: '#5391FE', fg: '#fff' },
  'language:groovy': { bg: '#4298B8', fg: '#fff' },
  'language:objective-c': { bg: '#438EFF', fg: '#fff' },
  'language:clojure': { bg: '#5881D8', fg: '#fff' },
  'language:erlang': { bg: '#A90533', fg: '#fff' },
  'language:fsharp': { bg: '#378BBA', fg: '#fff' },
  'language:tsql': { bg: '#CC2927', fg: '#fff' },
  'language:sql': { bg: '#336791', fg: '#fff' },
  'language:plsql': { bg: '#F80000', fg: '#fff' },
  // Frameworks
  'framework:react': { bg: '#61DAFB', fg: '#000' },
  'framework:vue': { bg: '#4FC08D', fg: '#fff' },
  'framework:angular': { bg: '#DD0031', fg: '#fff' },
  'framework:svelte': { bg: '#FF3E00', fg: '#fff' },
  'framework:django': { bg: '#092E20', fg: '#fff' },
  'framework:spring': { bg: '#6DB33F', fg: '#fff' },
  'framework:flutter': { bg: '#02569B', fg: '#fff' },
  'framework:laravel': { bg: '#FF2D20', fg: '#fff' },
  'framework:dotnet': { bg: '#512BD4', fg: '#fff' },
  'framework:gatsby': { bg: '#663399', fg: '#fff' },
  'framework:ember': { bg: '#E04E39', fg: '#fff' },
  'framework:ionic': { bg: '#3880FF', fg: '#fff' },
  'framework:phoenix': { bg: '#FD4F00', fg: '#fff' },
  // Tools
  'tool:docker': { bg: '#2496ED', fg: '#fff' },
  'tool:redis': { bg: '#DC382D', fg: '#fff' },
  'tool:mongodb': { bg: '#47A248', fg: '#fff' },
  'tool:kafka': { bg: '#231F20', fg: '#fff' },
  'tool:prometheus': { bg: '#E6522C', fg: '#fff' },
  'tool:kubernetes': { bg: '#326CE5', fg: '#fff' },
  'tool:tensorflow': { bg: '#FF6F00', fg: '#fff' },
  'tool:pytorch': { bg: '#EE4C2C', fg: '#fff' },
  'tool:jupyter': { bg: '#F37626', fg: '#fff' },
  'tool:github-actions': { bg: '#2088FF', fg: '#fff' },
  'tool:azure': { bg: '#0078D4', fg: '#fff' },
  'tool:gcp': { bg: '#4285F4', fg: '#fff' },
  'tool:heroku': { bg: '#430098', fg: '#fff' },
  'tool:elasticsearch': { bg: '#005571', fg: '#fff' },
  'tool:rabbitmq': { bg: '#FF6600', fg: '#fff' },
  'tool:tailwindcss': { bg: '#06B6D4', fg: '#fff' },
  'tool:sass': { bg: '#CC6699', fg: '#fff' },
  'tool:graphql': { bg: '#E10098', fg: '#fff' },
  'tool:aws': { bg: '#232F3E', fg: '#FF9900' },
  'tool:terraform': { bg: '#7B42BC', fg: '#fff' },
  'tool:ansible': { bg: '#EE0000', fg: '#fff' },
  'tool:firebase': { bg: '#FFCA28', fg: '#000' },
  'tool:git': { bg: '#F05032', fg: '#fff' },
  'tool:github': { bg: '#181717', fg: '#fff' },
};

/** Default fallback color for unknown technologies. */
const DEFAULT_COLORS = { bg: '#6B7280', fg: '#fff' };

/**
 * Renders a small branded icon for a taxonomy ID.
 * Uses devicon CDN image when available, falls back to a colored initial badge.
 */
export function TechIcon({ taxonomyId }: { taxonomyId: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  // Normalize to lowercase for case-insensitive lookup (Firestore stores mixed casing)
  const normalizedId = taxonomyId.toLowerCase();
  const devicon = DEVICON_MAP[normalizedId];

  if (devicon && !imgFailed) {
    const url = `${DEVICON_CDN}/${devicon.folder}/${devicon.folder}-${devicon.variant}.svg`;
    return (
      <img
        src={url}
        alt=""
        width={14}
        height={14}
        className="flex-shrink-0"
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }

  // Fallback: colored circle with first initial
  const label = taxonomyId.split(':')[1] ?? '?';
  const initial = label.charAt(0).toUpperCase();
  const colors = BRAND_COLORS[normalizedId] ?? DEFAULT_COLORS;

  return (
    <span
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm text-[0.5rem] font-bold flex-shrink-0 leading-none"
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      {initial}
    </span>
  );
}
