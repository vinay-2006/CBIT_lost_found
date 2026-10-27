import bcrypt from 'bcryptjs';
import { Student } from '../models/Student.js';
import { isDatabaseConnected } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { signToken } from '../middleware/auth.js';

// In-memory student store for test/dev fallback
let memoryStudents = [];

/**
 * Seed initial mock accounts into memory store
 */
async function initializeMemoryStore() {
  if (memoryStudents.length === 0) {
    const studentPass = await bcrypt.hash('Password123', 10);
    const adminPass = await bcrypt.hash('AdminPassword123', 10);

    memoryStudents = [
      {
        id: 'user-demo-student',
        name: 'Rahul Sharma',
        email: 'student@cbit.ac.in',
        rollNo: '23A91A0501',
        password: studentPass,
        role: 'student',
        isEmailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'admin-live-1',
        name: 'CBIT Portal Administrator',
        email: 'admin@cbit.ac.in',
        rollNo: 'ADMIN0001',
        password: adminPass,
        role: 'admin',
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

// Initial seed
initializeMemoryStore();

export class AuthService {
  /**
   * Reset in-memory student store for test isolation
   */
  static resetMemoryStore() {
    memoryStudents = [];
    return initializeMemoryStore();
  }

  /**
   * Sanitize student object to exclude password and MongoDB internals
   */
  static sanitizeStudent(student) {
    if (!student) return null;
    const obj = typeof student.toObject === 'function' ? student.toObject() : { ...student };
    const id = obj.id || (obj._id ? obj._id.toString() : undefined);
    delete obj._id;
    delete obj.__v;
    delete obj.password;
    return { ...obj, id };
  }

  /**
   * Generate JWT token for an authenticated student
   */
  static generateToken(student) {
    const sanitized = this.sanitizeStudent(student);
    const payload = {
      id: sanitized.id,
      email: sanitized.email,
      rollNo: sanitized.rollNo,
      name: sanitized.name,
      role: sanitized.role || 'student'
    };
    return signToken(payload, '7d');
  }

  /**
   * Register a new student account
   */
  static async register({ name, email, rollNo, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRollNo = rollNo.trim().toUpperCase();

    if (isDatabaseConnected()) {
      // Check for duplicate account by email or rollNo
      const existing = await Student.findOne({
        $or: [{ email: normalizedEmail }, { rollNo: normalizedRollNo }]
      }).lean();

      if (existing) {
        if (existing.email.toLowerCase() === normalizedEmail) {
          throw new AppError('An account with this institutional email address already exists.', 409);
        }
        if (existing.rollNo.toUpperCase() === normalizedRollNo) {
          throw new AppError('An account with this roll number already exists.', 409);
        }
      }

      // Create student document (pre-save hook hashes password)
      const student = await Student.create({
        name: name.trim(),
        email: normalizedEmail,
        rollNo: normalizedRollNo,
        password,
        role: 'student',
        isEmailVerified: false
      });

      const sanitized = this.sanitizeStudent(student);
      const token = this.generateToken(sanitized);
      return { student: sanitized, token };
    }

    // In-Memory Fallback
    await initializeMemoryStore();
    const duplicate = memoryStudents.find(
      (s) => s.email.toLowerCase() === normalizedEmail || s.rollNo.toUpperCase() === normalizedRollNo
    );

    if (duplicate) {
      if (duplicate.email.toLowerCase() === normalizedEmail) {
        throw new AppError('An account with this institutional email address already exists.', 409);
      }
      if (duplicate.rollNo.toUpperCase() === normalizedRollNo) {
        throw new AppError('An account with this roll number already exists.', 409);
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent = {
      id: `student-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim(),
      email: normalizedEmail,
      rollNo: normalizedRollNo,
      password: hashedPassword,
      role: 'student',
      isEmailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memoryStudents.push(newStudent);
    const sanitized = this.sanitizeStudent(newStudent);
    const token = this.generateToken(sanitized);
    return { student: sanitized, token };
  }

  /**
   * Authenticate student with email and password
   */
  static async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    if (isDatabaseConnected()) {
      const student = await Student.findOne({ email: normalizedEmail });
      if (!student) {
        throw new AppError('Invalid institutional email or password.', 401);
      }

      const isMatch = await student.comparePassword(password);
      if (!isMatch) {
        throw new AppError('Invalid institutional email or password.', 401);
      }

      const sanitized = this.sanitizeStudent(student);
      const token = this.generateToken(sanitized);
      return { student: sanitized, token };
    }

    // In-Memory Fallback
    await initializeMemoryStore();
    const student = memoryStudents.find((s) => s.email.toLowerCase() === normalizedEmail);
    if (!student) {
      throw new AppError('Invalid institutional email or password.', 401);
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      throw new AppError('Invalid institutional email or password.', 401);
    }

    const sanitized = this.sanitizeStudent(student);
    const token = this.generateToken(sanitized);
    return { student: sanitized, token };
  }

  /**
   * Retrieve student account by ID
   */
  static async getStudentById(id) {
    if (isDatabaseConnected()) {
      const student = await Student.findById(id).lean();
      if (!student) {
        throw new AppError('Student account not found.', 404);
      }
      return this.sanitizeStudent(student);
    }

    await initializeMemoryStore();
    const student = memoryStudents.find((s) => s.id === id);
    if (!student) {
      throw new AppError('Student account not found.', 404);
    }
    return this.sanitizeStudent(student);
  }

  /**
   * Change student account password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    if (isDatabaseConnected()) {
      const student = await Student.findById(userId);
      if (!student) {
        throw new AppError('Student account not found.', 404);
      }

      const isMatch = await student.comparePassword(currentPassword);
      if (!isMatch) {
        throw new AppError('Incorrect current password.', 400);
      }

      student.password = newPassword;
      await student.save();
      return { message: 'Password updated successfully.' };
    }

    // In-memory fallback
    await initializeMemoryStore();
    const student = memoryStudents.find((s) => s.id === userId);
    if (!student) {
      throw new AppError('Student account not found.', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      throw new AppError('Incorrect current password.', 400);
    }

    student.password = await bcrypt.hash(newPassword, 10);
    student.updatedAt = new Date().toISOString();
    return { message: 'Password updated successfully.' };
  }
}
