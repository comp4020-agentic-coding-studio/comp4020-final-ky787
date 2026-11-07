import MarkdownIt from 'markdown-it';

const repository = 'https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787';
const raw = 'https://raw.githubusercontent.com/comp4020-agentic-coding-studio/comp4020-final-ky787/main/';

/** README links are repository-relative, whereas /readme/ serves only this page. */
function repositoryUrl(href: string, image = false): string {
    if (!href || /^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) return href;
    const directory = href.split(/[?#]/)[0].endsWith('/');
    return new URL(href, image ? raw : `${repository}/${directory ? 'tree' : 'blob'}/main/`).href;
}

// Raw HTML remains text, and markdown-it's default URL validation rejects script
// links. README rendering never needs client-side JavaScript or HTML passthrough.
const markdown = new MarkdownIt({ html: false });
markdown.renderer.rules.link_open = (tokens, index, options, _env, renderer) => {
    const token = tokens[index];
    token.attrSet('href', repositoryUrl(String(token.attrGet('href') ?? '')));
    return renderer.renderToken(tokens, index, options);
};
const image = markdown.renderer.rules.image!;
markdown.renderer.rules.image = (tokens, index, options, env, renderer) => {
    const token = tokens[index];
    token.attrSet('src', repositoryUrl(String(token.attrGet('src') ?? ''), true));
    token.attrSet('loading', 'lazy'); token.attrSet('decoding', 'async');
    return image(tokens, index, options, env, renderer);
};
markdown.renderer.rules.heading_open = (tokens, index, options, env, renderer) => {
    const text = tokens[index + 1].children?.filter(t => ['text', 'code_inline', 'image'].includes(t.type)).map(t => t.content).join('') ?? '';
    const base = text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
    const headings = env?.headings instanceof Set ? env.headings : new Set<string>();
    let id = base;
    for (let n = 1; headings.has(id); n++) id = `${base}-${n}`;
    headings.add(id); tokens[index].attrSet('id', id);
    return renderer.renderToken(tokens, index, options);
};
markdown.renderer.rules.table_open = () => '<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable table"><table>\n';
markdown.renderer.rules.table_close = () => '</table></div>\n';

export function renderReadme(source: string): string {
    const content = markdown.render(source, { headings: new Set<string>() });
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>Binary Ninja — README</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; background: #0c131a; color: #dce7ed; font: 17px/1.7 system-ui, sans-serif; }
a { color: #77e4d7; text-underline-offset: .18em; }
a:hover { color: #b5fff5; }
:focus-visible { outline: 2px solid #ffd76a; outline-offset: 4px; }
header, main { width: min(100% - 3rem, 960px); margin: auto; }
header { display: flex; flex-wrap: wrap; gap: 1rem 2rem; align-items: center; justify-content: space-between; padding: 1.5rem 0; border-bottom: 1px solid #344955; }
header a { text-decoration: none; }
.brand { color: #dce7ed; font-weight: 750; letter-spacing: .08em; }
nav { display: flex; gap: 1.5rem; font-size: .9rem; }
main { padding: 1.5rem 0 4rem; overflow-wrap: anywhere; }
h1, h2, h3, h4, h5, h6 { color: #f1f6f8; line-height: 1.25; scroll-margin-top: 1.5rem; }
h1 { font-size: clamp(2rem, 6vw, 3rem); margin: .5rem 0 1rem; }
h2 { margin: 2.5rem 0 1rem; padding-bottom: .45rem; border-bottom: 1px solid #344955; font-size: 1.7rem; }
h3 { margin-top: 2rem; font-size: 1.25rem; }
p, ul, ol { margin: 1rem 0; }
ul, ol { padding-left: 1.6rem; }
li + li { margin-top: .45rem; }
img { display: block; max-width: 100%; height: auto; margin: 1.5rem auto; border: 1px solid #344955; border-radius: 8px; }
code { font: .88em/1.6 ui-monospace, monospace; background: #1a2934; border-radius: 4px; padding: .12em .3em; }
pre { padding: 1.2rem; border: 1px solid #344955; border-radius: 8px; background: #101d27; overflow: auto; }
pre code { padding: 0; background: none; white-space: pre; }
.table-scroll { margin: 1.5rem 0; overflow-x: auto; border: 1px solid #344955; border-radius: 8px; }
table { width: 100%; min-width: 540px; border-collapse: collapse; font-size: .94em; }
th, td { padding: .7rem 1rem; text-align: left; vertical-align: top; border-bottom: 1px solid #344955; }
th { color: #f1f6f8; background: #1a2934; }
tr:last-child td { border-bottom: 0; }
blockquote { margin: 1.5rem 0; padding: .1rem 1.2rem; border-left: 3px solid #77e4d7; color: #b8cad5; }
hr { border: 0; border-top: 1px solid #344955; margin: 2rem 0; }
@media (max-width: 600px) { body { font-size: 16px; } header, main { width: calc(100% - 2rem); } nav { gap: 1rem; } }
</style>
</head>
<body>
<header><a class="brand" href="/">BINARY NINJA</a><nav aria-label="Main"><a href="/">Play game</a><a href="${repository}">Repository</a></nav></header>
<main><article class="readme">${content}</article></main>
</body>
</html>`;
}
