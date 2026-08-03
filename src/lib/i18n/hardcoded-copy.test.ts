import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const scanRoots = [
  'src/app',
  'src/components/marketing',
  'src/components/auth',
  'src/components/onboarding',
  'src/components/app-shell',
  'src/components/history',
  'src/components/result-workspace',
  'src/components/billing',
] as const;

// This is intentionally a finite, reviewed vocabulary rather than an
// English-language heuristic. New phrases are added after a human copy review,
// so URLs, keys, class names, product identity, and code diagnostics do not
// become false positives.
const reviewedEnglishPhrases = new Set([
  'Gleen — Watch less. Understand more.',
  'Turn any YouTube video into a structured summary, smart flashcards, precise timestamps, and export-ready knowledge.',
  'Skip to content',
  'Help',
  'Unavailable',
  'Something went wrong. Try again.',
  'Loading',
  'Loading…',
  'New analysis',
  'History',
  'Subscription',
  'Settings',
  'Plan',
  'Usage',
  'More',
  'Close',
  'Try again',
  'Summary',
  'Flashcards',
  'Timestamps',
  'Transcript',
  'Export',
  'Result title',
  'Saving…',
  'Saved',
  'Retry',
  'Artifact not requested',
  'This artifact was not selected for this analysis.',
  'No artifact content',
  'This analysis did not produce usable content for this artifact.',
  'Artifact still processing',
  'This artifact is not ready yet. Other available results remain usable.',
  'Artifact could not be read',
  'The saved content is corrupted or uses an unsupported format.',
  'Artifact could not be generated',
  'Generation failed, but the rest of this result is still available.',
  'Player unavailable',
  'Reduced motion:',
  'detecting',
  'on',
  'off',
  'No toast action invoked',
  'Show neutral toast',
  'Neutral notification',
  'Show success toast',
  'Successful notification',
  'The example action completed.',
  'Show error toast',
  'Error notification',
  'The example action needs attention.',
  'Retry action invoked',
  'Show long toast',
  'Toast action result',
  'Environment-only reference',
  'Gleen UI primitives',
  'Interactive states and shared tokens for implementation review.',
  'Tokens',
  'Buttons',
  'Primary',
  'Soft',
  'Ghost',
  'Danger',
  'Small',
  'Add example',
  'Disabled',
  'Save',
  'Saving example',
  'Inputs',
  'Default input',
  'Example value',
  'Input with hint',
  'Supporting guidance.',
  'Input with icon',
  'Invalid input',
  'Invalid',
  'Review this value.',
  'Disabled input',
  'Panels',
  'Panel surface · small padding',
  'Raised surface · medium padding',
  'Panel surface · large padding',
  'Long panel content example',
  'Overlays',
  'Open example dialog',
  'Example dialog',
  'A neutral interaction for primitive review.',
  'Confirm example',
  'Open long dialog',
  'Open example menu',
  'Example options',
  'Available item',
  'Disabled item',
  'Checked option',
  'Open long-content menu',
  'Focus for tooltip',
  'Keyboard and pointer guidance',
  'Tab accents',
  'First',
  'Second',
  'First tab content',
  'Second tab content',
  'Short label',
  'Select the long label to inspect its content.',
  'Toasts',
  'Skeletons',
  'Rectangle',
  'Text lines',
  'Development-only deterministic demo',
  'Analyze processing motion fixture',
  'Analyze video',
  'Replay sequence',
  'Preview error',
  'Fixture error: the demo video could not be accessed.',
  'Fixture analysis',
  'Start fixture analysis',
  'View available results',
  'Resume active analysis',
  'This workspace is ready for the next product stage.',
  'Secure Stripe payment preview',
  '◇ Have a promo code?',
  'Ready',
  'Processing',
  'Failed',
  'Balanced',
  'Partial',
  'Favorite could not be saved.',
  'Email',
  'Card number',
  'Expiry',
  'CVC',
  'Country',
  'United States',
  'VAT ID',
  '● Save payment method',
  '● Email invoice receipt',
]);

type AllowlistEntry = Readonly<{
  file: string;
  phrase: string;
  reason: string;
}>;

// Exact file+phrase exceptions only. These values are content owned by the
// fixture or Stripe preview rather than Gleen interface copy. Product name
// `Gleen`, URLs, stable keys, CSS classes, and diagnostic messages are absent
// from the reviewed phrase set and therefore need no broad wildcard escape.
const allowlist: readonly AllowlistEntry[] = [
  {
    file: 'src/app/app-shell-fixture/app/video/[id]/page.tsx',
    phrase: 'Invalid',
    reason:
      'Deterministic corrupted artifact content used to exercise result recovery.',
  },
  ...[
    'Email',
    'Card number',
    'Expiry',
    'CVC',
    'Country',
    'United States',
    'VAT ID',
    '● Save payment method',
    '● Email invoice receipt',
  ].map((phrase) => ({
    file: 'src/app/billing-fixture/[screen]/fixture-screen.tsx',
    phrase,
    reason: 'Provider-owned Stripe Elements preview content.',
  })),
  ...['Ready', 'Processing', 'Failed', 'Balanced', 'Partial'].map((phrase) => ({
    file: 'src/components/app-shell/fixture-history.tsx',
    phrase,
    reason:
      'Deterministic fixture row content used to exercise History presentation.',
  })),
] as const;

const allowedOccurrences = new Set(
  allowlist.map(({ file, phrase }) => `${file}\u0000${phrase}`),
);

function productionTsxFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) return productionTsxFiles(absolute);
    return entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')
      ? [absolute]
      : [];
  });
}

function normalized(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function auditedLiterals(file: string): readonly {
  phrase: string;
  line: number;
}[] {
  const sourceText = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const literals: { phrase: string; line: number }[] = [];

  function visit(node: ts.Node) {
    const value =
      ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
        ? node.text
        : ts.isJsxText(node)
          ? node.getText(source)
          : null;
    if (value !== null) {
      const phrase = normalized(value);
      if (reviewedEnglishPhrases.has(phrase)) {
        literals.push({
          phrase,
          line:
            source.getLineAndCharacterOfPosition(node.getStart(source)).line +
            1,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return literals;
}

describe('localized production copy audit', () => {
  it('keeps reviewed English interface phrases out of production TSX', () => {
    const violations = scanRoots.flatMap((root) =>
      productionTsxFiles(path.join(process.cwd(), root)).flatMap((file) => {
        const relativeFile = path.relative(process.cwd(), file);
        return auditedLiterals(file)
          .filter(
            ({ phrase }) =>
              !allowedOccurrences.has(`${relativeFile}\u0000${phrase}`),
          )
          .map(
            ({ phrase, line }) =>
              `${relativeFile}:${line} — ${JSON.stringify(phrase)}`,
          );
      }),
    );

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
