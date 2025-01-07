const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    user: String,
    email: String,
    passsword: {
      type: String,
      minLenght: [6, "Password must have atleast 6 characters"],
      maxLenght: [32, "Password cannot have more than 32 characters"],
    },
    phone: String,
    accountVerified: { type: Boolean, default: false },
    verificationCode: String,
    verificationCodeExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("passsword")) {
    next();
  }
  this.passsword = await bcrypt.hash(this.passsword, 10);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passsword);
};

userSchema.methods.generateVerificationCode = function () {
  const otp = Math.floor(100000 + Math.random() * 900000);
  this.verificationCode = otp;
  this.verificationCodeExpire = Date.now() + 5 * 60 * 1000;
  return otp;
};

module.exports = mongoose.model("User", userSchema);
