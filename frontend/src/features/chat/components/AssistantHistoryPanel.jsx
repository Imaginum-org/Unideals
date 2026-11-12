import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { deleteAllAssistantChats, deleteAssistantChat, listAssistantChats } from "../api/assistantApi.js";

const timeAgo = (date) => {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/**
 * "Recent chats" inside the assistant panel (signed-in students): reopen a
 * chat, delete one, or delete them all.
 */
const AssistantHistoryPanel = ({ activeId, onOpen, onClose, onDeleted }) => {
  const [chats, setChats] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);

  useEffect(() => {
    let alive = true;
    listAssistantChats()
      .then((rows) => alive && setChats(rows))
      .catch(() => alive && setError("Couldn't load your chats. Try again in a bit."));
    return () => {
      alive = false;
    };
  }, []);

  const removeOne = async (id) => {
    setBusyId(id);
    try {
      await deleteAssistantChat(id);
      setChats((rows) => rows.filter((row) => row.id !== id));
      onDeleted?.([id]);
    } catch {
      setError("Couldn't delete that chat. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const removeAll = async () => {
    setBusyId("all");
    try {
      await deleteAllAssistantChats();
      onDeleted?.((chats || []).map((row) => row.id));
      setChats([]);
      setConfirmAll(false);
    } catch {
      setError("Couldn't delete your chats. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#F8F9FC] dark:bg-[#121418]" role="region" aria-label="Recent chats">
      <div className="flex items-center gap-2 border-b border-slate-200/70 bg-white/90 px-3 py-3 dark:border-zinc-800 dark:bg-[#16181C]/95">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          aria-label="Back to chat"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h3 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">Recent chats</h3>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
        {error && <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        {chats === null && !error && (
          <div className="flex justify-center py-10 text-slate-400" role="status" aria-label="Loading chats">
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
          </div>
        )}
        {chats?.length === 0 && (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <MessageSquare className="mb-2 h-6 w-6 text-slate-300 dark:text-zinc-600" />
            <p className="text-[13.5px] font-semibold text-slate-700 dark:text-zinc-200">No saved chats yet</p>
            <p className="mt-1 text-[12.5px] text-slate-500 dark:text-zinc-400">Your chats with Unideals AI show up here.</p>
          </div>
        )}
        <ul className="space-y-1.5">
          {chats?.map((chat) => (
            <li key={chat.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpen(chat.id)}
                className={`min-w-0 flex-1 rounded-2xl border px-3 py-2.5 text-left transition ${
                  chat.id === activeId
                    ? "border-indigo-300 bg-indigo-50/70 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                    : "border-slate-200/80 bg-white hover:border-indigo-200 dark:border-zinc-800 dark:bg-[#1B1D22] dark:hover:border-indigo-500/40"
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{chat.title}</span>
                  <span className="shrink-0 text-[11px] text-slate-400 dark:text-zinc-500">{timeAgo(chat.lastActiveAt)}</span>
                </span>
                {chat.preview && <span className="mt-0.5 block truncate text-[12px] text-slate-500 dark:text-zinc-400">{chat.preview}</span>}
              </button>
              <button
                type="button"
                onClick={() => removeOne(chat.id)}
                disabled={busyId !== null}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:text-zinc-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                aria-label={`Delete chat: ${chat.title}`}
                title="Delete chat"
              >
                {busyId === chat.id ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-slate-200/70 bg-white/90 px-4 py-3 text-center dark:border-zinc-800 dark:bg-[#16181C]/95">
        <p className="text-[11.5px] leading-snug text-slate-500 dark:text-zinc-400">
          Chats are kept for 90 days after your last message. Phone numbers, UPI IDs and emails are hidden, and photos or voice notes aren&apos;t saved.
        </p>
        {!!chats?.length &&
          (confirmAll ? (
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-[12.5px] font-medium text-slate-700 dark:text-zinc-200">Delete all {chats.length} chats?</span>
              <button
                type="button"
                onClick={removeAll}
                disabled={busyId !== null}
                className="rounded-full bg-rose-600 px-3 py-1 text-[12px] font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {busyId === "all" ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmAll(false)}
                className="rounded-full px-3 py-1 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmAll(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete all my AI chats
            </button>
          ))}
      </div>
    </div>
  );
};

export default AssistantHistoryPanel;
