export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(', ');
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const keys = Object.keys(err.keyPattern || {});
    if (keys.includes('show') && keys.includes('seatNumber')) {
      message = 'One or more of the selected seats were just claimed by another user.';
    } else if (keys.includes('email')) {
      message = 'An account with this email address already exists.';
    } else {
      message = `Conflict: Duplicate value for ${keys.join(', ')}`;
    }
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format: ${err.value}`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    takenSeats: err.takenSeats || undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
