import mongoose from 'mongoose';

const CATEGORIES = ['Electronics', 'Documents', 'Books', 'Accessories', 'Others'];
const TYPES = ['lost', 'found'];
const STATUSES = ['active', 'resolved'];

const itemSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    type: {
      type: String,
      required: [true, 'Type is required (lost or found)'],
      enum: {
        values: TYPES,
        message: "Type must be either 'lost' or 'found'"
      },
      index: true
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [255, 'Item name cannot exceed 255 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: CATEGORIES,
        message: `Category must be one of: ${CATEGORIES.join(', ')}`
      },
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [255, 'Location cannot exceed 255 characters']
    },
    date: {
      type: String,
      required: [true, 'Date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true
    },
    reportedBy: {
      type: String,
      required: [true, 'Reporter name is required'],
      trim: true,
      maxlength: [255, 'Reporter name cannot exceed 255 characters']
    },
    rollNo: {
      type: String,
      default: '',
      trim: true
    },
    contact: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Enter a valid email address']
    },
    image: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: STATUSES,
        message: "Status must be either 'active' or 'resolved'"
      },
      default: 'active',
      index: true
    },
    userId: {
      type: String,
      default: null,
      index: true
    },
    claimedBy: {
      userId: { type: String, default: null },
      name: { type: String, default: '' },
      rollNo: { type: String, default: '' },
      email: { type: String, default: '' },
      claimedAt: { type: Date, default: null }
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Conditional validation: rollNo is required for lost reports
itemSchema.pre('validate', function (next) {
  if (this.type === 'lost' && (!this.rollNo || this.rollNo.trim().length === 0)) {
    this.invalidate('rollNo', 'Roll number is required for lost item reports.');
  }
  next();
});

// Composite & search indexes
itemSchema.index({ type: 1, status: 1, category: 1 });
itemSchema.index({ date: -1, createdAt: -1 });
itemSchema.index({ itemName: 'text', description: 'text', location: 'text' });

export const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);
