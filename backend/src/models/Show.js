import mongoose from 'mongoose';

const showSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: [true, 'Movie reference is required'],
      index: true,
    },
    cinema: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cinema',
      required: [true, 'Cinema reference is required'],
      index: true,
    },
    screenName: {
      type: String,
      required: true,
      default: 'Audi 1 - Dolby Atmos',
    },
    startTime: {
      type: Date,
      required: [true, 'Show start time is required'],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, 'Show end time is required'],
    },
    format: {
      type: String,
      enum: ['2D', '3D', 'IMAX 2D', 'IMAX 3D', '4DX'],
      default: '2D',
    },
    language: {
      type: String,
      default: 'English',
    },
    pricing: {
      standard: { type: Number, default: 220 },
      premium: { type: Number, default: 350 },
      vip: { type: Number, default: 520 },
    },
    totalSeats: {
      type: Number,
      default: 60,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookup of shows by movie and date
showSchema.index({ movie: 1, startTime: 1 });
showSchema.index({ cinema: 1, startTime: 1 });

export const Show = mongoose.model('Show', showSchema);
