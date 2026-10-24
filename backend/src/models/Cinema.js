import mongoose from 'mongoose';

const screenSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    screenType: {
      type: String,
      enum: ['IMAX 3D', '4DX', 'Dolby Atmos', 'Standard Gold'],
      default: 'Dolby Atmos',
    },
    totalSeats: {
      type: Number,
      default: 60,
    },
  },
  { _id: true }
);

const cinemaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Cinema name is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Cinema location is required'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      index: true,
    },
    screens: [screenSchema],
  },
  {
    timestamps: true,
  }
);

export const Cinema = mongoose.model('Cinema', cinemaSchema);
