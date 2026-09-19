export const successResponse = (
  res,
  message,
  data = null,
  status = 200,
  pagination = null,
) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(status).json(response);
};

export const errorResponse = (res, message, status = 500, errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(status).json(response);
};

// Map known service-layer errors (plain Errors) to HTTP codes before
// passing to the global handler. Unknown errors keep 500 + masked message.
export const forwardServiceError = (error, next) => {
  const msg = String(error.message || "");
  if (/not found/i.test(msg)) {
    error.statusCode = 404;
  } else if (
    /permission|limit reached|already boosted|already reported|already deleted|only active listed|cannot report/i.test(
      msg,
    )
  ) {
    error.statusCode = 400;
  }
  next(error);
};
