import { AuthService } from '../services/authService.js';
import { TOKEN_COOKIE_NAME, COOKIE_OPTIONS } from '../middleware/auth.js';

export async function register(req, res, next) {
  try {
    const { student, token } = await AuthService.register(req.body);

    res.cookie(TOKEN_COOKIE_NAME, token, COOKIE_OPTIONS);
    res.status(201).json({
      success: true,
      message: 'Student account registered successfully.',
      data: {
        student,
        token
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { student, token } = await AuthService.login(req.body);

    res.cookie(TOKEN_COOKIE_NAME, token, COOKIE_OPTIONS);
    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        student,
        token
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const { maxAge, ...clearOptions } = COOKIE_OPTIONS;
    res.clearCookie(TOKEN_COOKIE_NAME, clearOptions);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const student = await AuthService.getStudentById(req.user.id);
    res.status(200).json({
      success: true,
      data: student
    });
  } catch (err) {
    // If not found in student collection but authenticated via JWT (e.g. legacy token)
    if (req.user) {
      return res.status(200).json({
        success: true,
        data: {
          id: req.user.id,
          name: req.user.name || 'CBIT Student',
          email: req.user.email,
          rollNo: req.user.rollNo || '',
          role: req.user.role || 'student'
        }
      });
    }
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const result = await AuthService.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
}

