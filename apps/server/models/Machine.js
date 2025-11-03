const mongoose = require('mongoose');

const MachineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    model: { type: String, default: '' },
    type: {
      type: String,
      enum: ['washer', 'sterilizer', 'ultrasonic'],
      required: true,
    },
    location: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastDescaleAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MachineSchema.index({ type: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Machine', MachineSchema);
