import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// CBIT institutional email pattern: must end with @cbit.ac.in or @subdomain.cbit.ac.in
export const CBIT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)*cbit\.ac\.in$/i;

// Roll number pattern: alphanumeric, typically 10 to 12 characters (e.g. 23A91A0501, 160121733001)
export const ROLL_NO_REGEX = /^[0-9]{2}[A-Za-z0-9]{8,10}$/i;

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Student name is required.'],
      trim: true,
      maxlength: [255, 'Name cannot exceed 255 characters.']
    },
    email: {
      type: String,
      required: [true, 'Institutional email is required.'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        CBIT_EMAIL_REGEX,
        'Enter a valid CBIT institutional email address ending with @cbit.ac.in'
      ],
      index: true
    },
    rollNo: {
      type: String,
      required: [true, 'Roll number is required.'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [ROLL_NO_REGEX, 'Enter a valid student roll number (e.g. 23A91A0501 or 160121733001).'],
      index: true
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [8, 'Password must be at least 8 characters long.']
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student'
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      }
    }
  }
);

// Hash password before saving if modified
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password helper
studentSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
