class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // invalid object ID in MongoDB
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // MongoDB ValidationError
  if (err.name === "ValidationError") {
    err = handleValidationError(err);
  }

  // JSON Web Token errors
  if (err.name === "JsonWebTokenError") {
    const message = "JSON Web Token is invalid, Please try again";
    err = new ErrorHandler(message, 400);
  }
  if (err.name === "TokenExpiredError") {
    const message = "JSON Web Token is expired, Please try again";
    err = new ErrorHandler(message, 400);
  }

  // duplicate key errors (MongoDB)
  if (err.code === 11000) {
    const message = `Duplicate ${
      err.keyValue ? Object.keys(err.keyValue)[0] : "entry"
    } entered`;
    err = new ErrorHandler(message, 400);
  }

  // MongoDB NetworkError
  if (err.name === "MongoNetworkError") {
    const message = "Database connection error. Please try again later.";
    err = new ErrorHandler(message, 503); // 503 is Service Unavailable
  }

  // Zod Validation Errors
  if (err.name === "ZodError") {
    const message = err.errors
      .map((error) => `${error.path.join(".")}: ${error.message}`)
      .join(", ");
    err = new ErrorHandler(message, 422); // 422 is Unprocessable Entity
  }

  // Handle unhandled promise rejections (global)
  if (err instanceof Error && !err.statusCode) {
    console.error(`Unhandled Error: ${err.message}`);
    err = new ErrorHandler(
      "Something went wrong. Please try again later.",
      500
    );
  }

  // Handle Unauthorized (401) or Forbidden (403) errors
  if (err.name === "UnauthorizedError") {
    const message = "Unauthorized access. Please login.";
    err = new ErrorHandler(message, 401);
  }

  if (err.name === "ForbiddenError") {
    const message = "You do not have permission to access this resource.";
    err = new ErrorHandler(message, 403);
  }

  // Handle Async Errors
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    // malformed JSON in the request body
    err = new ErrorHandler("Invalid JSON format", 400);
  }

  // Send response with standardized error structure
  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
    // stack trace only in development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// Global handler for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Here you can log the error or even stop the application if it's a critical issue
  process.exit(1); // Exit the process with failure code
});

// Global handler for uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
  // Log and shutdown gracefully (e.g., wait for ongoing requests to finish)
  process.exit(1); // Exit the process with failure code
});

module.exports = {
  ErrorHandler,
  errorMiddleware,
};
