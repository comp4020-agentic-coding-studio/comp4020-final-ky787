import { freshProgress, validProgress, type Progress } from './progress.ts';
export class ProgressStore {
    progress = freshProgress();
    visitor = '';
    revision = 0;
    updatedAt: string | null = null;
    status = 'Loading saved progress…';
    ready = false;
    conflict = false;
    private desired: Progress | null = null;
    private pending = false;
    private retry: ReturnType<typeof setTimeout> | undefined;
    async load(): Promise<boolean> {
        try {
            const res = await fetch('/api/progress', { signal: AbortSignal.timeout(5000) });
            if (!res.ok)
                throw new Error();
            const data = await res.json();
            if (!validProgress(data.progress))
                throw new Error();
            this.progress = data.progress;
            this.visitor = data.id;
            this.revision = data.revision;
            this.updatedAt = data.updatedAt;
            this.ready = true;
            this.status = data.updatedAt ? 'Saved on server' : 'New visitor · server ready';
            return true;
        }
        catch {
            this.status = 'Save server unavailable · retry or play unsaved';
            return false;
        }
    }
    save(progress: Progress): void {
        this.progress = progress;
        if (!this.ready || this.conflict)
            return;
        this.desired = structuredClone(progress);
        void this.flush();
    }
    async flush(): Promise<void> {
        if (this.pending || !this.desired || this.conflict)
            return;
        this.pending = true;
        const progress = this.desired;
        this.desired = null;
        this.status = 'Saving…';
        try {
            const res = await fetch('/api/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ revision: this.revision, progress }), keepalive: true, signal: AbortSignal.timeout(5000) });
            if (res.status === 409) {
                this.conflict = true;
                this.desired = null;
                this.status = 'Save changed in another tab · reload to continue';
                return;
            }
            if (!res.ok)
                throw new Error();
            const data = await res.json();
            this.revision = data.revision;
            this.updatedAt = data.updatedAt;
            this.status = 'Saved on server';
        }
        catch {
            this.desired ??= progress;
            this.status = 'Save pending · retrying connection';
            clearTimeout(this.retry);
            this.retry = setTimeout(() => void this.flush(), 3000);
        }
        finally {
            this.pending = false;
        }
        if (this.desired && this.status === 'Saved on server')
            await this.flush();
    }
}
