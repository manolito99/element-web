/*
 * BotWikiView - Main content panel showing a bot's wiki (Markdown).
 * Shown when Wiki mode is active and a bot is selected.
 */
import React, { useEffect, useState, useCallback } from "react";
import WikiStore, { BotInfo } from "./WikiStore";
import "./wiki.css";

// Minimal markdown → HTML renderer (no extra deps needed)
function renderMarkdown(md: string): string {
    return md
        // Headers
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        // Bold & italic
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        // Inline code
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        // HR
        .replace(/^---$/gm, "<hr/>")
        // Links
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        // Line breaks (double newline = paragraph break)
        .replace(/\n\n/g, "</p><p>")
        // HTML comments (strip)
        .replace(/<!--[\s\S]*?-->/g, "");
}

const STATUS_LABELS: Record<string, string> = {
    running: "Corriendo",
    stopped: "Detenido",
    starting: "Iniciando",
};

const BotWikiView: React.FC = () => {
    const [bot, setBot] = useState<BotInfo | null>(WikiStore.getSelectedBot());
    const [content, setContent] = useState<string | null>(
        bot ? WikiStore.getWikiContent(bot.id) : null,
    );

    const onSelection = useCallback(() => {
        const selected = WikiStore.getSelectedBot();
        setBot(selected);
        setContent(selected ? WikiStore.getWikiContent(selected.id) : null);
    }, []);

    const onWikiUpdate = useCallback(
        (botId: string) => {
            if (bot && botId === bot.id) {
                setContent(WikiStore.getWikiContent(botId));
            }
        },
        [bot],
    );

    useEffect(() => {
        WikiStore.on("selection_update", onSelection);
        WikiStore.on("wiki_update", onWikiUpdate);
        return () => {
            WikiStore.off("selection_update", onSelection);
            WikiStore.off("wiki_update", onWikiUpdate);
        };
    }, [onSelection, onWikiUpdate]);

    if (!bot) {
        return (
            <div className="mx_BotWikiView mx_BotWikiView--empty">
                <div className="mx_BotWikiView_emptyState">
                    <div className="mx_BotWikiView_emptyIcon">&#x1F4DA;</div>
                    <h2>Wiki de Bots</h2>
                    <p>Selecciona un bot del panel lateral para ver su documentacion.</p>
                </div>
            </div>
        );
    }

    const statusLabel = STATUS_LABELS[bot.status] ?? bot.status;
    const rendered = content ? renderMarkdown(content) : null;

    return (
        <div className="mx_BotWikiView">
            <div className="mx_BotWikiView_header">
                <div className="mx_BotWikiView_headerLeft">
                    <div className="mx_BotWikiView_avatar">
                        {bot.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="mx_BotWikiView_botName">{bot.name}</h1>
                        <div className="mx_BotWikiView_meta">
                            <span className="mx_BotWikiView_badge mx_BotWikiView_badge--role">
                                {bot.role}
                            </span>
                            <span className="mx_BotWikiView_badge mx_BotWikiView_badge--type">
                                {bot.bot_type}
                            </span>
                            <span className="mx_BotWikiView_badge mx_BotWikiView_badge--status">
                                {statusLabel}
                            </span>
                        </div>
                        <div className="mx_BotWikiView_matrixId">{bot.matrix_user_id}</div>
                    </div>
                </div>
                <button
                    className="mx_BotWikiView_refresh"
                    onClick={() => { WikiStore.invalidateCache(bot.id); WikiStore.fetchWiki(bot.id); }}
                    title="Recargar wiki"
                >
                    ↻
                </button>
            </div>

            <div className="mx_BotWikiView_content">
                {content === null ? (
                    <div className="mx_BotWikiView_loading">Cargando wiki...</div>
                ) : content === "" ? (
                    <div className="mx_BotWikiView_emptyWiki">
                        <p>Este bot no tiene wiki configurada.</p>
                        <p>Usa <code>PUT /api/bots/{bot.id}/wiki</code> para añadir contenido.</p>
                    </div>
                ) : (
                    <div
                        className="mx_BotWikiView_markdown"
                        dangerouslySetInnerHTML={{ __html: `<p>${rendered}</p>` }}
                    />
                )}
            </div>
        </div>
    );
};

export default BotWikiView;
