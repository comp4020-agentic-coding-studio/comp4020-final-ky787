import './editor.css';
import { cloneDraft, draftHash, newDraft, objectBounds, objectPort, serializeDraft, type DraftDocument, type DraftDiagnostic, type DraftExpression, type DraftObject } from './model.ts';
import { BUILTIN_OUTPUTS, validateDraft } from './validation.ts';
import { createRuntime } from './runtime.ts';
import { evaluateDraft, initialDeviceValues } from './evaluate.ts';
import { DraftHistory, allIds, boundsUnion, connectDevice, connectOutput, createEntity, deleteEntities, duplicateEntities, entityBounds, renameEntity, translateEntities, uniqueId, bindingProperty, type PaletteKind } from './editor-operations.ts';
import { PuzzleRenderer } from '../slice/render.ts';
import { InputManager } from '../ui/input.ts';
import { emptyInput, createPlayer, type InputState } from '../engine/physics.ts';
import { FIXED_DT, GRAPPLE, PLAYER } from '../engine/constants.ts';
import type { Box, Vec2 } from '../engine/geometry.ts';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => { const value = document.querySelector<T>(selector); if (!value) throw new Error(`Missing editor element: ${selector}`); return value; };
const html = (value: unknown) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const option = (value: string, label = value, selected = false) => `<option value="${html(value)}"${selected ? ' selected' : ''}>${html(label)}</option>`;
const editableTarget = (target: EventTarget | null) => target instanceof HTMLElement && (!!target.closest('input,textarea,select,button') || target.isContentEditable);
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const PALETTE: { kind: PaletteKind; label: string; hint: string }[] = [
    { kind: 'static', label: 'Architecture', hint: 'Always solid' }, { kind: 'code', label: 'Code platform', hint: 'Powered / ghost' },
    { kind: 'door', label: 'Service door', hint: 'Output opens it' }, { kind: 'unstable', label: 'Unstable block', hint: 'Authored crumble' },
    { kind: 'plate', label: 'Pressure plate', hint: 'Bodies or cubes' }, { kind: 'socket', label: 'Payload socket', hint: 'Cubes only' },
    { kind: 'scanner', label: 'Player scanner', hint: 'Players only' }, { kind: 'toggle', label: 'Toggle lever', hint: 'E toggles' },
    { kind: 'terminal', label: 'Terminal', hint: 'E commits once' }, { kind: 'cube', label: 'Named cube', hint: 'Carry / pull' },
    { kind: 'relay', label: 'Relay pair', hint: 'Two paired gates' }, { kind: 'lift', label: 'Gravity lift', hint: 'Powered field' },
    { kind: 'firewall', label: 'Firewall', hint: 'Static-position beam' }, { kind: 'hazard', label: 'Reset hazard', hint: 'Reset on contact' },
    { kind: 'spawn', label: 'Entry point', hint: 'Player centre' }, { kind: 'checkpoint', label: 'Respawn marker', hint: 'Player centre' },
    { kind: 'breakpoint', label: 'Breakpoint', hint: 'Floor pedestal' }, { kind: 'exit', label: 'Exit gate', hint: 'Latched arrival' },
    { kind: 'reveal', label: 'Camera reveal', hint: 'Control / region' }, { kind: 'label', label: 'World label', hint: 'Presentation only' },
    { kind: 'wire', label: 'Wire path', hint: 'Decoration only' },
];
type Mode = 'edit' | 'preview' | 'play';
type Runtime = ReturnType<typeof createRuntime>;
interface StoredDraft { document: DraftDocument; hash: string; diagnostics: DraftDiagnostic[] }
interface Sample { time: number; player: { x: number; y: number; grounded: boolean; groundId: string | null; rope: string; ropeTarget: string | null }; cubes: Record<string, { x: number; y: number; carried: boolean }>; signals: unknown; deaths: number }
interface Recording { version: 1; draftHash: string; engineRevision: string; scenario: string; sectionOnly: boolean; samples: Sample[]; events: { time: number; kind: string; detail: unknown }[] }
interface Drag { kind: 'move' | 'resize' | 'pan' | 'marquee' | 'bend'; start: Vec2; screen: Vec2; before: DraftDocument; camera: { x: number; y: number; zoom: number }; id?: string; point?: number; additive?: boolean }

class WorkbenchEditor {
    history = new DraftHistory(newDraft());
    selection = new Set<string>();
    mode: Mode = 'edit';
    name = 'untitled.json';
    hash: string | null = null;
    saved = '';
    currentHash = '';
    token = '';
    engineRevision = 'unknown';
    dataDirectory = '';
    files: string[] = [];
    runtime: Runtime | null = null;
    renderer: PuzzleRenderer;
    input: InputManager | null = null;
    camera = { x: 750, y: 425, zoom: .6 };
    canvas: HTMLCanvasElement;
    overlay: HTMLCanvasElement;
    diagnostics: DraftDiagnostic[] = [];
    playable = false;
    runtimeError = '';
    palette: PaletteKind | null = null;
    connection = false;
    connectionSource: string | null = null;
    drag: Drag | null = null;
    pointer = { x: 0, y: 0 };
    lastPoint: Vec2 | null = null;
    heldSpace = false;
    hitboxes = false;
    range = false;
    showGrid = true;
    paused = false;
    externalConflict: StoredDraft | null = null;
    recording: Recording | null = null;
    recordedFrames = 0;
    recordingElapsed = 0;
    testAt: Vec2 | undefined;
    testSlot: 1 | 2 = 1;
    previewValues: Record<string, boolean> = {};
    forced: Record<string, boolean> = {};
    forcedMode = false;
    stateName = 'idle';
    private recoveryTimer: ReturnType<typeof setTimeout> | undefined;
    private propertyError = '';
    private accumulator = 0;
    private lastTime = performance.now();
    private hashSequence = 0;

