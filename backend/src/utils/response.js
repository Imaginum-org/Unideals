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

// 500-path message masking: expected 4xx messages pass through, but
// anything else becomes a generic message so DB/driver internals
// (collection names, E11000 keys, mailer errors) never reach clients.
export const safeErrorMessage = (error, fallback = "Internal server error") => {
  const status = error?.statusCode || error?.status;
  if (status && Number(status) < 500) return error.message || fallback;
  return fallback;
};

export const forwardServiceError = (error, next) => {
  if (!error.statusCode) {
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
  }
  next(error);
};
