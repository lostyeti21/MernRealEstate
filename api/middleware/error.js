export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null
  });
};

export const firebaseErrorHandler = (err, req, res, next) => {
  if (err.code && err.code.startsWith('storage/')) {
    console.error('Firebase Storage Error:', {
      code: err.code,
      message: err.message,
      serverResponse: err.serverResponse
    });
    return res.status(500).json({
      success: false,
      error: 'Firebase Storage Error',
      details: err.message
    });
  }
  next(err);
}; 