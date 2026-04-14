function notFoundHandler(request, response) {
  response.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${request.method} ${request.originalUrl} was not found`,
    status: 404,
  });
}

function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  const status = error.status || error.response?.status || 500;
  const code = error.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  const message = error.message || 'Unexpected server error';

  response.status(status).json({
    error: code,
    message,
    status,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
