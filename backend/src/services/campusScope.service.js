import mongoose from "mongoose";
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import Report from "../models/Report.model.js";
import Deal from "../models/deal.model.js";
import Conversation from "../models/conversation.model.js";

/**
 * Campus limits for support staff.
 *
 * A scope is either null (every campus) or a non-empty array of campus
 * ObjectIds. Which campus a record belongs to:
 *   user     → user.campus_id
 *   listing  → product.campus_id
 *   order    → the buyer's or the seller's campus
 *   payment  → the paying user's campus
 *   report   → the reported listing's / user's campus; for help & support
 *              tickets, the reporter's campus
 * Records with no campus (legacy accounts, visitor tickets) are outside every
 * limited scope.
 */

const { ObjectId } = mongoose.Types;

export const outOfScope = (what = "Item") =>
  Object.assign(new Error(`${what} not found in your campuses`), { statusCode: 404 });

// Aggregation does no casting, so match both forms (legacy rows may hold the
// campus id as a string). Mongoose queries cast the strings back to ObjectIds,
// which is harmless.
export const campusIn = (scope) => ({ $in: [...scope, ...scope.map(String)] });

/** `{ $and: [...] }`-safe filter on a campus field; {} when unlimited. */
export const campusMatch = (scope, field = "campus_id") => (scope ? { [field]: campusIn(scope) } : {});

/** Adds the campus limit to an existing match without touching its other conditions. */
export const withCampusScope = (match, scope, field = "campus_id") => {
  if (!scope) return match;
  return { ...match, $and: [...(match.$and || []), { [field]: campusIn(scope) }] };
};

const campusOnly = [{ $project: { campus_id: 1 } }];

/** Deal pipeline stages: keep deals whose buyer or seller is in scope. */
export const dealScopeStages = (scope) =>
  scope
    ? [
        { $lookup: { from: Conversation.collection.name, localField: "conversation_id", foreignField: "_id", pipeline: [{ $project: { buyer_id: 1, seller_id: 1 } }], as: "_sc" } },
        { $lookup: { from: User.collection.name, localField: "_sc.buyer_id", foreignField: "_id", pipeline: campusOnly, as: "_sb" } },
        { $lookup: { from: User.collection.name, localField: "_sc.seller_id", foreignField: "_id", pipeline: campusOnly, as: "_ss" } },
        { $match: { $or: [{ "_sb.campus_id": campusIn(scope) }, { "_ss.campus_id": campusIn(scope) }] } },
        { $project: { _sc: 0, _sb: 0, _ss: 0 } },
      ]
    : [];

/** Payment pipeline stages: keep payments made by users in scope. */
export const paymentScopeStages = (scope) =>
  scope
    ? [
        { $lookup: { from: User.collection.name, localField: "user_id", foreignField: "_id", pipeline: campusOnly, as: "_su" } },
        { $match: { "_su.campus_id": campusIn(scope) } },
        { $project: { _su: 0 } },
      ]
    : [];

/** Report pipeline stages (run on raw reports, before any $group). */
export const reportScopeStages = (scope) =>
  scope
    ? [
        { $lookup: { from: Product.collection.name, localField: "target_id", foreignField: "_id", pipeline: campusOnly, as: "_sp" } },
        {
          $addFields: {
            _suid: {
              $switch: {
                branches: [
                  { case: { $eq: ["$target_model", "User"] }, then: "$target_id" },
                  { case: { $eq: ["$target_model", "Support"] }, then: "$reporter_id" },
                ],
                default: null,
              },
            },
          },
        },
        { $lookup: { from: User.collection.name, localField: "_suid", foreignField: "_id", pipeline: campusOnly, as: "_su" } },
        {
          $match: {
            $or: [
              { target_model: "Product", "_sp.campus_id": campusIn(scope) },
              { target_model: { $in: ["User", "Support"] }, "_su.campus_id": campusIn(scope) },
            ],
          },
        },
        { $project: { _sp: 0, _su: 0, _suid: 0 } },
      ]
    : [];

/** countDocuments, or the same count through scope stages. */
export const countScoped = (Model, match, stages = []) =>
  stages.length
    ? Model.aggregate([{ $match: match }, ...stages, { $count: "n" }]).then((rows) => rows[0]?.n || 0)
    : Model.countDocuments(match);

// ─── Single-item checks ────────────────────────────────────────────────────

const validId = (id) => (typeof id === "string" || id instanceof ObjectId) && ObjectId.isValid(String(id));

export const isUserInScope = async (scope, userId) =>
  !scope || (validId(userId) && Boolean(await User.exists({ _id: userId, campus_id: campusIn(scope) })));

export const isProductInScope = async (scope, productId) =>
  !scope || (validId(productId) && Boolean(await Product.exists({ _id: productId, campus_id: campusIn(scope) })));

export const isDealInScope = async (scope, dealId) => {
  if (!scope) return true;
  if (!validId(dealId)) return false;
  const rows = await Deal.aggregate([{ $match: { _id: new ObjectId(String(dealId)) } }, ...dealScopeStages(scope), { $limit: 1 }, { $project: { _id: 1 } }]);
  return rows.length > 0;
};

export const isReportTargetInScope = async (scope, targetId, targetModel) => {
  if (!scope) return true;
  if (!validId(targetId)) return false;
  if (targetModel === "Product") return isProductInScope(scope, targetId);
  if (targetModel === "User") return isUserInScope(scope, targetId);
  if (targetModel === "Support") {
    const ticket = await Report.findOne({ target_id: targetId, target_model: "Support" }).select("reporter_id").lean();
    return Boolean(ticket?.reporter_id) && isUserInScope(scope, ticket.reporter_id);
  }
  return false;
};

export const isCampusInScope = (scope, campusId) => !scope || scope.some((id) => String(id) === String(campusId));
