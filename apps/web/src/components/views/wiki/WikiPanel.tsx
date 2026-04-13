/*
 * WikiPanel - Sidebar panel showing the list of registered bots.
 * Replaces the room list when Wiki mode is active.
 */
import React, { useEffect, useState, useCallback } from "react";
import WikiStore, { BotInfo } from "./WikiStore";
import "./wiki.css";

const STATUS_COLORS: Record<string, string> = {
    running: "#0dbd8b",
    stopped: "#ff5b55",
    starting: "#f8b739",
};

const BotListItem: React.FC<{ bot: BotInfo; selected: boolean; onClick: () => void }> = ({
    bot,
    selected,
    onClick,
}) => {
    const initials = bot.name.slice(0, 2).toUpperCase();
    const statusColor = STATUS_COLORS[bot.status] ?? "#888";

    return (
        <div
            className={`mx_WikiPanel_botItem${selected ? " mx_WikiPanel_botItem--selected" : ""}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onClick()}
        >
            <div className="mx_WikiPanel_avatar" aria-hidden>
                {initials}
            </div>
            <div className="mx_WikiPanel_botInfo">
                <div className="mx_WikiPanel_botName">{bot.name}</div>
                <div className="mx_WikiPanel_botRole">{bot.role}</div>
            </div>
            <div
                className="mx_WikiPanel_statusDot"
                title={bot.status}
                style={{ backgroundColor: statusColor }}
            />
        </div>
    );
};

const WikiPanel: React.FC = () => {
    const [bots, setBots] = useState<BotInfo[]>(WikiStore.getBots());
    const [selectedId, setSelectedId] = useState<string | null>(WikiStore.getSelectedBotId());
    const [loading, setLoading] = useState(WikiStore.isLoading());
    const [error, setError] = useState<string | null>(WikiStore.getError());

    const refresh = useCallback(() => {
        setBots(WikiStore.getBots());
        setSelectedId(WikiStore.getSelectedBotId());
        setLoading(WikiStore.isLoading());
        setError(WikiStore.getError());
    }, []);

    useEffect(() => {
        WikiStore.on("update", refresh);
        WikiStore.on("selection_update", refresh);
        WikiStore.fetchBots();

        // Auto-refresh each 30s
        const interval = setInterval(() => WikiStore.fetchBots(), 30_000);
        return () => {
            WikiStore.off("update", refresh);
            WikiStore.off("selection_update", refresh);
            clearInterval(interval);
        };
    }, [refresh]);

    return (
        <div className="mx_WikiPanel">
            <div className="mx_WikiPanel_header">
                <span className="mx_WikiPanel_title">Wiki de Bots</span>
                <button
                    className="mx_WikiPanel_refresh"
                    onClick={() => { WikiStore.invalidateCache(); WikiStore.fetchBots(); }}
                    title="Actualizar lista"
                    aria-label="Actualizar lista de bots"
                >
                    ↻
                </button>
            </div>

            {loading && bots.length === 0 && (
                <div className="mx_WikiPanel_state">Cargando bots...</div>
            )}
            {error && (
                <div className="mx_WikiPanel_state mx_WikiPanel_state--error">
                    Error: {error}
                </div>
            )}
            {!loading && !error && bots.length === 0 && (
                <div className="mx_WikiPanel_state">
                    No hay bots registrados.
                </div>
            )}

            <div className="mx_WikiPanel_list">
                {bots.map((bot) => (
                    <BotListItem
                        key={bot.id}
                        bot={bot}
                        selected={bot.id === selectedId}
                        onClick={() => WikiStore.selectBot(bot.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default WikiPanel;
