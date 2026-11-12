import mongoose from "mongoose";

const { Schema } = mongoose;

// Signed-in students' chats with the Unideals AI assistant (guests are never
// stored). Text is masked before saving (see utils/maskPersonalInfo.js);
// photos and voice recordings are never stored, only that one was sent.
// A conversation is erased automatically 90 days after its last message.
export const ASSISTANT_HISTORY_DAYS = 90;
export const MAX_STORED_MESSAGES = 200;

const productSnapshotSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, ref: "Product" },
    title: String,
    selling_price: Number,
    original_price: Number,
    image: String,
    condition: String,
    conditionLabel: String,
    is_boosted: Boolean,
  },
  { _id: false },
);

const assistantMessageSchema = new Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  text: { type: String, default: "", maxlength: 4000 },
  // "image" | "audio" when the student attached one (the file itself isn't kept).
  media: { type: String, enum: ["image", "audio", null], default: null },
  intent: { type: String, default: null },
  // Whether Gemini wrote the reply, and which model (quality tracking).
  ai_powered: { type: Boolean, default: false },
  model: { type: String, default: null },
  latency_ms: { type: Number, default: null },
  products: { type: [productSnapshotSchema], default: undefined },
  // Cards and follow-ups shown with the reply (estimate, draft, route...).
  extras: { type: Schema.Types.Mixed, default: undefined },
  feedback: { type: String, enum: ["up", "down", null], default: null },
  feedback_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
});

const assistantConversationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "New chat", maxlength: 80 },
    // True while the title is just a greeting ("hi"); the next real question replaces it.
    title_is_placeholder: { type: Boolean, default: false },
    messages: { type: [assistantMessageSchema], default: [] },
    message_count: { type: Number, default: 0 },
    last_active_at: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

assistantConversationSchema.index({ user_id: 1, last_active_at: -1 });
assistantConversationSchema.index({ last_active_at: 1 }, { expireAfterSeconds: ASSISTANT_HISTORY_DAYS * 24 * 60 * 60 });

export default mongoose.models.AssistantConversation ||
  mongoose.model("AssistantConversation", assistantConversationSchema);
