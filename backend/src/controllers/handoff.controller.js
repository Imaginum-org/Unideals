import {
  createHandoff,
  getHandoffStatus,
  addHandoffPhotos,
} from "../services/handoff.service.js";

// POST /api/handoff — desktop creates a pairing session (auth).
export const createHandoffSession = async (req, res) => {
  try {
    // Desktop passes how many more photos may come from the phone given
    // what's already attached on the laptop (clamped 1–3 server-side).
    const maxFiles = Number.parseInt(req.body?.max_files, 10);
    const result = await createHandoff(
      req.userId,
      Number.isInteger(maxFiles) ? maxFiles : undefined,
    );
    return res.status(201).json({
      success: true,
      message: "Photo session created. Scan the QR with your phone.",
      data: {
        code: result.code,
        url: result.url,
        secret: result.secret,
        maxFiles: result.maxFiles,
        expiresAt: result.expiresAt,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Unable to create photo session",
    });
  }
};

// GET /api/handoff/:code — desktop polls for new phone photos (auth + owner).
export const getHandoffSession = async (req, res) => {
  try {
    const data = await getHandoffStatus({
      code: req.params.code,
      userId: req.userId,
    });
    return res.status(200).json({
      success: true,
      message: "Photo session status",
      data,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message:
        err.statusCode && err.statusCode < 500
          ? err.message
          : "Unable to load photo session",
      ...(err.code ? { code: err.code } : {}),
    });
  }
};

// POST /api/handoff/:code/photos — phone uploads (QR-secret auth, no login).
export const uploadHandoffPhotos = async (req, res) => {
  try {
    // Secret via header or body — never the query string, which persists
    // in browser history, proxy logs, Referer headers, and server logs.
    const secret = req.headers["x-handoff-secret"] || req.body?.k;
    const result = await addHandoffPhotos({
      code: req.params.code,
      secret,
      files: req.files,
    });
    return res.status(201).json({
      success: true,
      message: "Photos uploaded. They are now attached to your listing draft.",
      data: result,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message:
        err.statusCode && err.statusCode < 500
          ? err.message
          : "Photo upload failed",
      ...(err.code ? { code: err.code } : {}),
    });
  }
};
