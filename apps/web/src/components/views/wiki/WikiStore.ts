/*
 * WikiStore - Fetches and caches bot data from the bot-server API.
 * Singleton, EventEmitter-based (consistent with Element Web patterns).
 */
import { EventEmitter } from "events";

export interface BotInfo {
    id: string;
    name: string;
    role: string;
    bot_type: "internal" | "external";
    status: string;
    matrix_user_id: string;
    personality: string;
}

class WikiStore extends EventEmitter {
    private static _instance: WikiStore;
    private bots: BotInfo[] = [];
    private selectedBotId: string | null = null;
    private wikiCache: Map<string, string> = new Map();
    private loading = false;
    private error: string | null = null;
    private botServerUrl: string = "http://localhost:8085";

    public static get instance(): WikiStore {
        if (!WikiStore._instance) {
            WikiStore._instance = new WikiStore();
        }
        return WikiStore._instance;
    }

    public setBotServerUrl(url: string): void {
        this.botServerUrl = url.replace(/\/$/, "");
    }

    public async fetchBots(): Promise<void> {
        this.loading = true;
        this.error = null;
        this.emit("update");
        try {
            const res = await fetch(`${this.botServerUrl}/api/bots`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.bots = data.bots ?? data ?? [];
            this.emit("update");
        } catch (e: any) {
            this.error = e.message ?? "Error al cargar bots";
            this.emit("update");
        } finally {
            this.loading = false;
        }
    }

    public async fetchWiki(botId: string): Promise<void> {
        if (this.wikiCache.has(botId)) {
            this.emit("wiki_update", botId);
            return;
        }
        try {
            const res = await fetch(`${this.botServerUrl}/api/bots/${botId}/wiki`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.wikiCache.set(botId, data.content ?? "");
            this.emit("wiki_update", botId);
        } catch (e: any) {
            this.wikiCache.set(botId, `_Error al cargar la wiki: ${e.message}_`);
            this.emit("wiki_update", botId);
        }
    }

    public selectBot(botId: string): void {
        this.selectedBotId = botId;
        this.emit("selection_update");
        this.fetchWiki(botId);
    }

    public getBots(): BotInfo[] { return this.bots; }
    public getSelectedBotId(): string | null { return this.selectedBotId; }
    public getSelectedBot(): BotInfo | null {
        return this.bots.find(b => b.id === this.selectedBotId) ?? null;
    }
    public getWikiContent(botId: string): string | null {
        return this.wikiCache.get(botId) ?? null;
    }
    public isLoading(): boolean { return this.loading; }
    public getError(): string | null { return this.error; }
    public invalidateCache(botId?: string): void {
        if (botId) this.wikiCache.delete(botId);
        else this.wikiCache.clear();
    }
}

export default WikiStore.instance;
