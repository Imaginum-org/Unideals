// This is global error handling middleware

const errorMiddleware = (err, req, res, next) => {
  console.error("Error:", err);

  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose Bad ObjectId Error
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue).join(", ");
    message = `Duplicate value for field(s): ${field}`;
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // JWT Errors (if using JWT)
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Final response - never expose internals in production
  const isProd = process.env.NODE_ENV === "production";
  res.status(statusCode).json({
    success: false,
    message: isProd && statusCode >= 500 ? "Internal Server Error" : message,
    ...(!isProd && { stack: err.stack }),
  });
};

export default errorMiddleware;
