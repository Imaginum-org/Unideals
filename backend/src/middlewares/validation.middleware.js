export const validate = (schema) => (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    req.body = data;
    next();
  } catch (error) {
    const issues = error.issues || error.errors || [];
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: issues?.map((e) => ({
        field: Array.isArray(e.path) ? e.path.join(".") : String(e.path || ""),
        message: e.message,
      })),
    });
  }
};
