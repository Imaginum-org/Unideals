import express from "express";

const router = express.Router();

// Messages live nested under /api/conversations/:id/messages.
// This router is kept so legacy imports don't break.
export default router;
