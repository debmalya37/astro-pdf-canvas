import mongoose from 'mongoose';

const PresetSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  isGlobal: { type: Boolean, default: false },
  frontCovers: [{ type: String }], // Array of Cloudinary URLs
  backCover: {
    image: { type: String }, // Cloudinary URL
    url: { type: String }    // Clickable Hyperlink
  },
  insertPositions: [{ type: Number }],
  insertedPages: { type: Map, of: String }, // Map of index -> Cloudinary URL
  themeColors: {
    black: String,
    red: String,
    green: String
  },
  canvasBgColor: String,
  borderConfig: {
    color: String,
    size: Number
  },
  logoBase64: String // Reused for Cloudinary URL to prevent breaking existing state
}, { timestamps: true });

export default mongoose.models.Preset || mongoose.model('Preset', PresetSchema);