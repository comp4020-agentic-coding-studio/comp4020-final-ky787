import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import MarkdownIt from 'markdown-it';
import { expect, it } from 'vitest';
import { createApp } from '../server/app.ts';
import { renderReadme } from '../server/readme-page.ts';
import { cleanups, directory } from './helpers/coop-server.ts';

const repository = 'https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787';
const raw = 'https://raw.githubusercontent.com/comp4020-agentic-coding-studio/comp4020-final-ky787/main';
async function app() {
    const server = await createApp(await directory());
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    cleanups.push(async () => { server.emit('shutdown'); await new Promise<void>(resolve => server.close(() => resolve())); });
    return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
function parse(html: string, url: string) {
    const dom = new JSDOM(html, { url });
    cleanups.push(async () => dom.window.close());
    return dom.window.document;
}
function link(document: Document, text: string) {
    const element = [...document.querySelectorAll<HTMLAnchorElement>('a')].find(a => a.textContent === text);
    expect(element, `missing rendered link: ${text}`).toBeDefined(); return element!;
}

it.each(['/readme', '/readme/'])('%s serves the current README as semantic HTML and HEAD without a body', async path => {
    const origin = await app(), response = await fetch(origin + path);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/html;\s*charset=utf-8/i);
    const document = parse(await response.text(), origin + path), article = document.querySelector('article.readme');
    expect(article).not.toBeNull();
    // HTTP integration follows the current tracked prose. Formatting guarantees
    // belong to the stable fixture below, not a frozen inventory of README sections.
    const source = await readFile('README.md', 'utf8');
    const reference = parse(new MarkdownIt({ html: false }).render(source), origin + path);
    const headingSelector = 'h1, h2, h3, h4, h5, h6';
    const headings = (root: ParentNode) => [...root.querySelectorAll(headingSelector)].map(e => ({ tag: e.tagName, text: e.textContent }));
    expect(headings(article!)).toEqual(headings(reference));
    expect(article!.querySelector(headingSelector)?.textContent).toBe(reference.querySelector(headingSelector)?.textContent);
    expect(article!.textContent?.trim()).toBe(reference.body.textContent?.trim());
    expect(document.querySelector('body > pre')).toBeNull();
    expect(document.querySelector('meta[name="viewport"]')?.getAttribute('content')).toContain('width=device-width');
    const head = await fetch(origin + path, { method: 'HEAD' });
    expect(head.status).toBe(200); expect(head.headers.get('content-type')).toBe(response.headers.get('content-type'));
    expect(await head.text()).toBe('');
});

it('renders rich Markdown with repository links/images and preserves local fragments and web/app links', () => {
    const document = parse(renderReadme([
        '# Fixture', '**Cooperative puzzles** stay readable.', '## Details', '## Details',
        '| Mode | Purpose |\n| --- | --- |\n| **Co-op** | Work together |',
        '1. Start game\n2. Invite partner', '- Read signals\n- Reach exit',
        '```bash\npnpm install --frozen-lockfile\npnpm dev\n```',
        '[fragment](#details)', '[file](./docs/guide.md#setup)', '[directory](docs/)', '[process](PROCESS.md)',
        '[web](https://example.test/guide?q=1&lang=en#next)', '[builder](/workbench.html)',
        '![screen](./docs/playtest/screen.png)',
    ].join('\n\n')), 'https://deployed.example/readme/');
    const article = document.querySelector('article.readme')!;
    expect(article.querySelector('h1')?.textContent).toBe('Fixture');
    expect(article.querySelector('strong')?.textContent).toBe('Cooperative puzzles');
    expect([...article.querySelectorAll('table thead th')].map(e => e.textContent)).toEqual(['Mode', 'Purpose']);
    expect([...article.querySelectorAll('table tbody td')].map(e => e.textContent)).toEqual(['Co-op', 'Work together']);
    expect([...article.querySelectorAll('ol > li')].map(e => e.textContent)).toEqual(['Start game', 'Invite partner']);
    expect([...article.querySelectorAll('ul > li')].map(e => e.textContent)).toEqual(['Read signals', 'Reach exit']);
    expect(article.querySelector('pre > code.language-bash')?.textContent).toBe('pnpm install --frozen-lockfile\npnpm dev\n');
    expect(link(document, 'fragment').getAttribute('href')).toBe('#details');
    expect(document.querySelector('#details')?.textContent).toBe('Details');
    expect(document.querySelector('#details-1')?.textContent).toBe('Details');
    expect(link(document, 'file').href).toBe(`${repository}/blob/main/docs/guide.md#setup`);
    expect(link(document, 'process').href).toBe(`${repository}/blob/main/PROCESS.md`);
    expect(link(document, 'directory').href.replace(/\/$/, '')).toBe(`${repository}/tree/main/docs`);
    expect(link(document, 'web').getAttribute('href')).toBe('https://example.test/guide?q=1&lang=en#next');
    expect(link(document, 'builder').getAttribute('href')).toBe('/workbench.html');
    expect(document.querySelector<HTMLImageElement>('img[alt="screen"]')?.src).toBe(`${raw}/docs/playtest/screen.png`);
});

it('keeps raw HTML inert and rejects executable Markdown link/image targets', () => {
    const document = parse(renderReadme([
        '# Safe & readable',
        '<script>globalThis.compromised = true</script>',
        '<img src="x" onerror="alert(1)">',
        '[unsafe](javascript:alert(1))', '[mixed](JaVaScRiPt:alert(1))',
        '[encoded](javascript&#x3a;alert(1))', '![bad](javascript:alert(1))',
        '```html\n<script>exampleOnly()</script>\n```',
        '[safe](https://example.test/)',
    ].join('\n\n')), 'https://deployed.example/readme/');
    expect(document.querySelector('script, [onerror], img[src="x"]')).toBeNull();
    expect(document.body.textContent).toContain('<script>globalThis.compromised = true</script>');
    expect(document.querySelector('pre > code')?.textContent).toBe('<script>exampleOnly()</script>\n');
    const destinations = [...document.querySelectorAll('[href], [src]')].flatMap(e => [e.getAttribute('href'), e.getAttribute('src')]).filter(Boolean);
    expect(destinations.some(value => /^javascript:/i.test(value!.replace(/[\s\u0000-\u001f]/g, '')))).toBe(false);
    expect(link(document, 'safe').href).toBe('https://example.test/');
});