    constructor() {
        $('#workbench').innerHTML = `<main class="wb-app">
          <header class="wb-brand"><div class="identity"><h1>BINARY NINJA</h1><span class="badge">LEVEL WORKBENCH / V1</span></div><div class="meta"><span>LOCAL AUTHORING</span><span>MOCK DRAFTS · CAMPAIGN ISOLATED</span></div></header>
          <nav class="wb-toolbar" aria-label="Editor toolbar"><button id="new">New</button><select id="files" aria-label="Open draft"><option value="">Open draft…</option></select><button id="import-room">Import room</button><button id="save" class="primary">Save</button><button id="save-copy">Save copy</button><button id="export">Export JSON</button><button id="import-json">Open JSON</button><input id="json-file" type="file" accept=".json,application/json" hidden><span class="separator"></span><button id="undo" title="Undo (Ctrl+Z)">Undo</button><button id="redo" title="Redo (Ctrl+Shift+Z)">Redo</button><span class="separator"></span><button id="edit-mode" class="active">Edit</button><button id="preview-mode">State preview</button><button id="play" class="primary">Play from spawn</button><button id="stop" hidden>Stop test</button><button id="coop">Test co-op draft</button></nav>
          <div class="wb-layout"><aside class="wb-sidebar left" aria-label="Object palette and hierarchy"><h2>Object palette</h2><div class="wb-palette">${PALETTE.map(p => `<button draggable="true" data-palette="${p.kind}" title="${p.hint}">${p.label}<span>${p.hint}</span></button>`).join('')}</div><h2>Room hierarchy</h2><input id="search" class="wb-search" aria-label="Search objects" placeholder="Search ID, type or label"><div id="hierarchy" class="wb-hierarchy"></div></aside>
          <section class="wb-stage" aria-label="World viewport"><canvas id="world" tabindex="0" aria-label="Level canvas. Click to select; drag to move. Shift adds selection. Middle drag pans."></canvas><canvas id="overlay" class="overlay" aria-hidden="true"></canvas><div class="canvas-tools"><button id="fit" title="Fit whole room (F)">Fit room</button><button id="frame" title="Frame selection">Frame selection</button><button id="test-point" title="Test from selected marker or last clicked point">Test here</button><label class="check"><input id="grid" type="checkbox" checked>Grid</label><label class="check"><input id="snap" type="checkbox" checked>Snap</label><label><span class="wb-visually-hidden">Grid size</span><input id="grid-size" type="number" value="20" min="1" max="256" aria-label="Grid size"></label><button id="connect">Connect</button><button id="hitboxes">Hitboxes</button><button id="range">Range</button></div><div id="mode-banner" class="wb-mode-banner"></div></section>
          <aside class="wb-sidebar right" aria-label="Properties and validation"><div id="conflict"></div><div id="inspector"></div><div id="logic"></div><details class="wb-diagnostics" id="diagnostics-panel"><summary id="diagnostic-summary">Validation</summary><div id="diagnostics"></div></details></aside></div>
          <footer class="wb-footer"><span id="status" role="status" aria-live="polite">Connecting to local draft service…</span><span id="document-state"></span></footer></main>`;
        this.canvas = $('#world'); this.overlay = $('#overlay'); this.renderer = new PuzzleRenderer(this.canvas);
        this.attach(); this.refresh(); requestAnimationFrame(this.animate);
        void this.bootstrap();
    }
    get document() { return this.history.document; }
    get dirty() { return serializeDraft(this.document) !== this.saved; }
    status(message: string) { $('#status').textContent = message; }
    async request<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
        const response = await fetch(`/api/workbench/${path}`, body === undefined ? undefined : { method, headers: { 'Content-Type': 'application/json', 'X-Workbench-Token': this.token }, body: JSON.stringify(body) });
        const value: unknown = await response.json();
        if (!response.ok) {
            if (response.status === 409 && value && typeof value === 'object' && 'record' in value) { this.externalConflict = value.record as StoredDraft; this.showConflict(); }
            throw new Error(value && typeof value === 'object' && 'error' in value ? String(value.error) : `Request failed (${response.status})`);
        }
        return value as T;
    }
    async bootstrap() {
        try {
            const boot = await this.request<{ token: string; draftRoot: string; engineRevision: string; files: string[] }>('bootstrap');
            this.token = boot.token; this.engineRevision = boot.engineRevision; this.dataDirectory = boot.draftRoot; this.files = boot.files; this.refreshFiles();
            const recovery = await this.request<{ document: DraftDocument; name: string; expectedHash: string | null } | null>('recovery');
            if (recovery && confirm(`Recover unsaved work for ${recovery.name}? The canonical draft file will remain unchanged until Save.`)) {
                this.history.replace(recovery.document); this.name = recovery.name; this.hash = recovery.expectedHash; this.saved = ''; this.refresh(); this.fit(); this.status('Recovered unsaved work. Review before saving.');
            } else if (boot.files.length) await this.open(boot.files.find(n => n.includes('blank')) ?? boot.files[0], false);
            else { this.saved = ''; this.fit(); this.status(`New draft. Save writes to ${this.dataDirectory}`); }
            setInterval(() => void this.checkExternal(), 4000);
        } catch (error) { this.status(`Local service unavailable: ${error instanceof Error ? error.message : String(error)}`); }
    }
    refreshFiles() { $('#files').innerHTML = option('', 'Open draft…') + this.files.map(name => option(name, name, name === this.name)).join(''); }
    async open(name: string, checkDirty = true) {
        if (checkDirty && this.dirty && !confirm('This draft has unsaved edits. Discard them and open another file? Recovery remains available until your next edit.')) { this.refreshFiles(); return; }
        try { const record = await this.request<StoredDraft>(`drafts?name=${encodeURIComponent(name)}`); this.stopTest(); this.name = name; this.history.replace(record.document); this.hash = record.hash; this.saved = serializeDraft(record.document); this.externalConflict = null; this.selection.clear(); this.mode = 'edit'; this.refresh(); this.fit(); this.status(`Opened ${name} · ${record.hash.slice(0, 12)}`); } catch (e) { this.status(String(e)); }
    }
    async save(copy = false) {
        if (this.mode === 'play') { this.status('Stop the physics test before saving authored data.'); return; }
        let name = this.name;
        if (copy || !this.hash) { const entered = prompt('Draft filename inside levels/drafts (ends in .json)', copy ? this.name.replace(/\.json$/, '-copy.json') : name); if (!entered) return; name = entered.endsWith('.json') ? entered : `${entered}.json`; }
        try {
            const submitted = cloneDraft(this.document), serialized = serializeDraft(submitted);
            const record = await this.request<StoredDraft>(`drafts?name=${encodeURIComponent(name)}`, { document: submitted, expectedHash: name === this.name && !copy ? this.hash : null }, 'PUT');
            this.name = name; this.hash = record.hash; this.saved = serialized; this.externalConflict = null;
            if (!this.files.includes(name)) { this.files.push(name); this.files.sort(); } this.refreshFiles(); this.showConflict(); this.updateToolbar();
            this.status(`Saved ${name} · ${record.hash.slice(0, 12)}${this.diagnostics.some(d => d.severity === 'error') ? ' · incomplete draft, playtest blocked' : ''}`);
        } catch (e) { this.status(`Save failed: ${e instanceof Error ? e.message : String(e)}`); }
    }
    async checkExternal() {
        if (!this.hash || this.mode === 'play') return;
        try { const record = await this.request<StoredDraft>(`drafts?name=${encodeURIComponent(this.name)}`); if (record.hash !== this.hash) { this.externalConflict = record; this.showConflict(); } } catch { /* A failed poll never replaces the local document. */ }
    }
    showConflict() {
        const node = $('#conflict'); node.innerHTML = this.externalConflict ? `<div class="wb-conflict"><strong>File changed outside the editor</strong><p>Your current edits are preserved. Saving with the old hash is blocked.</p><button id="reload-conflict">Reload file</button><button id="copy-conflict">Save my copy</button></div>` : '';
        node.querySelector('#reload-conflict')?.addEventListener('click', () => void this.open(this.name));
        node.querySelector('#copy-conflict')?.addEventListener('click', () => void this.save(true));
    }
    changed() {
        this.propertyError = ''; this.refresh();
        clearTimeout(this.recoveryTimer); this.recoveryTimer = setTimeout(() => { if (this.token) void this.request('recovery', { document: this.document, name: this.name, expectedHash: this.hash }, 'PUT').catch(e => this.status(`Recovery failed: ${String(e)}`)); }, 650);
    }
    mutate(edit: (draft: DraftDocument) => void) { if (this.mode !== 'edit') return; try { const next = cloneDraft(this.document); edit(next); const validation = validateDraft(next); if (!validation.structural) throw new Error(validation.diagnostics.filter(d => d.severity === 'error').map(d => d.message).join(' ')); if (this.history.commit(next)) this.changed(); } catch (e) { this.propertyError = e instanceof Error ? e.message : String(e); this.status(this.propertyError); this.renderInspector(); } }
    refresh() {
        const result = validateDraft(this.document); this.diagnostics = result.diagnostics; this.playable = result.playable;
        if (this.mode !== 'play') this.rebuildRuntime();
        const sequence = ++this.hashSequence; void draftHash(this.document).then(hash => { if (sequence === this.hashSequence) { this.currentHash = hash; this.updateToolbar(); } });
        this.renderHierarchy(); this.renderInspector(); this.renderLogic(); this.renderDiagnostics(); this.showConflict(); this.updateToolbar();
    }
    rebuildRuntime() {
        this.runtimeError = ''; this.runtime = null;
        if (!this.playable) return;
        try { this.runtime = createRuntime(cloneDraft(this.document), this.testSlot); this.renderer.room(this.runtime.world); if (this.mode === 'preview') this.runtime.preview(this.previewValues, this.forcedMode ? this.forced : undefined); }
        catch (error) { this.runtimeError = error instanceof Error ? error.message : String(error); this.status(`Renderer/runtime: ${this.runtimeError}`); }
    }
    updateToolbar() {
        ($<HTMLButtonElement>('#undo')).disabled = !this.history.canUndo || this.mode !== 'edit'; ($<HTMLButtonElement>('#redo')).disabled = !this.history.canRedo || this.mode !== 'edit';
        $('#edit-mode').classList.toggle('active', this.mode === 'edit'); $('#preview-mode').classList.toggle('active', this.mode === 'preview');
        $('#play').hidden = this.mode === 'play'; $('#stop').hidden = this.mode !== 'play';
        $<HTMLButtonElement>('#play').disabled = !this.playable; $<HTMLButtonElement>('#coop').disabled = !this.playable || this.mode === 'play';
        $('#document-state').textContent = `${this.dirty ? 'UNSAVED · ' : ''}${this.name} · ${this.currentHash.slice(0, 8) || 'hashing'} · ${Math.round(this.camera.zoom * 100)}%`;
        const recorded = this.recording ? ` Measured path ${this.recording.samples.length} samples${this.recording.draftHash !== this.currentHash ? ' · STALE after document edits' : ''}.` : '';
        $('#mode-banner').innerHTML = this.mode === 'play' ? `<strong>PHYSICS PREVIEW${this.paused ? ' / PAUSED' : ''}</strong> · Local player ${this.testSlot}; not a two-player validation. A/D move · W/Space jump · E use/carry · hold pointer to grapple.${this.testAt ? ' Section-only start.' : ''}` : this.mode === 'preview' ? `<strong>${this.forcedMode ? 'FORCED OUTPUT DIAGNOSTIC' : 'EVALUATED INPUT STATE'}</strong> · ${this.forcedMode ? 'Arbitrary geometry inspection; this is not a reachable state or a solved puzzle.' : 'Saved input values use the actual controller. Physics is stopped.'}${recorded}` : `<strong>${this.palette ? `PLACE ${PALETTE.find(p => p.kind === this.palette)?.label.toUpperCase()}` : this.connection ? this.connectionSource ? `CONNECT ${html(this.connectionSource)} → select destination` : 'CONNECT / select a source device' : 'EDIT'}</strong> · ${this.runtimeError ? html(this.runtimeError) : !this.playable ? 'Incomplete draft: outline preview. Resolve blocking diagnostics for game rendering and play.' : 'Click/drag objects · Shift multi-select · middle drag or Space+drag pans · wheel zooms · F fits.'}${recorded}`;
        for (const button of document.querySelectorAll<HTMLButtonElement>('[data-palette]')) button.classList.toggle('active', button.dataset.palette === this.palette);
        $('#connect').classList.toggle('active', this.connection); $('#hitboxes').classList.toggle('active', this.hitboxes); $('#range').classList.toggle('active', this.range);
        $<HTMLInputElement>('#snap').checked = this.document.editor.snap; $<HTMLInputElement>('#grid-size').value = String(this.document.editor.grid);
    }
    renderHierarchy() {
        const search = $<HTMLInputElement>('#search').value.toLowerCase();
        const rows = [...this.document.geometry.objects.map(o => ({ id: o.id, label: `${o.id} · ${o.type === 'device' || o.type === 'platform' ? o.kind : o.type}`, search: `${o.id} ${o.type} ${o.label ?? ''}` })), ...this.document.presentation.labels.map(l => ({ id: l.id, label: `${l.id} · label`, search: `${l.id} ${l.text}` })), ...this.document.presentation.cameraReveals.map(r => ({ id: r.id, label: `${r.id} · camera`, search: `${r.id} camera ${r.source}` })), ...this.document.presentation.wires.map(w => ({ id: w.id, label: `${w.id} · wire`, search: `${w.id} wire` }))];
        $('#hierarchy').innerHTML = rows.filter(r => r.search.toLowerCase().includes(search)).map(r => `<div class="wb-object ${this.selection.has(r.id) ? 'selected' : ''}" data-id="${html(r.id)}"><button class="select-object" title="${html(r.label)}">${html(r.label)}</button><button class="mini ${this.document.editor.hidden.includes(r.id) ? 'active' : ''}" data-hide aria-label="${this.document.editor.hidden.includes(r.id) ? 'Show' : 'Hide'} ${html(r.id)}">${this.document.editor.hidden.includes(r.id) ? 'Off' : 'Eye'}</button><button class="mini ${this.document.editor.locked.includes(r.id) ? 'active' : ''}" data-lock aria-label="${this.document.editor.locked.includes(r.id) ? 'Unlock' : 'Lock'} ${html(r.id)}">${this.document.editor.locked.includes(r.id) ? 'Lock' : 'Free'}</button></div>`).join('');
        for (const row of document.querySelectorAll<HTMLElement>('.wb-object')) {
            const id = row.dataset.id!;
            row.querySelector('.select-object')!.addEventListener('click', event => { if (this.mode === 'play') return; if (!(event as MouseEvent).shiftKey) this.selection.clear(); this.selection.add(id); this.renderHierarchy(); this.renderInspector(); this.renderLogic(); });
            row.querySelector('[data-hide]')!.addEventListener('click', () => this.mutate(d => { d.editor.hidden = d.editor.hidden.includes(id) ? d.editor.hidden.filter(x => x !== id) : [...d.editor.hidden, id]; }));
            row.querySelector('[data-lock]')!.addEventListener('click', () => this.mutate(d => { d.editor.locked = d.editor.locked.includes(id) ? d.editor.locked.filter(x => x !== id) : [...d.editor.locked, id]; }));
        }
    }
    renderInspector() {
        const panel = $('#inspector');
        if (this.mode === 'preview') { this.renderPreview(panel); return; }
        if (this.mode === 'play') { panel.innerHTML = `<h2>Real engine physics test</h2><p class="wb-help">The authored document is frozen. Simulation never writes cube or player positions into the level file.</p><div class="wb-actions"><button id="restart">Restart test</button><button id="pause">${this.paused ? 'Resume' : 'Pause'}</button><button id="step">Frame step</button></div><h3>Live observation</h3><pre id="observation" class="wb-help"></pre><div class="wb-notice">Single local player. Test co-op draft opens the actual two-player authority session.</div>`; $('#restart').onclick = () => void this.startTest({ slot: this.testSlot, at: this.testAt }).catch(() => {}); $('#pause').onclick = () => { this.paused = !this.paused; this.input?.releaseAll(); this.renderInspector(); this.updateToolbar(); }; $('#step').onclick = () => { this.paused = true; this.advance(emptyInput()); this.updateToolbar(); }; return; }
        const setters = new Map<string, (value: string | number | boolean) => void>(); let index = 0;
        const field = (label: string, value: string | number | boolean, setter: (v: string | number | boolean) => void, options?: { values?: string[]; min?: number; step?: number; wide?: boolean }) => {
            const id = `property-${index++}`; setters.set(id, setter);
            return `<label class="${options?.wide ? 'wide ' : ''}${typeof value === 'boolean' ? 'check' : ''}">${typeof value === 'boolean' ? `<input id="${id}" type="checkbox" ${value ? 'checked' : ''}>${html(label)}` : `${html(label)}${options?.values ? `<select id="${id}">${options.values.map(v => option(v, v, v === String(value))).join('')}</select>` : `<input id="${id}" type="${typeof value === 'number' ? 'number' : 'text'}" value="${html(value)}" ${typeof value === 'number' ? `step="${options?.step ?? 'any'}"${options?.min !== undefined ? ` min="${options.min}"` : ''}` : ''}>`}`}</label>`;
        };
        const ids = [...this.selection], object = this.document.geometry.objects.find(o => o.id === ids[0]);
        const patch = (values: Partial<DraftObject>) => this.mutate(d => { const target = d.geometry.objects.find(o => o.id === ids[0]); if (target) Object.assign(target, values); });
        const base = object ?? this.document.presentation.labels.find(l => l.id === ids[0]);
        let body = '';
        if (!ids.length) {
            body = `<h2>Draft properties</h2><div class="wb-fields">${field('Title', this.document.title, v => this.mutate(d => { d.title = String(v); }), { wide: true })}${field('Draft ID', this.document.id, v => this.mutate(d => { if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(String(v))) throw new Error('Draft ID must start with a letter and contain only letters, digits, _ or -.'); d.id = String(v); }), { wide: true })}${field('Width', this.document.geometry.width, v => this.mutate(d => { d.geometry.width = Number(v); }), { min: 100 })}${field('Height', this.document.geometry.height, v => this.mutate(d => { d.geometry.height = Number(v); }), { min: 100 })}${field('Instruction', this.document.instruction, v => this.mutate(d => { d.instruction = String(v); }), { wide: true })}</div><p class="wb-help">Choose a palette object, then click or drag in the world. Device coordinates use floor contact. Players and cubes use their centres. Rectangles use top-left coordinates.</p>`;
        } else if (ids.length > 1) body = `<h2>${ids.length} objects selected</h2><p class="wb-help">Drag to move the group. Duplication creates fresh IDs and remaps connections inside the copied group.</p>`;
        else {
            body = `<h2>${html(object?.type ?? 'Presentation')} properties</h2><div class="wb-selected-hint">${html(ids[0])}</div><div class="wb-fields">${field('Object ID', ids[0], v => { this.mutate(d => renameEntity(d, ids[0], String(v))); if (!this.propertyError) { this.selection = new Set([String(v)]); this.renderHierarchy(); this.renderInspector(); this.renderLogic(); } }, { wide: true })}`;
            if (base) { body += field('X', base.x, v => this.mutate(d => { const b = d.geometry.objects.find(o => o.id === ids[0]) ?? d.presentation.labels.find(l => l.id === ids[0]); if (b) b.x = Number(v); })); body += field('Y', base.y, v => this.mutate(d => { const b = d.geometry.objects.find(o => o.id === ids[0]) ?? d.presentation.labels.find(l => l.id === ids[0]); if (b) b.y = Number(v); })); }
            if (object) {
                body += field('Label', object.label ?? '', v => patch({ label: String(v) }), { wide: true });
                if ('w' in object) { body += field('Width', object.w, v => patch({ w: Number(v) }), { min: 1 }); body += field('Height', object.h, v => patch({ h: Number(v) }), { min: 1 }); }
                if (object.type === 'platform') {
                    body += field('Platform kind', object.kind, v => patch({ kind: String(v) as 'static' | 'code' | 'unstable' }), { values: ['static', 'code', 'unstable'], wide: true });
                    body += field('Accept grapples', object.hookable ?? object.kind !== 'static', v => patch({ hookable: Boolean(v) }), { wide: true });
                    body += field('Anchor hint', object.anchor ?? false, v => patch({ anchor: Boolean(v) }), { wide: true });
                    body += field('Blocks cube interaction', object.blocksCubeInteraction ?? false, v => patch({ blocksCubeInteraction: Boolean(v) }), { wide: true });
                    if (object.kind === 'unstable') { body += field('Step fuse (s)', object.crumbleDelay ?? .6, v => patch({ crumbleDelay: Number(v) }), { min: .01 }); body += field('Hook fuse (s)', object.hookCrumbleDelay ?? .6, v => patch({ hookCrumbleDelay: Number(v) }), { min: .01 }); body += field('Respawn (s)', object.respawnDelay ?? 3, v => patch({ respawnDelay: Number(v) }), { min: .01 }); }
                }
                if (object.type === 'cube') body += field('Cube mark', object.mark, v => patch({ mark: String(v) }), { wide: true });
                if (object.type === 'device') {
                    body += field('Device semantics', object.kind, v => patch({ kind: String(v) as 'plate' | 'socket' | 'scanner' | 'toggle' | 'terminal' }), { values: ['plate', 'socket', 'scanner', 'toggle', 'terminal'], wide: true });
                    if (object.kind === 'toggle' || object.kind === 'terminal') body += field('Initial value', object.initial ?? false, v => patch({ initial: Boolean(v) }), { wide: true });
                    body += field('Checkpoint', object.checkpoint ?? '', v => this.mutate(d => { const o = d.geometry.objects.find(o => o.id === ids[0]); if (o?.type === 'device') { if (v === 'relay' || v === 'upper') o.checkpoint = v; else delete o.checkpoint; } }), { values: ['', 'relay', 'upper'], wide: true });
                }
                if (object.type === 'spawn' || object.type === 'checkpoint') body += field('Player slot', object.slot, v => patch({ slot: Number(v) === 2 ? 2 : 1 }), { values: ['1', '2'], wide: true });
                if (object.type === 'checkpoint' || object.type === 'breakpoint') body += field('Checkpoint', object.checkpoint, v => patch({ checkpoint: v === 'upper' ? 'upper' : 'relay' }), { values: ['relay', 'upper'], wide: true });
                if (object.type === 'breakpoint') body += field('Activation control', object.activationControl ?? '', v => this.mutate(d => { const o = d.geometry.objects.find(o => o.id === ids[0]); if (o?.type === 'breakpoint') { if (v) o.activationControl = String(v); else delete o.activationControl; } }), { values: ['', ...this.document.geometry.objects.filter(o => o.type === 'device').map(o => o.id)], wide: true });
                if (object.type === 'relay') { body += field('Pair ID', object.pair, v => patch({ pair: String(v) }), { wide: true }); body += field('Exit direction', object.exitSide, v => patch({ exitSide: Number(v) === -1 ? -1 : 1 }), { values: ['-1', '1'], wide: true }); }
                if (object.type === 'firewall') { body += field('Orientation', object.orientation, v => patch({ orientation: v === 'horizontal' ? 'horizontal' : 'vertical' }), { values: ['horizontal', 'vertical'], wide: true }); body += field('Length', object.length, v => patch({ length: Number(v) }), { min: 1 }); body += field('Thickness', object.thickness, v => patch({ thickness: Number(v) }), { min: 1 }); }
                if (object.type === 'exit') { body += field('Latch unlock', object.latch, v => patch({ latch: Boolean(v) }), { wide: true }); body += field('Physical arrivals', object.arrivals, v => patch({ arrivals: Number(v) === 2 ? 2 : 1 }), { values: ['1', '2'], wide: true }); }
            }
            const label = this.document.presentation.labels.find(l => l.id === ids[0]); if (label) body += field('Text', label.text, v => this.mutate(d => { d.presentation.labels.find(l => l.id === ids[0])!.text = String(v); }), { wide: true });
            const reveal = this.document.presentation.cameraReveals.find(r => r.id === ids[0]);
            if (reveal) {
                const modify = (update: (r: NonNullable<typeof reveal>) => void) => this.mutate(d => { const r = d.presentation.cameraReveals.find(r => r.id === ids[0]); if (r) update(r); });
                body += field('Source device', reveal.source, v => modify(r => { r.source = String(v); }), { values: ['', ...this.document.geometry.objects.filter(o => o.type === 'device').map(o => o.id)], wide: true });
                body += field('Target platform IDs (comma separated)', reveal.platformIds?.join(', ') ?? '', v => modify(r => { r.platformIds = String(v).split(',').map(v => v.trim()).filter(Boolean); }), { wide: true });
                for (const key of ['x', 'y', 'w', 'h'] as const) body += field(`Region ${key}`, reveal.bounds?.[key] ?? (key === 'w' ? 400 : key === 'h' ? 260 : 0), v => modify(r => { r.bounds ??= { x: 0, y: 0, w: 400, h: 260 }; r.bounds[key] = Number(v); }), { ...(key === 'w' || key === 'h' ? { min: 1 } : {}) });
                body += field('Padding', reveal.padding ?? 64, v => modify(r => { r.padding = Number(v); }), { min: 0 }); body += field('Duration (s)', reveal.duration ?? 2.5, v => modify(r => { r.duration = Number(v); }), { min: 0 });
            }
            const wire = this.document.presentation.wires.find(w => w.id === ids[0]);
            if (wire) {
                body += field('Functional binding (optional)', wire.binding ?? '', v => this.mutate(d => { const w = d.presentation.wires.find(w => w.id === ids[0])!; if (v) w.binding = String(v); else delete w.binding; }), { values: ['', ...this.document.bindings.map(b => b.id)], wide: true });
                wire.points.forEach((p, i) => { body += field(`Bend ${i + 1} X`, p.x, v => this.mutate(d => { d.presentation.wires.find(w => w.id === ids[0])!.points[i].x = Number(v); })); body += field(`Bend ${i + 1} Y`, p.y, v => this.mutate(d => { d.presentation.wires.find(w => w.id === ids[0])!.points[i].y = Number(v); })); });
                body += '</div><div class="wb-actions"><button id="add-bend">Add bend</button><button id="remove-bend">Remove last bend</button></div><div class="wb-fields">';
            }
            body += '</div>';
            if (object) body += `<p class="wb-help">Coordinates: ${object.type === 'spawn' || object.type === 'checkpoint' || object.type === 'cube' ? 'body centre' : object.type === 'device' || object.type === 'breakpoint' ? 'centre X / floor contact Y' : 'top-left rectangle'}. ${object.type === 'device' ? 'Plate: bodies or resting cubes. Socket: cubes. Scanner: players. Toggle: repeatable. Terminal: latched.' : ''}</p>`;
        }
        if (ids.length) body += `<div class="wb-actions"><button id="duplicate">Duplicate</button><button id="delete" class="danger">Delete</button><button id="test-here"${!this.playable ? ' disabled' : ''}>Test from here</button></div>`;
        body += `<div class="wb-section"><label>Physics player<select id="test-slot">${option('1', 'Player 1', this.testSlot === 1)}${option('2', 'Player 2', this.testSlot === 2)}</select></label>${this.recording ? `<p class="wb-help wb-recording">Measured trajectory · ${this.recording.samples.length} samples${this.recording.draftHash !== this.currentHash ? ' · stale after edits' : ''}${this.recording.sectionOnly ? ' · section-only' : ''}</p><button id="export-recording">Export recording</button><button id="clear-recording">Clear path</button>` : ''}</div>`;
        if (this.propertyError) body += `<p class="wb-field-error">${html(this.propertyError)}</p>`;
        panel.innerHTML = body;
        for (const [id, setter] of setters) $<HTMLInputElement | HTMLSelectElement>(`#${id}`).addEventListener('change', event => {
            const input = event.target as HTMLInputElement; input.setCustomValidity(''); if (input.type === 'number' && (input.value === '' || !Number.isFinite(Number(input.value)) || !input.checkValidity())) { input.setCustomValidity('Enter a valid number within the displayed bounds.'); input.reportValidity(); return; }
            input.setCustomValidity(''); setter(input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value);
        });
        panel.querySelector('#duplicate')?.addEventListener('click', () => this.duplicate()); panel.querySelector('#delete')?.addEventListener('click', () => this.deleteSelection()); panel.querySelector('#test-here')?.addEventListener('click', () => void this.testHere());
        panel.querySelector('#export-recording')?.addEventListener('click', () => this.download(`${this.name.replace('.json', '')}-recording.json`, JSON.stringify(this.recording, null, 2))); panel.querySelector('#clear-recording')?.addEventListener('click', () => { this.recording = null; this.renderInspector(); this.updateToolbar(); });
        panel.querySelector('#add-bend')?.addEventListener('click', () => this.mutate(d => { const w = d.presentation.wires.find(w => w.id === ids[0]); if (w) w.points.splice(w.points.length - 1, 0, { x: (w.points.at(-1)!.x + w.points.at(-2)!.x) / 2, y: (w.points.at(-1)!.y + w.points.at(-2)!.y) / 2 }); }));
        panel.querySelector('#remove-bend')?.addEventListener('click', () => this.mutate(d => { const w = d.presentation.wires.find(w => w.id === ids[0]); if (w && w.points.length > 2) w.points.splice(w.points.length - 2, 1); }));
        panel.querySelector('#test-slot')?.addEventListener('change', event => { this.testSlot = (event.target as HTMLSelectElement).value === '2' ? 2 : 1; this.rebuildRuntime(); });
    }
    outputIds() { return this.document.controller.kind === 'declarative' ? Object.keys(this.document.controller.outputs) : BUILTIN_OUTPUTS[this.document.controller.id]; }
    renderLogic() {
        const root = $('#logic'); root.innerHTML = '';
        if (this.mode !== 'edit') return;
        const title = document.createElement('h2'); title.textContent = this.document.controller.kind === 'builtin' ? 'Trusted controller' : 'Functional logic'; root.append(title);
        if (this.document.controller.kind === 'builtin') {
            const note = document.createElement('p'); note.className = 'wb-help'; note.textContent = `${this.document.controller.id} · v${this.document.controller.version}. Inputs and outputs are retained; internals remain code-owned. Geometry and bindings are editable. Imported copies carry no binary proof claims.`; root.append(note);
        } else {
            const ports = this.document.geometry.objects.filter(o => o.type === 'device').map(objectPort), outputIds = Object.keys(this.document.controller.outputs);
            const expressionEditor = (expression: DraftExpression, replace: (next: DraftExpression) => void): HTMLElement => {
                const container = document.createElement('div'); container.className = 'wb-expression';
                const row = document.createElement('div'); row.className = 'row'; container.append(row);
                const op = document.createElement('select'); op.setAttribute('aria-label', 'Expression operator'); op.innerHTML = ['const', 'ref', 'and', 'or', 'not'].map(v => option(v, v.toUpperCase(), v === expression.op)).join(''); row.append(op);
                op.onchange = () => { const type = op.value; replace(type === 'const' ? { op: 'const', value: false } : type === 'ref' ? { op: 'ref', id: ports[0] ?? '' } : type === 'not' ? { op: 'not', arg: { op: 'const', value: false } } : { op: type === 'and' ? 'and' : 'or', args: [{ op: 'const', value: false }, { op: 'const', value: false }] }); };
                if (expression.op === 'const') { const select = document.createElement('select'); select.setAttribute('aria-label', 'Boolean constant'); select.innerHTML = option('false', 'FALSE', !expression.value) + option('true', 'TRUE', expression.value); select.onchange = () => replace({ op: 'const', value: select.value === 'true' }); row.append(select); }
                else if (expression.op === 'ref') { const select = document.createElement('select'); select.setAttribute('aria-label', 'Device port or output reference'); const refs = [...new Set([...ports, ...outputIds, expression.id])]; select.innerHTML = refs.map(v => option(v, v, v === expression.id)).join(''); select.onchange = () => replace({ op: 'ref', id: select.value }); row.append(select); }
                else if (expression.op === 'not') container.append(expressionEditor(expression.arg, arg => replace({ op: 'not', arg })));
                else {
                    expression.args.forEach((arg, i) => { const child = expressionEditor(arg, value => replace({ op: expression.op, args: expression.args.map((e, j) => i === j ? value : e) })); const remove = document.createElement('button'); remove.textContent = '−'; remove.title = 'Remove operand'; remove.setAttribute('aria-label', 'Remove operand'); remove.disabled = expression.args.length <= 1; remove.onclick = () => replace({ op: expression.op, args: expression.args.filter((_, j) => i !== j) }); child.querySelector('.row')!.append(remove); container.append(child); });
                    const add = document.createElement('button'); add.textContent = '+ input'; add.onclick = () => replace({ op: expression.op, args: [...expression.args, { op: 'const', value: false }] }); container.append(add);
                }
                return container;
            };
            for (const [id, expression] of Object.entries(this.document.controller.outputs)) {
                const block = document.createElement('section'); block.className = 'wb-output'; const header = document.createElement('header'); header.textContent = id; const remove = document.createElement('button'); remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove output ${id}`); remove.onclick = () => { const targets = this.document.bindings.filter(b => b.output === id).map(b => b.target); if (targets.length && !confirm(`Remove output ${id}? These targets will have unresolved bindings and playtesting will be blocked: ${targets.join(', ')}`)) return; this.mutate(d => { if (d.controller.kind === 'declarative') delete d.controller.outputs[id]; }); }; header.append(remove); block.append(header, expressionEditor(expression, next => this.mutate(d => { if (d.controller.kind === 'declarative') d.controller.outputs[id] = next; }))); root.append(block);
            }
            const form = document.createElement('form'); form.className = 'wb-logic-form wb-actions'; form.innerHTML = '<input aria-label="New output ID" placeholder="newOutput"><button>Add output</button>'; form.onsubmit = event => { event.preventDefault(); const id = form.querySelector('input')!.value.trim(); if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id) || allIds(this.document).has(id)) { this.status('Choose a unique output ID, starting with a letter.'); return; } this.mutate(d => { if (d.controller.kind === 'declarative') d.controller.outputs[id] = { op: 'const', value: false }; }); }; root.append(form);
        }
        const object = this.document.geometry.objects.find(o => this.selection.has(o.id));
        if (object && bindingProperty(object)) {
            const heading = document.createElement('h3'); heading.textContent = `Destination: ${object.id}`; root.append(heading);
            const help = document.createElement('p'); help.className = 'wb-help'; help.textContent = `Bind output to ${bindingProperty(object)}. Inversion applies once, to this destination; its wire follows the same resolved power.`; root.append(help);
            for (const b of this.document.bindings.filter(b => b.target === object.id)) {
                const row = document.createElement('div'); row.className = 'wb-binding'; row.innerHTML = `<span>${html(b.output)} → ${html(b.property)}${b.invert ? ' [NOT]' : ''}</span><button aria-label="Remove binding ${html(b.id)}">Delete</button>`; row.querySelector('button')!.onclick = () => { if (!confirm(`Remove ${b.id}? ${b.target}.${b.property} will lose its functional connection. Its decorative connection will also be removed.`)) return; this.mutate(d => { d.bindings = d.bindings.filter(x => x.id !== b.id); d.presentation.wires = d.presentation.wires.filter(w => w.binding !== b.id); }); }; root.append(row);
            }
            const box = document.createElement('div'); box.className = 'wb-fields'; const existing = this.document.bindings.find(b => b.target === object.id);
            box.innerHTML = `<label class="wide">Enabled output<select id="binding-output">${this.outputIds().map(id => option(id, id, id === existing?.output)).join('')}</select></label><label class="check wide"><input type="checkbox" id="binding-invert" ${existing?.invert ? 'checked' : ''}>Invert destination</label><button class="wide" id="bind">Apply binding + visible wire</button>`; root.append(box);
            box.querySelector('#bind')!.addEventListener('click', () => { const output = (box.querySelector('#binding-output') as HTMLSelectElement).value, invert = (box.querySelector('#binding-invert') as HTMLInputElement).checked; if (!output) return; this.mutate(d => connectOutput(d, output, object.id, invert)); });
        }
        if (this.document.imported?.warnings.length) { const p = document.createElement('p'); p.className = 'wb-notice'; p.textContent = this.document.imported.warnings.join(' '); root.append(p); }
    }
    renderPreview(panel: HTMLElement) {
        const values = { ...initialDeviceValues(this.document), ...this.previewValues };
        let outputs: Record<string, boolean> = {};
        try { if (this.document.controller.kind === 'declarative') outputs = evaluateDraft(this.document, values, this.forcedMode ? this.forced : undefined); else if (this.runtime) outputs = { ...this.runtime.authority.outputs }; } catch { /* Validation shows the exact blocked reference. */ }
        panel.innerHTML = `<h2>State preview</h2><p class="wb-help">Saved input configurations evaluate real controller logic. Forced outputs are separate geometry diagnostics and do not prove reachability.</p><label>Saved input state<select id="preview-state">${Object.keys(this.document.previewStates).map(id => option(id, id, id === this.stateName)).join('')}</select></label><div class="wb-state-inputs">${Object.entries(values).map(([id, on], i) => `<label class="check"><input data-preview-input="${html(id)}" type="checkbox" ${on ? 'checked' : ''}>${html(id)}</label>`).join('')}</div><button id="save-state">Save configuration as…</button><div class="wb-section"><label class="check"><input id="forced-mode" type="checkbox" ${this.forcedMode ? 'checked' : ''}>Forced-output diagnostic</label>${this.forcedMode ? `<div class="wb-notice">Arbitrary outputs. No solved-state claim; no progress is awarded.</div><div class="wb-state-inputs">${this.outputIds().map(id => `<label class="check"><input data-forced="${html(id)}" type="checkbox" ${this.forced[id] ? 'checked' : ''}>${html(id)}</label>`).join('')}</div>` : ''}</div><h3>Resolved outputs</h3>${Object.entries(outputs).map(([id, on]) => `<div class="wb-preview-output">${html(id)} = ${on ? 'TRUE' : 'false'}</div>`).join('')}`;
        panel.querySelector('#preview-state')?.addEventListener('change', event => this.preview((event.target as HTMLSelectElement).value));
        for (const checkbox of panel.querySelectorAll<HTMLInputElement>('[data-preview-input]')) checkbox.onchange = () => { this.previewValues[checkbox.dataset.previewInput!] = checkbox.checked; this.rebuildRuntime(); this.renderPreview(panel); };
        for (const checkbox of panel.querySelectorAll<HTMLInputElement>('[data-forced]')) checkbox.onchange = () => { this.forced[checkbox.dataset.forced!] = checkbox.checked; this.rebuildRuntime(); this.renderPreview(panel); };
        panel.querySelector('#forced-mode')!.addEventListener('change', event => { this.forcedMode = (event.target as HTMLInputElement).checked; this.forced = Object.fromEntries(this.outputIds().map(id => [id, false])); this.rebuildRuntime(); this.renderPreview(panel); this.updateToolbar(); });
        panel.querySelector('#save-state')!.addEventListener('click', () => { const name = prompt('Saved input configuration name', 'state'); if (!name) return; if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name) || ['__proto__', 'constructor', 'prototype'].includes(name)) { this.status('Choose a state name starting with a letter, using letters, digits, _ or -.'); return; } this.history.change(d => { d.previewStates[name] = { ...this.previewValues }; }); this.stateName = name; this.changed(); });
    }
    renderDiagnostics() {
        const errors = this.diagnostics.filter(d => d.severity === 'error').length, warnings = this.diagnostics.filter(d => d.severity === 'warning').length;
        $('#diagnostic-summary').textContent = `Validation · ${errors} errors · ${warnings} warnings`;
        $('#diagnostics').innerHTML = this.diagnostics.length ? this.diagnostics.map((d, i) => `<button data-diagnostic="${i}" class="${d.severity}"><code>${html(d.code)}${d.objectId ? ` · ${html(d.objectId)}` : ''}</code><br>${html(d.message)}</button>`).join('') : '<p class="wb-help">No structural or gameplay configuration errors. Reachability and softlocks are not statically tested.</p>';
        for (const button of document.querySelectorAll<HTMLButtonElement>('[data-diagnostic]')) button.onclick = () => { const id = this.diagnostics[Number(button.dataset.diagnostic)].objectId; if (id) { this.selection = new Set([id]); this.frameSelection(); this.renderHierarchy(); this.renderInspector(); this.renderLogic(); } };
    }
    attach() {
        $('#new').onclick = () => { if (this.dirty && !confirm('Discard unsaved edits and create a new draft?')) return; this.stopTest(); this.history.replace(newDraft()); this.name = 'untitled.json'; this.hash = null; this.saved = ''; this.selection.clear(); this.mode = 'edit'; this.changed(); this.fit(); };
        $<HTMLSelectElement>('#files').onchange = event => { const name = (event.target as HTMLSelectElement).value; if (name) void this.open(name); };
        $('#save').onclick = () => void this.save(); $('#save-copy').onclick = () => void this.save(true);
        $('#export').onclick = () => this.download(this.name, serializeDraft(this.document));
        $('#import-json').onclick = () => $<HTMLInputElement>('#json-file').click();
        $<HTMLInputElement>('#json-file').onchange = async event => { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; try { if (file.size > 1_000_000) throw new Error('Draft exceeds 1 MB limit.'); const value: unknown = JSON.parse(await file.text()), result = validateDraft(value); if (!result.structural || !result.document) throw new Error(result.diagnostics.map(d => `${d.code}: ${d.message}`).join('\n')); if (this.dirty && !confirm('Discard unsaved edits and open this JSON draft?')) return; this.loadDocument(result.document); this.name = file.name; this.status('Portable JSON opened. Save writes a canonical project draft.'); } catch (e) { this.status(`JSON rejected: ${String(e)}`); } (event.target as HTMLInputElement).value = ''; };
        $('#import-room').onclick = () => this.importDialog(); $('#undo').onclick = () => { if (this.history.undo()) this.changed(); }; $('#redo').onclick = () => { if (this.history.redo()) this.changed(); };
        $('#edit-mode').onclick = () => { this.stopTest(); this.mode = 'edit'; this.refresh(); }; $('#preview-mode').onclick = () => this.preview(this.stateName);
        $('#play').onclick = () => void this.startTest({ slot: this.testSlot }).catch(() => {}); $('#stop').onclick = () => this.stopTest(); $('#coop').onclick = () => void this.startCoop();
        $('#fit').onclick = () => this.fit(); $('#frame').onclick = () => this.frameSelection(); $('#test-point').onclick = () => void this.testHere();
        $<HTMLInputElement>('#grid').onchange = event => { this.showGrid = (event.target as HTMLInputElement).checked; };
        $<HTMLInputElement>('#snap').onchange = event => this.mutate(d => { d.editor.snap = (event.target as HTMLInputElement).checked; });
        $<HTMLInputElement>('#grid-size').onchange = event => { const n = Number((event.target as HTMLInputElement).value); if (Number.isFinite(n) && n >= 1 && n <= 256) this.mutate(d => { d.editor.grid = n; }); };
        $('#connect').onclick = () => { this.connection = !this.connection; this.connectionSource = null; this.palette = null; this.updateToolbar(); };
        $('#hitboxes').onclick = () => { this.hitboxes = !this.hitboxes; this.updateToolbar(); }; $('#range').onclick = () => { this.range = !this.range; this.updateToolbar(); };
        $('#search').oninput = () => this.renderHierarchy();
        for (const button of document.querySelectorAll<HTMLButtonElement>('[data-palette]')) { button.onclick = () => { if (this.mode !== 'edit') return; this.palette = button.dataset.palette as PaletteKind; this.connection = false; this.selection.clear(); this.updateToolbar(); }; button.ondragstart = event => { if (event.dataTransfer) event.dataTransfer.setData('text/workbench-palette', button.dataset.palette!); }; }
        this.canvas.addEventListener('dragover', event => { if (this.mode === 'edit') event.preventDefault(); });
        this.canvas.addEventListener('drop', event => { if (this.mode !== 'edit') return; event.preventDefault(); const kind = event.dataTransfer?.getData('text/workbench-palette'); if (!PALETTE.some(p => p.kind === kind)) return; const at = this.snapPoint(this.worldPoint(event)); this.mutate(d => { const id = createEntity(d, kind as PaletteKind, at); this.selection = new Set([id]); }); this.palette = null; });
        this.canvas.addEventListener('pointerdown', this.pointerDown); this.canvas.addEventListener('pointermove', this.pointerMove); this.canvas.addEventListener('pointerup', this.pointerUp); this.canvas.addEventListener('pointercancel', () => { if (this.drag) { this.history.document = this.drag.before; this.drag = null; this.refresh(); } });
        this.canvas.addEventListener('contextmenu', event => event.preventDefault());
        this.canvas.addEventListener('wheel', event => { if (this.mode === 'play') return; event.preventDefault(); const before = this.worldPoint(event); this.camera.zoom = Math.max(.06, Math.min(4, this.camera.zoom * Math.exp(-event.deltaY * .0015))); const after = this.worldPoint(event); this.camera.x += before.x - after.x; this.camera.y += before.y - after.y; this.updateToolbar(); }, { passive: false });
        window.addEventListener('keydown', event => {
            if (editableTarget(event.target)) return;
            if (event.code === 'Space' && this.mode !== 'play') { this.heldSpace = true; event.preventDefault(); }
            if (this.mode === 'play') { if (event.code === 'Escape') this.stopTest(); return; }
            if (event.code === 'Escape') { this.palette = null; this.connection = false; this.connectionSource = null; this.selection.clear(); this.renderInspector(); this.renderHierarchy(); this.renderLogic(); this.updateToolbar(); }
            if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') { event.preventDefault(); void this.save(); }
            if (this.mode !== 'edit') return;
            if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') { event.preventDefault(); if (event.shiftKey ? this.history.redo() : this.history.undo()) this.changed(); }
            if ((event.ctrlKey || event.metaKey) && event.code === 'KeyY') { event.preventDefault(); if (this.history.redo()) this.changed(); }
            if ((event.ctrlKey || event.metaKey) && event.code === 'KeyD') { event.preventDefault(); this.duplicate(); }
            if ((event.ctrlKey || event.metaKey) && event.code === 'KeyA') { event.preventDefault(); this.selection = new Set(this.document.geometry.objects.filter(o => !this.document.editor.locked.includes(o.id) && !this.document.editor.hidden.includes(o.id)).map(o => o.id)); this.renderHierarchy(); this.renderInspector(); this.renderLogic(); }
            if (event.code === 'Delete' || event.code === 'Backspace') { event.preventDefault(); this.deleteSelection(); }
            if (event.code === 'KeyF') this.fit();
            const delta = event.code === 'ArrowLeft' ? [-1, 0] : event.code === 'ArrowRight' ? [1, 0] : event.code === 'ArrowUp' ? [0, -1] : event.code === 'ArrowDown' ? [0, 1] : null;
            if (delta && this.selection.size) { event.preventDefault(); const step = event.shiftKey ? this.document.editor.grid : 1; this.mutate(d => translateEntities(d, this.movableSelection(), { x: delta[0] * step, y: delta[1] * step })); }
        });
        window.addEventListener('keyup', event => { if (event.code === 'Space') this.heldSpace = false; }); window.addEventListener('blur', () => { this.heldSpace = false; this.input?.releaseAll(); });
        window.addEventListener('beforeunload', event => { if (this.dirty) { event.preventDefault(); event.returnValue = ''; } });
    }
    movableSelection() { return new Set([...this.selection].filter(id => !this.document.editor.locked.includes(id))); }
    duplicate() { if (!this.selection.size || this.mode !== 'edit') return; this.mutate(d => { this.selection = new Set(duplicateEntities(d, this.movableSelection())); }); }
    deleteSelection() { if (!this.selection.size || this.mode !== 'edit') return; const ids = this.movableSelection(); const connected = this.document.bindings.filter(b => ids.has(b.target)); const sources = this.document.geometry.objects.filter(o => ids.has(o.id) && o.type === 'device'); if ((connected.length || sources.length) && !confirm(`Delete ${ids.size} object(s)? ${connected.length} target binding(s) will be removed. Logic referencing deleted controls remains visible as unresolved diagnostics.`)) return; this.mutate(d => deleteEntities(d, ids)); this.selection.clear(); this.renderInspector(); this.renderHierarchy(); this.renderLogic(); }
    worldPoint(event: Pick<MouseEvent, 'clientX' | 'clientY'>): Vec2 { const r = this.canvas.getBoundingClientRect(), camera = this.mode === 'play' ? this.renderer.camera : this.camera; return { x: camera.x + (event.clientX - r.left - r.width / 2) / camera.zoom, y: camera.y + (event.clientY - r.top - r.height / 2) / camera.zoom }; }
    snapPoint(p: Vec2) { return this.document.editor.snap ? { x: Math.round(p.x / this.document.editor.grid) * this.document.editor.grid, y: Math.round(p.y / this.document.editor.grid) * this.document.editor.grid } : p; }
    fit(box?: Box) { const r = this.canvas.getBoundingClientRect(), b = box ?? { x: 0, y: 0, w: this.document.geometry.width, h: this.document.geometry.height }; this.camera = { x: b.x + b.w / 2, y: b.y + b.h / 2, zoom: Math.max(.06, Math.min(2, (r.width - 90) / Math.max(100, b.w), (r.height - 120) / Math.max(100, b.h))) }; this.updateToolbar(); }
    frameSelection() { const b = boundsUnion([...this.selection].map(id => entityBounds(this.document, id)).filter((b): b is Box => !!b)); if (b) this.fit({ x: b.x - 100, y: b.y - 100, w: b.w + 200, h: b.h + 200 }); }
    entityAt(point: Vec2): string | undefined {
        const hidden = new Set(this.document.editor.hidden), locked = new Set(this.document.editor.locked), tolerance = 7 / this.camera.zoom;
        const ids = [...this.document.geometry.objects.map(o => o.id), ...this.document.presentation.labels.map(o => o.id), ...this.document.presentation.cameraReveals.map(o => o.id), ...this.document.presentation.wires.map(o => o.id)].reverse();
        return ids.find(id => {
            if (hidden.has(id) || locked.has(id)) return false;
            const wire = this.document.presentation.wires.find(w => w.id === id);
            if (wire) return wire.points.slice(1).some((end, i) => { const start = wire.points[i], dx = end.x - start.x, dy = end.y - start.y, t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy) <= tolerance; });
            const b = entityBounds(this.document, id); return b && point.x >= b.x - tolerance && point.x <= b.x + b.w + tolerance && point.y >= b.y - tolerance && point.y <= b.y + b.h + tolerance;
        });
    }
    pointerDown = (event: PointerEvent) => {
        if (this.mode === 'play') return;
        this.canvas.focus(); const at = this.worldPoint(event); this.lastPoint = at; const screen = { x: event.clientX, y: event.clientY };
        const start = { start: at, screen, before: cloneDraft(this.document), camera: { ...this.camera } };
        if (event.button === 1 || event.button === 2 || this.heldSpace) { this.drag = { ...start, kind: 'pan' }; this.canvas.setPointerCapture(event.pointerId); return; }
        if (this.mode !== 'edit') return;
        this.canvas.setPointerCapture(event.pointerId);
        if (this.palette) { const draft = cloneDraft(this.document), id = createEntity(draft, this.palette, this.snapPoint(at)); this.history.document = draft; this.selection = new Set([id]); const o = draft.geometry.objects.find(o => o.id === id); this.drag = { ...start, kind: o && 'w' in o ? 'resize' : 'move', id }; this.palette = null; this.renderHierarchy(); this.renderInspector(); this.renderLogic(); this.updateToolbar(); return; }
        if (this.selection.size === 1) {
            const id = [...this.selection][0], wire = this.document.presentation.wires.find(w => w.id === id), tolerance = 10 / this.camera.zoom;
            if (!this.document.editor.locked.includes(id) && wire) { const point = wire.points.findIndex(p => Math.hypot(p.x - at.x, p.y - at.y) < tolerance); if (point >= 0) { this.drag = { ...start, kind: 'bend', id, point }; return; } }
            const b = entityBounds(this.document, id), object = this.document.geometry.objects.find(o => o.id === id), reveal = this.document.presentation.cameraReveals.find(r => r.id === id);
            if (!this.document.editor.locked.includes(id) && b && (object && ('w' in object || object.type === 'firewall') || reveal?.bounds) && Math.hypot(at.x - (b.x + b.w), at.y - (b.y + b.h)) < tolerance) { this.drag = { ...start, kind: 'resize', id }; return; }
        }
        const id = this.entityAt(at);
        if (this.connection) {
            if (!id) return;
            if (!this.connectionSource) { const o = this.document.geometry.objects.find(o => o.id === id); if (o?.type !== 'device') { this.status('Choose a control device as the source port.'); return; } this.connectionSource = id; this.selection = new Set([id]); }
            else { const source = this.connectionSource; this.mutate(d => connectDevice(d, source, id)); this.connectionSource = null; this.selection = new Set([id]); }
            this.renderInspector(); this.updateToolbar(); return;
        }
        if (id) { if (event.shiftKey && this.selection.has(id)) this.selection.delete(id); else { if (!event.shiftKey && !this.selection.has(id)) this.selection.clear(); this.selection.add(id); } this.drag = { ...start, kind: 'move', id }; }
        else { if (!event.shiftKey) this.selection.clear(); this.drag = { ...start, kind: 'marquee', additive: event.shiftKey }; }
        this.renderHierarchy(); this.renderInspector(); this.renderLogic();
    };
    pointerMove = (event: PointerEvent) => {
        this.pointer = this.worldPoint(event); const drag = this.drag; if (!drag) return;
        if (drag.kind === 'pan') { this.camera.x = drag.camera.x - (event.clientX - drag.screen.x) / drag.camera.zoom; this.camera.y = drag.camera.y - (event.clientY - drag.screen.y) / drag.camera.zoom; return; }
        if (drag.kind === 'marquee') return;
        const delta = this.snapPoint({ x: this.pointer.x - drag.start.x, y: this.pointer.y - drag.start.y });
        const created = !drag.before.geometry.objects.some(o => o.id === drag.id) && !drag.before.presentation.labels.some(l => l.id === drag.id) && !drag.before.presentation.cameraReveals.some(r => r.id === drag.id) && !drag.before.presentation.wires.some(w => w.id === drag.id);
        if (created && Math.hypot(event.clientX - drag.screen.x, event.clientY - drag.screen.y) < 4) return;
        const draft = created ? cloneDraft(this.document) : cloneDraft(drag.before);
        if (drag.kind === 'move') {
            if (created) { const o = draft.geometry.objects.find(o => o.id === drag.id); if (o) { const p = this.snapPoint(this.pointer); o.x = p.x; o.y = p.y; } }
            else translateEntities(draft, this.movableSelection(), delta);
        } else if (drag.kind === 'bend') { const w = draft.presentation.wires.find(w => w.id === drag.id); if (w && drag.point !== undefined) w.points[drag.point] = this.snapPoint(this.pointer); }
        else {
            const o = draft.geometry.objects.find(o => o.id === drag.id), b = o ? objectBounds(o) : draft.presentation.cameraReveals.find(r => r.id === drag.id)?.bounds;
            if (b) { const end = this.snapPoint(this.pointer), w = Math.max(5, end.x - b.x), h = Math.max(5, end.y - b.y); if (o && 'w' in o) { o.w = w; o.h = h; } else if (o?.type === 'firewall') { o.length = o.orientation === 'vertical' ? h : w; o.thickness = o.orientation === 'vertical' ? w : h; } else { b.w = w; b.h = h; } }
        }
        this.history.document = draft; this.rebuildRuntime();
    };
    pointerUp = (event: PointerEvent) => {
        const drag = this.drag; if (!drag) return; this.drag = null;
        if (drag.kind === 'marquee') { const end = this.worldPoint(event), area = { x: Math.min(drag.start.x, end.x), y: Math.min(drag.start.y, end.y), w: Math.abs(end.x - drag.start.x), h: Math.abs(end.y - drag.start.y) }; if (!drag.additive) this.selection.clear(); for (const o of this.document.geometry.objects) if (!this.document.editor.hidden.includes(o.id) && !this.document.editor.locked.includes(o.id) && overlaps(area, objectBounds(o))) this.selection.add(o.id); this.renderHierarchy(); this.renderInspector(); this.renderLogic(); }
        else if (drag.kind !== 'pan') { const validation = validateDraft(this.document); if (!validation.structural) { this.history.document = drag.before; this.refresh(); this.status(`Gesture rejected: ${validation.diagnostics.find(d => d.severity === 'error')?.message}`); } else { this.history.commit(this.document, drag.before); this.changed(); } }
        this.updateToolbar();
    };
    preview(state: string | { inputs?: Record<string, boolean>; forcedOutputs?: Record<string, boolean> } = 'idle') {
        this.stopTest(); this.mode = 'preview'; this.palette = null; this.connection = false;
        if (typeof state === 'string') { if (!(state in this.document.previewStates)) { this.status(`Unknown saved input state: ${state}`); return; } this.stateName = state; this.previewValues = { ...this.document.previewStates[state] }; this.forcedMode = false; this.forced = {}; }
        else { this.previewValues = { ...state.inputs }; this.forcedMode = state.forcedOutputs !== undefined; this.forced = { ...state.forcedOutputs }; }
        this.refresh();
    }
    async startTest(options: { slot?: 1 | 2; at?: Vec2; scenario?: string } = {}) {
        if (!this.playable) throw new Error('Blocking validation diagnostics prevent playtesting.');
        if (this.mode === 'play') this.stopTest();
        try {
            const slot = options.slot ?? 1, runtime = createRuntime(cloneDraft(this.document), slot, options.at ? { start: options.at } : {});
            const hash = await draftHash(this.document); this.testSlot = slot; this.testAt = options.at; this.runtime = runtime; this.mode = 'play'; this.paused = false; this.accumulator = 0;
            this.palette = null; this.connection = false; this.renderer.room(runtime.world);
            this.recording = { version: 1, draftHash: hash, engineRevision: this.engineRevision, scenario: options.scenario ?? (options.at ? 'editor-test-from-here' : 'editor-play-from-spawn'), sectionOnly: !!options.at, samples: [], events: [] }; this.recordedFrames = 0; this.recordingElapsed = 0;
            this.input = new InputManager(true); this.input.attach(this.canvas, $('.wb-stage')); this.canvas.focus(); this.renderInspector(); this.renderLogic(); this.updateToolbar(); this.status('Physics test running in an isolated runtime. Escape or Stop returns to authored geometry.');
        } catch (error) { const message = error instanceof Error ? error.message : String(error); this.status(`Cannot start test: ${message}`); throw error; }
    }
    async testHere() {
        const object = this.document.geometry.objects.find(o => this.selection.has(o.id));
        const at = object ? object.type === 'spawn' || object.type === 'checkpoint' || object.type === 'marker' ? { x: object.x, y: object.y } : { x: objectBounds(object).x + objectBounds(object).w / 2, y: objectBounds(object).y - PLAYER.height / 2 - .1 } : this.lastPoint;
        if (!at) { this.status('Select an entry/checkpoint marker or click a clear point first.'); return; }
        await this.startTest({ slot: this.testSlot, at }).catch(() => {});
    }
    stopTest() {
        if (this.mode !== 'play') return;
        this.input?.dispose(); this.input = null; this.mode = 'edit'; this.paused = false; this.accumulator = 0;
        this.refresh(); this.status(`Stopped. Authored document, selection and editor camera restored. ${this.recording?.samples.length ?? 0} measured trajectory samples recorded.`);
    }
    advance(input: InputState, interact = false) {
        if (!this.runtime || this.mode !== 'play') return;
        this.runtime.step(input, interact, FIXED_DT); this.recordingElapsed += FIXED_DT;
        const state = this.runtime.snapshot(), recording = this.recording;
        if (recording && ++this.recordedFrames % 4 === 1 && recording.samples.length < 18000) recording.samples.push({ time: state.time, player: { x: state.player.x, y: state.player.y, grounded: state.player.grounded, groundId: state.player.groundId, rope: state.player.rope, ropeTarget: state.player.target }, cubes: state.cubes, signals: state.signals, deaths: state.deaths });
        if (recording) recording.events = this.runtime.recording.events.map(e => ({ time: e.time, kind: e.kind, detail: e.details ?? e.at }));
    }
    stepTest(options: { frames: number; input?: Partial<InputState>; interact?: boolean }) {
        if (this.mode !== 'play' || !this.runtime) throw new Error('Start a physics test first.');
        if (!Number.isInteger(options.frames) || options.frames < 1 || options.frames > 7200) throw new Error('A step is bounded to 1–7200 fixed frames.');
        this.paused = true;
        for (let i = 0; i < options.frames; i++) this.advance({ ...emptyInput(), ...options.input, ...(i ? { jumpPressed: false, grapplePressed: false, airGrapplePressed: false } : {}) }, i === 0 && options.interact);
        return this.runtime.snapshot();
    }
    loadDocument(document: DraftDocument, hash?: string) {
        const result = validateDraft(document); if (!result.structural || !result.document) throw new Error(result.diagnostics.map(d => `${d.code}: ${d.message}`).join('; '));
        this.stopTest(); this.history.replace(result.document); this.hash = hash ?? null; this.saved = hash ? serializeDraft(result.document) : ''; this.externalConflict = null; this.selection.clear(); this.mode = 'edit'; this.refresh(); this.fit();
    }
    async render(options: { viewport?: Box; wholeRoom?: boolean; state?: string } = {}) {
        if (options.state) this.preview(options.state); if (options.wholeRoom) this.fit(); if (options.viewport) this.fit(options.viewport);
        this.draw(0); await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); return { hash: await draftHash(this.document), state: options.state ?? this.mode, viewport: { ...this.camera } };
    }
    async startCoop() {
        try { const snapshot = await this.request<{ hash: string }>('snapshots', { document: this.document }); const url = `/workbench-runner.html?coopHash=${encodeURIComponent(snapshot.hash)}`; const child = window.open(url, '_blank'); this.status(`Frozen draft ${snapshot.hash.slice(0, 12)}. Co-op host opens separately; partner must use a private window or another browser identity.`); if (!child) this.modal('Co-op draft ready', `<p>A validated snapshot is frozen at <code>${html(snapshot.hash)}</code>.</p><p><a href="${url}" target="_blank" rel="noopener">Open co-op host</a>. The partner joins its room code in a private window. Ordinary tabs share an identity.</p>`); }
        catch (e) { this.status(`Co-op snapshot failed: ${String(e)}`); }
    }
    modal(title: string, content: string) { const overlay = document.createElement('div'); overlay.className = 'wb-modal'; overlay.innerHTML = `<section class="wb-dialog" role="dialog" aria-modal="true" aria-label="${html(title)}"><h2>${html(title)}</h2>${content}<div class="wb-actions"><button data-close>Close</button></div></section>`; document.body.append(overlay); overlay.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => overlay.remove(); overlay.querySelector<HTMLButtonElement>('button')?.focus(); return overlay; }
    importDialog() {
        const modal = this.modal('Import a trusted room copy', '<p>Retain geometry, both player slots and the allowlisted controller. Copies are authored drafts. Campaign files and evidence remain unchanged.</p><div class="wb-actions"><button data-import="race-condition">RACE CONDITION</button><button data-import="crossfeed-vault">CROSSFEED VAULT</button><button data-import="relay-lab">RELAY LAB</button></div>');
        for (const button of modal.querySelectorAll<HTMLButtonElement>('[data-import]')) button.onclick = async () => { if (this.dirty && !confirm('Discard unsaved editor changes and open the imported copy?')) return; try { const factory = button.dataset.import!, record = await this.request<StoredDraft>('import', { controller: factory }); this.loadDocument(record.document); this.name = `${factory}-copy.json`; this.saved = ''; modal.remove(); this.status(`Imported ${factory}. Save the copy to exchange edits with CLI tools.`); } catch (e) { this.status(String(e)); } };
    }
    download(name: string, text: string) { const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    /** Stopped editor visibility changes only this synchronous rendering call. */
    applyVisibility(): () => void {
        if (!this.runtime || this.mode === 'play' || !this.document.editor.hidden.length) return () => {};
        const hidden = new Set(this.document.editor.hidden), world = this.runtime.world, room = world.room, restore: (() => void)[] = [];
        const set = <O extends object, K extends keyof O>(object: O, key: K, value: O[K]) => { const old = object[key]; restore.push(() => { object[key] = old; }); object[key] = value; };
        const visibleId = (id: string) => !hidden.has(id) && !hidden.has(id.replace(/^draft:/, ''));
        const hiddenObjects = this.document.geometry.objects.filter(o => hidden.has(o.id));
        const visiblePoint = (point: Vec2, type: DraftObject['type']) => !hiddenObjects.some(o => o.type === type && o.x === point.x && o.y === point.y);
        set(world, 'platforms', world.platforms.filter(p => visibleId(p.def.id)));
        set(world, 'lifts', world.lifts.filter(l => visibleId(l.def.id)));
        set(world, 'firewalls', world.firewalls.filter(f => visibleId(f.def.id)));
        set(world, 'gates', world.gates.filter(g => !hiddenObjects.some(o => o.type === 'relay' && o.pair === g.def.id)));
        set(world, 'cubes', Object.fromEntries(Object.entries(world.cubes).filter(([id]) => visibleId(id))));
        set(room, 'platforms', room.platforms.filter(p => visibleId(p.id)));
        set(room, 'controls', room.controls?.filter(o => visibleId(o.id)));
        set(room, 'plates', room.plates?.filter(o => visibleId(o.id)));
        set(room, 'cubePads', room.cubePads?.filter(o => visibleId(o.id)));
        set(room, 'hazards', room.hazards.filter(o => visiblePoint(o, 'hazard')));
        set(room, 'entryPoints', room.entryPoints?.filter(o => visiblePoint(o, 'spawn')));
        set(room, 'breakpoints', room.breakpoints?.filter(o => visibleId(o.id)));
        set(room, 'regions', room.regions?.filter(o => !this.document.presentation.labels.some(l => hidden.has(l.id) && l.x === o.at.x && l.y === o.at.y)));
        set(this.renderer, 'connections', this.renderer.connections.filter(w => !hidden.has(w.id) && !hidden.has(`wire-${w.id}`)));
        for (const o of hiddenObjects) {
            if (o.type === 'device' && o.legacy && o.legacy !== 'cubePad') set(room, o.legacy, undefined);
            if (o.type === 'exit') set(room, 'exit', { ...room.exit, x: -20000, y: -20000 });
        }
        return () => { for (let i = restore.length - 1; i >= 0; i--) restore[i](); };
    }
    draw(dt: number) {
        this.renderer.editorCamera = this.mode === 'play' ? undefined : this.camera;
        this.renderer.showGrid = this.mode === 'play';
        this.renderer.resize();
        if (this.runtime) {
            const restore = this.applyVisibility();
            try { this.renderer.draw(this.runtime.world, this.mode === 'play' ? dt : 0, this.pointer, false, undefined, this.mode === 'play'); }
            catch (e) { this.runtimeError = String(e); this.runtime = null; this.status(`Renderer failed: ${String(e)}`); this.updateToolbar(); }
            finally { restore(); }
        }
        if (!this.runtime) { const context = this.canvas.getContext('2d')!; context.setTransform(1, 0, 0, 1, 0, 0); context.fillStyle = '#0b131a'; context.fillRect(0, 0, this.canvas.width, this.canvas.height); }
        if (this.overlay.width !== this.canvas.width || this.overlay.height !== this.canvas.height) { this.overlay.width = this.canvas.width; this.overlay.height = this.canvas.height; }
        const c = this.overlay.getContext('2d')!, dpr = Math.min(devicePixelRatio || 1, 2), camera = this.mode === 'play' ? this.renderer.camera : this.camera, rect = this.canvas.getBoundingClientRect();
        c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.overlay.width, this.overlay.height); c.setTransform(dpr * camera.zoom, 0, 0, dpr * camera.zoom, dpr * (rect.width / 2 - camera.x * camera.zoom), dpr * (rect.height / 2 - camera.y * camera.zoom));
        const zoom = camera.zoom, left = camera.x - rect.width / 2 / zoom, top = camera.y - rect.height / 2 / zoom;
        if (this.mode !== 'play' && this.showGrid) { const grid = this.document.editor.grid * Math.max(1, Math.ceil(8 / zoom / this.document.editor.grid)); c.strokeStyle = '#b2dddc13'; c.lineWidth = 1 / zoom; c.beginPath(); for (let x = Math.floor(left / grid) * grid; x < left + rect.width / zoom; x += grid) { c.moveTo(x, top); c.lineTo(x, top + rect.height / zoom); } for (let y = Math.floor(top / grid) * grid; y < top + rect.height / zoom; y += grid) { c.moveTo(left, y); c.lineTo(left + rect.width / zoom, y); } c.stroke(); }
        if (this.mode !== 'play') { c.strokeStyle = '#708996'; c.lineWidth = 1 / zoom; c.strokeRect(0, 0, this.document.geometry.width, this.document.geometry.height); }
        const hidden = new Set(this.document.editor.hidden);
        if (this.mode !== 'play') for (const object of this.document.geometry.objects) {
            if (hidden.has(object.id)) continue;
            const b = objectBounds(object), selected = this.selection.has(object.id), locked = this.document.editor.locked.includes(object.id);
            if (!this.runtime) { c.fillStyle = object.type === 'platform' && object.kind === 'static' ? '#21303a' : '#1c393940'; c.fillRect(b.x, b.y, b.w, b.h); c.strokeStyle = '#738d9955'; c.strokeRect(b.x, b.y, b.w, b.h); }
            if (this.mode === 'edit' || this.hitboxes) { c.lineWidth = (selected ? 2 : 1) / zoom; c.strokeStyle = selected ? '#80ffe2' : object.type === 'spawn' ? '#b19cff' : '#7997a044'; c.setLineDash(selected ? [] : [4 / zoom, 3 / zoom]); c.strokeRect(b.x, b.y, b.w, b.h); c.setLineDash([]); if (selected || object.type === 'spawn' || object.type === 'checkpoint') { c.font = `${11 / zoom}px ui-monospace,monospace`; c.fillStyle = selected ? '#adffed' : '#bca9ee'; c.fillText(`${object.id}${locked ? ' [locked]' : ''}`, b.x, b.y - 7 / zoom); } }
        }
        if (this.mode !== 'play') {
            for (const reveal of this.document.presentation.cameraReveals) { if (hidden.has(reveal.id)) continue; const b = entityBounds(this.document, reveal.id); if (!b) continue; c.strokeStyle = this.selection.has(reveal.id) ? '#ddc9ff' : '#a294c266'; c.setLineDash([10 / zoom, 5 / zoom]); c.strokeRect(b.x, b.y, b.w, b.h); c.setLineDash([]); if (this.selection.has(reveal.id)) { c.fillStyle = '#bca9ee'; c.font = `${11 / zoom}px ui-monospace,monospace`; c.fillText(`CAMERA / ${reveal.source}`, b.x, b.y - 8 / zoom); } }
            for (const wire of this.document.presentation.wires) { if (hidden.has(wire.id) || !this.selection.has(wire.id) && wire.binding) continue; c.strokeStyle = this.selection.has(wire.id) ? '#f6ce8a' : '#718790'; c.lineWidth = 2 / zoom; c.beginPath(); wire.points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); if (this.selection.has(wire.id)) { c.fillStyle = '#f6ce8a'; for (const p of wire.points) c.fillRect(p.x - 4 / zoom, p.y - 4 / zoom, 8 / zoom, 8 / zoom); } }
            if (this.selection.size === 1) { const id = [...this.selection][0], b = entityBounds(this.document, id), object = this.document.geometry.objects.find(o => o.id === id); if (b && !hidden.has(id) && (object && ('w' in object || object.type === 'firewall') || this.document.presentation.cameraReveals.some(r => r.id === id))) { c.fillStyle = '#90ffe0'; c.fillRect(b.x + b.w - 5 / zoom, b.y + b.h - 5 / zoom, 10 / zoom, 10 / zoom); } }
        }
        if (this.hitboxes && this.runtime) { c.strokeStyle = '#ffbb68'; c.lineWidth = 1 / zoom; for (const s of this.runtime.world.solids) if (s.enabled) c.strokeRect(s.x, s.y, s.w, s.h); const p = this.runtime.world.player; c.strokeRect(p.x - PLAYER.width / 2, p.y - PLAYER.height / 2, PLAYER.width, PLAYER.height); }
        if (this.range) { const marker = this.document.geometry.objects.find(o => this.selection.has(o.id)), at = this.mode === 'play' ? this.runtime?.world.player : marker ? { x: marker.x, y: marker.y } : this.lastPoint; if (at) { c.strokeStyle = '#e4c97d99'; c.setLineDash([8 / zoom, 5 / zoom]); c.beginPath(); c.arc(at.x, at.y, GRAPPLE.maxRange, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); c.fillStyle = '#e4c97d'; c.font = `${11 / zoom}px ui-monospace,monospace`; c.fillText(`${GRAPPLE.maxRange}u range hint · swing not proven`, at.x - 130 / zoom, at.y - GRAPPLE.maxRange - 8 / zoom); } }
        if (this.recording && this.recording.samples.length > 1) {
            c.strokeStyle = this.recording.draftHash === this.currentHash ? '#fac982' : '#ac859f'; c.lineWidth = 2 / zoom; c.beginPath(); let lastDeaths = -1; for (const s of this.recording.samples) { if (s.deaths !== lastDeaths) c.moveTo(s.player.x, s.player.y); else c.lineTo(s.player.x, s.player.y); lastDeaths = s.deaths; } c.stroke();
            const cubeIds = Object.keys(this.recording.samples[0].cubes); c.lineWidth = 1 / zoom; c.strokeStyle = '#f4df7e66'; for (const id of cubeIds) { c.beginPath(); this.recording.samples.forEach((s, i) => { const p = s.cubes[id]; if (p) { if (!i) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); } }); c.stroke(); }
        }
        if (this.drag?.kind === 'marquee') { c.fillStyle = '#74dfcd22'; c.strokeStyle = '#91f5df'; c.lineWidth = 1 / zoom; c.fillRect(this.drag.start.x, this.drag.start.y, this.pointer.x - this.drag.start.x, this.pointer.y - this.drag.start.y); c.strokeRect(this.drag.start.x, this.drag.start.y, this.pointer.x - this.drag.start.x, this.pointer.y - this.drag.start.y); }
        if (this.mode === 'play' && this.runtime) { const p = this.runtime.world.player; const observation = document.querySelector('#observation'); if (observation) observation.textContent = `Position ${p.x.toFixed(1)}, ${p.y.toFixed(1)}\nGround ${p.groundId ?? 'air'}\nRope ${p.rope.phase} / ${p.rope.anchorId ?? '—'}\nDeaths ${this.runtime.world.deaths}\nTime ${this.runtime.world.elapsed.toFixed(1)} s`; }
    }
    animate = (time: number) => {
        const elapsed = Math.min(.1, (time - this.lastTime) / 1000); this.lastTime = time;
        if (this.mode === 'play' && this.input && this.runtime && !this.paused) {
            this.accumulator += elapsed;
            while (this.accumulator >= FIXED_DT) { this.input.sync(this.renderer.camera.screenToWorld(this.input.screenAim.x, this.input.screenAim.y)); const edges = this.input.takeEdges(); this.input.state.jumpPressed = edges.jump; this.input.state.airGrapplePressed = edges.airGrapple; this.input.state.grapplePressed = edges.grapple; this.advance(this.input.state, edges.interact); this.accumulator -= FIXED_DT; }
        }
        this.draw(elapsed); requestAnimationFrame(this.animate);
    };
}
const editor = new WorkbenchEditor();
/** Internal browser harness only. This entry is excluded from the production build. */
const api = {
    get ready() { return !!editor.token; },
    snapshot: () => ({ document: cloneDraft(editor.document), hash: editor.currentHash, mode: editor.mode, selection: [...editor.selection], dirty: editor.dirty, diagnostics: editor.diagnostics, file: editor.name, camera: { ...editor.camera }, playable: editor.playable, runtimeError: editor.runtimeError }),
    loadDocument: (document: DraftDocument, hash?: string) => editor.loadDocument(document, hash),
    preview: (state: Parameters<WorkbenchEditor['preview']>[0]) => editor.preview(state),
    startTest: (options?: Parameters<WorkbenchEditor['startTest']>[0]) => editor.startTest(options),
    stopTest: () => editor.stopTest(), stepTest: (options: Parameters<WorkbenchEditor['stepTest']>[0]) => editor.stepTest(options),
    observe: () => editor.runtime?.snapshot(), render: (options?: Parameters<WorkbenchEditor['render']>[0]) => editor.render(options),
    exportRecording: () => structuredClone(editor.recording),
};
Object.defineProperty(window, 'workbench', { value: Object.freeze(api), configurable: false });
declare global { interface Window { workbench: typeof api } }
