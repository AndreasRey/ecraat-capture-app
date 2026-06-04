// Static verification that the production bundle cannot crash with a
// cross-chunk module init-order error (the "X is not a function" /
// "Cannot access X before initialization" class of bug that manualChunks can
// introduce).
//
// Root cause of that crash: a CYCLE in the *eager* (static-import) chunk graph.
// ES-module chunks execute their top-level code as they load, in one linear
// order; if chunk A statically imports B and B statically imports A, no valid
// order exists and whichever runs second sees an uninitialized export.
//
// Conversely, if the static-import chunk graph is a DAG, Rollup loads the
// chunks in topological order and every import is fully evaluated before use,
// so this crash is impossible. This script builds that graph from the emitted
// assets and fails if it finds a cycle.
//
// Dynamic import() edges are intentionally ignored: those chunks load lazily,
// not during initial evaluation, so cycles through them don't cause the crash.
//
// Usage: node scripts/analyzeChunkCycles.mjs [assetsDir]
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const assetsDir = process.argv[2] || 'build/app/assets';

// Match static imports AND re-exports (both create eager cross-chunk edges):
//   import x from "./y.js"      import {a} from './y.js'      import * as x from "./y.js"
//   import "./y.js"             (side-effect import)
//   export {a} from "./y.js"    export * from "./y.js"        export * as x from "./y.js"
// NOT dynamic import("./y.js") — that has a "(" right after `import`, which the
// excluded "(" in the character class prevents from matching.
const STATIC_IMPORT_RE = /\b(?:import|export)\b(?:[^"'()]*?\bfrom\s*)?["']([^"']+)["']/g;

const files = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
const known = new Set(files.map((f) => basename(f)));

/** @type {Map<string, Set<string>>} */
const graph = new Map();
for (const f of files) {
    graph.set(f, new Set());
    const code = readFileSync(join(assetsDir, f), 'utf8');
    let m;
    STATIC_IMPORT_RE.lastIndex = 0;
    while ((m = STATIC_IMPORT_RE.exec(code)) !== null) {
        const target = basename(m[1]);
        if (target !== f && known.has(target)) {
            graph.get(f).add(target);
        }
    }
}

// Detect cycles via iterative DFS, recording the cycle path.
const WHITE = 0;
const GRAY = 1;
const BLACK = 2;
const color = new Map(files.map((f) => [f, WHITE]));
const cycles = [];

function dfs(start) {
    const stack = [{ node: start, iter: graph.get(start).values(), path: [start] }];
    color.set(start, GRAY);
    while (stack.length) {
        const top = stack[stack.length - 1];
        const next = top.iter.next();
        if (next.done) {
            color.set(top.node, BLACK);
            stack.pop();
            continue;
        }
        const child = next.value;
        const c = color.get(child);
        if (c === GRAY) {
            const idx = top.path.indexOf(child);
            cycles.push([...top.path.slice(idx), child]);
        } else if (c === WHITE) {
            color.set(child, GRAY);
            stack.push({ node: child, iter: graph.get(child).values(), path: [...top.path, child] });
        }
    }
}

for (const f of files) {
    if (color.get(f) === WHITE) dfs(f);
}

console.log('=== CHUNK CYCLE ANALYSIS ===');
console.log(`Assets dir: ${assetsDir}`);
console.log(`JS chunks: ${files.length}`);
let edgeCount = 0;
for (const deps of graph.values()) edgeCount += deps.size;
console.log(`Static (eager) chunk->chunk edges: ${edgeCount}`);

// Show the biggest chunks for context.
const sized = files
    .map((f) => ({ f, kb: (readFileSync(join(assetsDir, f)).length / 1024) }))
    .sort((a, b) => b.kb - a.kb)
    .slice(0, 8);
console.log('\nLargest chunks:');
sized.forEach(({ f, kb }) => console.log(`  ${kb.toFixed(0).padStart(6)} kB  ${f}`));

if (cycles.length > 0) {
    // Deduplicate cycles by their sorted member set.
    const seen = new Set();
    const unique = [];
    for (const cyc of cycles) {
        const key = [...new Set(cyc)].sort().join('|');
        if (!seen.has(key)) { seen.add(key); unique.push(cyc); }
    }
    console.log(`\n>>> FOUND ${unique.length} CROSS-CHUNK CYCLE(S) — init-order crash risk:`);
    unique.forEach((cyc, i) => console.log(`  cycle ${i + 1}: ${cyc.join(' -> ')}`));
    console.log('\nRESULT: FAIL — this chunking can crash at runtime.');
    process.exit(1);
}

console.log('\nRESULT: PASS — eager chunk graph is a DAG; no cross-chunk init-order crash possible.');
process.exit(0);
