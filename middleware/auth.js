const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');

// التحقق من JWT Token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'يرجى تسجيل الدخول أولاً'
        });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded; // { userId, email }
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى'
            });
        }
        return res.status(403).json({
            success: false,
            message: 'رمز المصادقة غير صالح'
        });
    }
};

// إنشاء JWT Token
const generateToken = (userId, email, role) => {
    const { jwtExpiresIn } = require('../config/auth');
    return jwt.sign(
        { userId, email, role },
        jwtSecret,
        { expiresIn: jwtExpiresIn }
    );
};

module.exports = {
    verifyToken,
    generateToken
};
