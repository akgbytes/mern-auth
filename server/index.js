require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./configs/db");
const { errorMiddleware } = require("./middlewares/error");
const userRouter = require("./routes/user");

// app configs
const PORT = process.env.PORT;
const app = express();
connectDB();

// middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

// routes
app.get("", (req, res) => {
  res.send("WELCOME TO OUR SERVER");
});

app.use("/api/v1/user", userRouter);

//error handling
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
