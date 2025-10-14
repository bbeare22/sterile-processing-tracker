const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // increased from 6 → 8
    password: { type: String, required: true, minlength: 8, select: false },
    name: { type: String, required: true, trim: true },
    employeeId: { type: String, trim: true },
    sterilizationNumber: { type: String, trim: true },
    role: {
      type: String,
      enum: ["tech", "lead", "admin"],
      default: "tech",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    email: this.email,
    name: this.name,
    employeeId: this.employeeId || "",
    sterilizationNumber: this.sterilizationNumber || "",
    role: this.role || "tech",
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("User", userSchema);
