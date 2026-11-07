import { once } from 'node:events';
import { JSDOM } from 'jsdom';
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
    expect(article!.querySelector('h1')?.textContent).toBe('Binary Ninja');
    expect(article!.querySelector('#controls')?.tagName).toBe('H3');
    expect([...article!.querySelectorAll('table thead th')].map(e => e.textContent)).toEqual(expect.arrayContaining(['Mode', 'Chambers', 'Purpose', 'Input', 'Action']));
    expect(article!.querySelector('table tbody')?.textContent).toContain('Co-op Campaign');
    expect([...article!.querySelectorAll('ol > li')].some(e => e.textContent?.includes('Play Co-op'))).toBe(true);
    expect([...article!.querySelectorAll('ul > li')].some(e => e.textContent?.includes('Physical cooperation'))).toBe(true);
    expect([...article!.querySelectorAll('pre > code.language-bash')].some(e => e.textContent?.includes('pnpm install --frozen-lockfile'))).toBe(true);
    expect(article!.querySelector('strong')?.textContent).toContain('browser-based');
    expect(document.querySelector('body > pre')).toBeNull();
    expect(link(document, 'Development process').href).toBe(`${repository}/blob/main/PROCESS.md`);
    expect(link(document, 'character profile contract').href).toBe(`${repository}/blob/main/docs/character-profiles.md`);
    expect(link(document, 'Play Binary Ninja').href).toBe('https://comp4020-final-ky787.fly.dev/');
    const image = article!.querySelector<HTMLImageElement>('img[alt="CROSSFEED VAULT overview"]');
    expect(image?.src).toBe(`${raw}/docs/playtest/crossfeed-vault-overview.png`);
    expect([...article!.querySelectorAll<HTMLImageElement>('img')].every(img => img.src.startsWith(raw + '/'))).toBe(true);
    expect(document.querySelector('meta[name="viewport"]')?.getAttribute('content')).toContain('width=device-width');
    const head = await fetch(origin + path, { method: 'HEAD' });
    expect(head.status).toBe(200); expect(head.headers.get('content-type')).toBe(response.headers.get('content-type'));
    expect(await head.text()).toBe('');
});

it('resolves repository files, directories and images without breaking local fragments or web/app links', () => {
    const document = parse(renderReadme([
        '# Fixture', '## Details', '## Details',
        '[fragment](#details)', '[file](./docs/guide.md#setup)', '[directory](docs/)',
        '[web](https://example.test/guide?q=1&lang=en#next)', '[builder](/workbench.html)',
        '![screen](./docs/playtest/screen.png)',
    ].join('\n\n')), 'https://deployed.example/readme/');
    expect(link(document, 'fragment').getAttribute('href')).toBe('#details');
    expect(document.querySelector('#details')?.textContent).toBe('Details');
    expect(document.querySelector('#details-1')?.textContent).toBe('Details');
    expect(link(document, 'file').href).toBe(`${repository}/blob/main/docs/guide.md#setup`);
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
