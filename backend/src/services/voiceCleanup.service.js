import Message from "../models/message.model.js";
import { MESSAGE_TYPE } from "../config/constants.js";
import { VOICE_TAG, bulkDeleteImages, listTaggedFiles } from "../utils/imagekit.js";

const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;
const PAGE = 1000;
const MAX_PAGES = 20; // bounded run: at most 20k files inspected per sweep

/**
 * Daily: delete voice uploads that were never sent. A client can upload
 * then abandon (closed tab, failed send, or abuse), so anything tagged
 * "voice", older than a day and not referenced by a message goes. One
 * indexed $in per page (audio.file_id), one bulk delete per 100 files.
 */
export const sweepOrphanVoiceFiles = async () => {
  if (!process.env.IMAGEKIT_PRIVATE_KEY) return { skipped: 1 };
  const cutoff = Date.now() - ORPHAN_AGE_MS;
  let checked = 0;
  let deleted = 0;
  let skip = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const files = (await listTaggedFiles(VOICE_TAG, { limit: PAGE, skip })) || [];
    if (!files.length) break;
    // Sorted oldest first: once files are younger than the cutoff, stop.
    const old = files.filter((f) => f?.fileId && new Date(f.createdAt).getTime() < cutoff);
    checked += old.length;
    if (old.length) {
      const used = await Message.find({ "audio.file_id": { $in: old.map((f) => f.fileId) } })
        .select("audio.file_id")
        .lean();
      const usedSet = new Set(used.map((m) => m.audio?.file_id));
      const orphans = old.filter((f) => !usedSet.has(f.fileId)).map((f) => f.fileId);
      deleted += await bulkDeleteImages(orphans);
      // Deleted files drop out of the listing, so only skip the kept ones.
      skip += old.length - orphans.length;
    }
    if (old.length < files.length || files.length < PAGE) break;
  }
  return { checked, deleted };
};

/** Both sides deleted the chat: its voice files are unreachable, remove them. */
export const deleteConversationVoiceFiles = async (conversationId) => {
  const rows = await Message.find({ conversation_id: conversationId, message_type: MESSAGE_TYPE.AUDIO })
    .select("audio.file_id")
    .lean();
  return bulkDeleteImages(rows.map((r) => r.audio?.file_id).filter(Boolean));
};
