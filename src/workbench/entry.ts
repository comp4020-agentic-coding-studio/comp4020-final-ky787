import { WorkbenchEditor } from './editor.ts';
import { BrowserDraftStorage } from './browser-storage.ts';

declare const __WORKBENCH_LOCAL__: boolean;
// This literal is defined only by the loopback service. Production hard-codes false,
// and tree-shakes the dynamic local adapter import. No URL/API/document mode switch.
const storage = import.meta.env.DEV && __WORKBENCH_LOCAL__
    ? new (await import('./local-storage.ts')).LocalDraftStorage()
    : new BrowserDraftStorage();
new WorkbenchEditor(storage);
