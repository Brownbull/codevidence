/**
 * src/pipeline/analysis/framework-patterns.ts — Framework API depth patterns.
 *
 * Defines regex patterns for each framework organized by depth level.
 * Used by import-analysis.ts to classify how deeply a developer uses a framework.
 * 4 depth levels: beginner → intermediate → advanced → expert.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DepthLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export const DEPTH_LEVELS: readonly DepthLevel[] = [
  'beginner', 'intermediate', 'advanced', 'expert',
];

/**
 * Framework depth patterns: Record<frameworkTaxonomyId, RegExp[][]>
 * Index 0 = beginner, 1 = intermediate, 2 = advanced, 3 = expert
 */
export const FRAMEWORK_DEPTH_PATTERNS: Record<string, RegExp[][]> = {
  'framework:react': [
    // Beginner: basic hooks, JSX
    [/\buseState\s*\(/, /\buseEffect\s*\(/, /export\s+(?:default\s+)?function\s+\w+/, /\bJSX\b|<\w+[\s/>]/],
    // Intermediate: advanced hooks, context, custom hooks
    [/\buseContext\s*\(/, /\buseCallback\s*\(/, /\buseRef\s*\(/, /export\s+(?:function|const)\s+use[A-Z]/],
    // Advanced: memoization, Suspense, portals, error boundaries
    [/\bReact\.memo\b|memo\(/, /\buseMemo\s*\(/, /\buseReducer\s*\(/, /<Suspense|React\.lazy/,
     /\bcreatePortal\b/, /\bforwardRef\b|React\.forwardRef/, /componentDidCatch|ErrorBoundary/],
    // Expert: concurrent features, transitions
    [/\buseTransition\s*\(/, /\buseDeferredValue\s*\(/, /\bstartTransition\b/, /\bflushSync\b/],
  ],
  'framework:express': [
    [/app\.(get|post|put|delete|use)\s*\(/, /req\.(body|params|query)/, /res\.(send|json|status)\(/],
    [/Router\(\)/, /app\.use\(\s*express\.json/, /next\(/, /req\.headers/],
    [/app\.use\(\s*(?:cors|helmet|morgan)/, /express\.static\(/, /app\.set\(/,
     /\.param\(/, /app\.locals/],
    [/app\.engine\(/, /req\.app\.get\(/, /res\.format\(/, /trust\s*proxy/],
  ],
  'framework:nextjs': [
    [/from\s+['"]next\/link/, /from\s+['"]next\/image/, /getStaticProps|getServerSideProps/],
    [/from\s+['"]next\/router/, /from\s+['"]next\/head/, /useRouter\s*\(/],
    [/from\s+['"]next\/dynamic/, /from\s+['"]next\/script/, /middleware\.ts|middleware\.js/,
     /generateStaticParams|generateMetadata/],
    [/from\s+['"]next\/server/, /NextRequest|NextResponse/, /revalidatePath|revalidateTag/,
     /unstable_cache|connection\(\)/],
  ],
  'framework:django': [
    [/from\s+django\./, /urlpatterns/, /HttpResponse|render\(/, /models\.Model/],
    [/class\s+\w+Form\(/, /class\s+\w+View\(/, /from\s+django\.contrib/, /MIDDLEWARE/],
    [/class\s+\w+Serializer\(/, /from\s+rest_framework/, /select_related|prefetch_related/,
     /transaction\.atomic/],
    [/from\s+django\.db\.models\s+import\s+F|Q/, /Subquery|OuterRef/, /custom_manager|Manager/,
     /async\s+def\s+\w+.*request/],
  ],
  'framework:fastapi': [
    [/from\s+fastapi\s+import/, /app\s*=\s*FastAPI/, /@app\.(get|post)\(/, /def\s+\w+.*response_model/],
    [/Depends\(/, /from\s+pydantic\s+import/, /HTTPException/, /Query\(|Path\(|Body\(/],
    [/BackgroundTasks/, /from\s+fastapi\.middleware/, /WebSocket/, /APIRouter/],
    [/from\s+fastapi\.security/, /OAuth2PasswordBearer/, /startup|shutdown|lifespan/,
     /from\s+starlette/],
  ],
  'framework:nestjs': [
    [/@Module\(/, /@Controller\(/, /@Injectable\(/, /@Get\(|@Post\(/],
    [/@Body\(|@Param\(|@Query\(/, /CanActivate|UseGuards/, /from\s+['"]@nestjs\/common/],
    [/@UseInterceptors\(/, /@UsePipes\(/, /from\s+['"]@nestjs\/microservices/,
     /from\s+['"]@nestjs\/websockets/],
    [/DynamicModule/, /from\s+['"]@nestjs\/cqrs/, /from\s+['"]@nestjs\/graphql/,
     /HealthCheck|TerminusModule/],
  ],
};

/** File extensions to scan per framework. */
export const FRAMEWORK_FILE_EXTENSIONS: Record<string, string[]> = {
  'framework:react': ['.tsx', '.jsx', '.ts', '.js'],
  'framework:express': ['.ts', '.js'],
  'framework:nextjs': ['.tsx', '.jsx', '.ts', '.js'],
  'framework:django': ['.py'],
  'framework:fastapi': ['.py'],
  'framework:nestjs': ['.ts', '.js'],
};

/** Minimum patterns matched at a level to qualify for that depth. */
export const MIN_PATTERNS_FOR_LEVEL = 2;
