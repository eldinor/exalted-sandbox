/** Refresh exact dependency notices without modifying the hand-maintained asset audit. */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const marker = '<!-- DEPENDENCY_NOTICES_START -->';
const file = 'THIRD_PARTY_NOTICES.md';
const current = readFileSync(file, 'utf8');
if (!current.includes(marker)) throw new Error('Missing third-party inventory marker.');
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const groups = new Map();
function retain(path, label) {
    const content = readFileSync(path, 'utf8').replaceAll('\r\n', '\n').trim();
    const hash = createHash('sha256').update(content).digest('hex');
    if (!groups.has(hash)) groups.set(hash, { id: groups.size + 1, content, labels: [] });
    const group = groups.get(hash);
    group.labels.push(`${label} — ${path}`);
    return `[notice ${group.id}](#notice-${group.id})`;
}
const legacy = retain('licenses/vendor/legacy-MIT.txt', 'Earlier repository MIT copyright');
const roboto = retain('licenses/vendor/roboto-Apache-2.0.txt', 'Roboto upstream license');
const rows = [];
const fallbacks = [
    [/^@esbuild\//, 'node_modules/esbuild/LICENSE.md'],
    [/^@rolldown\/binding-/, 'node_modules/rolldown/LICENSE'],
    [/^@fluentui-contrib\//, 'licenses/vendor/fluentui-contrib-MIT.txt'],
    [/^@fluentui\/react-icons$/, 'licenses/vendor/fluentui-icons-MIT.txt'],
    [/^embla-carousel(?:-|$)/, 'licenses/vendor/embla-carousel-MIT.txt'],
];
for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path) continue;
    const installed = existsSync(join(path, 'package.json'));
    const meta = installed ? JSON.parse(readFileSync(join(path, 'package.json'), 'utf8')) : null;
    const name = meta?.name ?? path.split('node_modules/').at(-1);
    const license = meta?.license ?? entry.license ?? 'UNVERIFIED';
    const notices = installed ? readdirSync(path).filter(n => /^(licen[cs]e|copying|notice)([.\-_]|$)/i.test(n)) : [];
    const refs = notices.map(n => retain(join(path, n), `${name}@${meta.version}`));
    if (installed && !refs.length) {
        const fallback = fallbacks.find(([pattern, source]) => pattern.test(name) && existsSync(source));
        if (fallback) refs.push(retain(fallback[1], `${name}@${meta.version} — parent/upstream notice`));
    }
    const registry = `https://registry.npmjs.org/${name.replace('/', '%2f')}/${entry.version}`;
    rows.push(`| ${name} | ${entry.version} | ${meta?.version ?? 'not installed'} | ${typeof license === 'string' ? license : JSON.stringify(license)} | ${entry.dev ? 'development' : 'runtime/transitive'}${entry.optional ? ', optional' : ''} | ${refs.length ? refs.join(', ') : `[package metadata](${registry}); ${installed ? 'notice missing' : 'not installed'}`} |`);
}
const section = [
    `## Dependency inventory (${rows.length} locked package entries)`,
    '',
    `Earlier repository copyright: ${legacy}. Roboto font terms: ${roboto}.`,
    '',
    '| Package | Locked version | Installed version | License | Scope | Exact notices / evidence |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
    '', '## Retained full license and notice texts', '',
];
for (const { id, content, labels } of groups.values()) {
    section.push(`### Notice ${id}`, '', ...labels.map(label => `- ${label}`), '', '~~~~text', content, '~~~~', '');
}
const result = current.slice(0, current.indexOf(marker) + marker.length) + '\n\n' + section.join('\n') + '\n';
writeFileSync(file, result);
writeFileSync('public/THIRD_PARTY_NOTICES.md', result);
writeFileSync('public/LICENSE.txt', readFileSync('LICENSE'));
console.log(`Updated ${rows.length} locked entries and ${groups.size} exact notice texts; public copies included.`);
