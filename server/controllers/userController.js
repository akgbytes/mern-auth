const { ErrorHandler } = require("../middlewares/error");
const catchAsyncError = require("../middlewares/catchAsyncError");
const User = require("../models/user");
const sendEmail = require("../utils/sendEmail");
const client = require("../configs/twilio");
const sendToken = require("../utils/sendToken");

const register = catchAsyncError(async (req, res, next) => {
  try {
    const { user, password, phone, email, verificationMethod } = req.body;

    if (!user || !password || !phone || !email || !verificationMethod) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    function validatePhoneNumber(phone) {
      const phoneRegex = /^\+91\d{10}$/;
      return phoneRegex.test(phone);
    }

    if (!validatePhoneNumber(phone)) {
      return next(new ErrorHandler("Invalid phone number", 400));
    }

    const existingUser = await User.findOne({
      $or: [
        {
          email,
          accountVerified: true,
        },
        {
          phone,
          accountVerified: true,
        },
      ],
    });

    if (existingUser) {
      return next(
        new ErrorHandler(
          "Phone or Email is already registered, Please try to log in",
          400
        )
      );
    }

    const registrationAttemptsByUser = await User.find({
      $or: [
        {
          email,
          accountVerified: false,
        },
        {
          phone,
          accountVerified: false,
        },
      ],
    });

    if (registrationAttemptsByUser.length > 3) {
      return next(
        new ErrorHandler(
          "Registration attempts exceeded, Please try again after sometime",
          400
        )
      );
    }

    const newUser = await User.create({ user, email, phone, password });
    const verificationCode = newUser.generateVerificationCode();
    await newUser.save();

    sendVerificationCode(
      verificationMethod,
      verificationCode,
      email,
      phone,
      res
    );
  } catch (error) {
    next(error);
  }
});

async function sendVerificationCode(
  verificationMethod,
  verificationCode,
  email,
  phone,
  res
) {
  try {
    if (verificationMethod === "email") {
      const message = generateEmailTemplate(verificationCode);
      sendEmail({ email, subject: "Your verification code", message });
      res.status(200).json({
        success: true,
        message: `Verification code successfully sent on ${email}`,
      });
    } else if (verificationMethod === "phone") {
      await client.verify.v2
        .services(process.env.TWILIO_SERVICE_SID)
        .verifications.create({
          channel: "sms",
          to: phone,
          customCode: verificationCode,
        });
      res.status(200).json({
        success: true,
        message: `OTP sent on ${phone}`,
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Invalid verification method`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

const generateEmailTemplate = (verificationCode) => {
  return `<p>Dear User,</p>
      <p>Thank you for registering with us! To complete your registration and verify your email address, please use the following code:</p>
      <h2><strong>${verificationCode}</strong></h2>
      <p>If you didn't request this verification, please ignore this email. Your email address will remain unverified.</p>
      <p>If you need assistance, feel free to contact our support team.</p>
      <br>
      <p>Best regards,</p>
      <p>Your Company Name</p>
      <p>Your Company Contact Information</p>`;
};

const verifyRegister = catchAsyncError(async (req, res, next) => {
  const { phone, email, otp } = req.body;
  function validatePhoneNumber(phone) {
    const phoneRegex = /^\+91\d{10}$/;
    return phoneRegex.test(phone);
  }

  if (!validatePhoneNumber(phone)) {
    return next(new ErrorHandler("Invalid phone number", 400));
  }

  try {
    const userAllEntries = await User.find({
      $or: [
        {
          email,
          accountVerified: false,
        },
        {
          phone,
          accountVerified: false,
        },
      ],
    }).sort({ createdAt: -1 });

    if (!userAllEntries.length) {
      return next(new ErrorHandler("User not found", 400));
    }

    let user;
    if (userAllEntries.length > 1) {
      user = userAllEntries[0];

      await User.deleteMany({
        _id: { $ne: user._id },
        $or: [
          { phone, accountVerified: false },
          {
            email,
            accountVerified: false,
          },
        ],
      });
    } else {
      user = userAllEntries[0];
    }

    if (user.verificationCode !== otp) {
      return next(new ErrorHandler("Invalid OTP", 400));
    }

    const currentTime = Date.now();
    const verificationCodeExpireTime = new Date(
      user.verificationCodeExpire
    ).getTime();
    if (currentTime > verificationCodeExpireTime) {
      return next(new ErrorHandler("OTP expired", 400));
    }

    user.accountVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpire = null;

    await user.save({ validateModifiedOnly: true });

    sendToken(user, 200, "User verified successfully", res);
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
});

const login = catchAsyncError((req, res, next) => {});
const verifyLogin = catchAsyncError((req, res, next) => {});

module.exports = {
  register,
  verifyRegister,
  login,
  verifyLogin,
};
