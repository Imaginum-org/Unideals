import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Deal from "../models/deal.model.js";
import User from "../models/User.model.js";
import { DEAL_STATUS } from "../config/constants.js";

/*
 * Profile overview numbers that only make sense from deals (sold listings
 * are deleted ~15 days after sale, so products alone undercount):
 * earnings by month, money spent, and deals waiting on this user.
 * One conversation lookup + one deal aggregation; cached per user.
 */

const TZ = "Asia/Kolkata";
const TTL_MS = 2 * 60 * 1000;
const MONTHS = 6;
const cache = new Map();

const IN_PROGRESS = [DEAL_STATUS.DEAL_CONFIRMED, DEAL_STATUS.PICKUP_SCHEDULED, DEAL_STATUS.PAYMENT_CONFIRMED];
// Whose move is it at each stage?
const SELLER_TURN = [DEAL_STATUS.DEAL_CONFIRMED, DEAL_STATUS.PICKUP_SCHEDULED];
const BUYER_TURN = [DEAL_STATUS.PAYMENT_CONFIRMED];

const monthKey = (d) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).format(d).slice(0, 7);

export const getInsights = async (userId) => {
  const key = String(userId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const uid = new mongoose.Types.ObjectId(key);
  const convs = await Conversation.find({ $or: [{ seller_id: uid }, { buyer_id: uid }] })
    .select("_id seller_id")
    .lean();
  const sellingConv = new Set(convs.filter((c) => String(c.seller_id) === key).map((c) => String(c._id)));

  const rows = convs.length
    ? await Deal.aggregate([
        {
          $match: {
            conversation_id: { $in: convs.map((c) => c._id) },
            status: { $in: [DEAL_STATUS.COMPLETED, ...IN_PROGRESS] },
          },
        },
        {
          $project: {
            conversation_id: 1,
            status: 1,
            price: { $ifNull: ["$current_price", "$original_price"] },
            month: { $dateToString: { format: "%Y-%m", date: { $ifNull: ["$completed_at", "$updatedAt"] }, timezone: TZ } },
          },
        },
      ])
    : [];

  const earnings = { total: 0, count: 0, thisMonth: 0, monthly: {} };
  const spent = { total: 0, count: 0 };
  const deals = { selling: 0, buying: 0, yourTurn: 0 };
  const nowKey = monthKey(new Date());

  rows.forEach((d) => {
    const selling = sellingConv.has(String(d.conversation_id));
    const price = Number(d.price) || 0;
    if (d.status === DEAL_STATUS.COMPLETED) {
      if (selling) {
        earnings.total += price;
        earnings.count += 1;
        earnings.monthly[d.month] = (earnings.monthly[d.month] || 0) + price;
        if (d.month === nowKey) earnings.thisMonth += price;
      } else {
        spent.total += price;
        spent.count += 1;
      }
      return;
    }
    if (selling) deals.selling += 1;
    else deals.buying += 1;
    if ((selling && SELLER_TURN.includes(d.status)) || (!selling && BUYER_TURN.includes(d.status))) deals.yourTurn += 1;
  });

  // Last N months, oldest first, zero-filled.
  const months = [];
  const cursor = new Date();
  cursor.setDate(15);
  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setMonth(cursor.getMonth() - i);
    const k = monthKey(d);
    months.push({ month: k, total: earnings.monthly[k] || 0 });
  }

  const me = await User.findById(uid).select("rating").lean();
  const data = {
    earnings: {
      total: earnings.total,
      count: earnings.count,
      thisMonth: earnings.thisMonth,
      average: earnings.count ? Math.round(earnings.total / earnings.count) : 0,
      months,
    },
    spent,
    deals,
    rating: { avg: me?.rating?.avg || 0, count: me?.rating?.count || 0 },
  };
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 5000) cache.delete(cache.keys().next().value);
  return data;
};
