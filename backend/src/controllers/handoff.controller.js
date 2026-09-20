import {
  createHandoff,
  getHandoffStatus,
  addHandoffPhotos,
} from "../services/handoff.service.js";

// POST /api/handoff — desktop creates a pairing session (auth).
export const createHandoffSession = async (req, res) => {
  try {
    const result = await createHandoff(req.userId);
    return res.status(201).json({
      success: true,
      message: "Photo session created. Scan the QR with your phone.",
      data: {
        code: result.code,
        url: result.url,
        secret: result.secret,
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
    const secret = req.query.k || req.body?.k;
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
