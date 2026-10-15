import './custom.css';
import { BrowserDraftStorage } from './browser-storage.ts';
import { serializeDraft } from './model.ts';
import { storageMessage } from './storage.ts';

const storage = new BrowserDraftStorage(), list = document.querySelector('#levels')!, status = document.querySelector('#status')!;
const message = (error: unknown) => { status.textContent = storageMessage(error); };
function download(text: string, name: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), link = document.createElement('a');
    link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function refresh() {
    const entries = await storage.list(); list.replaceChildren();
    status.textContent = entries.length ? `${entries.length} saved level${entries.length === 1 ? '' : 's'}` : 'No saved levels yet. Open Level Builder to create one or import JSON.';
    for (const entry of entries) {
        const card = document.createElement('article'); card.className = 'level-card'; card.dataset.id = entry.id;
        const title = document.createElement('h2'); title.textContent = entry.name; card.append(title);
        const actions = document.createElement('div'); actions.className = 'actions'; card.append(actions);
        const edit = document.createElement('a'); edit.className = 'button'; edit.textContent = 'EDIT'; edit.href = `/workbench.html?draft=${encodeURIComponent(entry.id)}`; actions.append(edit);
        for (const label of ['PLAY WITH FRIEND', 'EXPORT JSON', 'DELETE']) {
            const button = document.createElement('button'); button.textContent = label; actions.append(button);
            button.onclick = () => { void (async () => {
                button.disabled = true;
                const child = label === 'PLAY WITH FRIEND' ? window.open('about:blank', '_blank') : null;
                try {
                    const saved = await storage.load(entry.id);
                    if (label === 'PLAY WITH FRIEND') {
                        const hash = await storage.freeze(saved.document), url = `/custom-level.html?host=${hash}`;
                        if (child) child.location.replace(url); else location.assign(url);
                        status.textContent = 'Room opened. Share its invitation link with your friend.';
                    } else if (label === 'EXPORT JSON') download(serializeDraft(saved.document), saved.name);
                    else if (confirm(`Delete ${saved.name} from this browser? Export JSON first to keep a backup.`)) { await storage.delete(saved.id, saved.revision); await refresh(); }
                } catch (error) { child?.close(); message(error); }
                finally { button.disabled = false; }
            })(); };
        }
        list.append(card);
    }
}
try { await storage.initialize(); await refresh(); } catch (error) { message(error); }
window.addEventListener('focus', () => { void refresh().catch(message); });
