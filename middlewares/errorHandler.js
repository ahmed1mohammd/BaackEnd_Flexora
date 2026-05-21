const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    // Beautifully colored error summary in terminal
    console.log('\x1b[41m\x1b[37m%s\x1b[0m', ' 💥 ERROR 💥 ');
    console.log('\x1b[31m%s\x1b[0m', `Message: ${err.message}`);
    console.log('\x1b[33m%s\x1b[0m', `Status: ${err.statusCode}`);
    console.log('\x1b[90m%s\x1b[0m', err.stack);

    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production mode
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went very wrong!'
      });
    }
  }
};

module.exports = errorHandler;
