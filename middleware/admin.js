const User = require('../models/User');

const isAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بالوصول لهذه الصفحة'
            });
        }

        // لا نعتمد على الدور الموجود داخل JWT فقط، لأن الصلاحية قد تتغير قبل انتهاء الجلسة.
        const user = await User.findById(req.user.userId);
        if (user && user.role === 'admin' && user.is_approved === 1) {
            req.adminUser = user;
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'غير مصرح لك بالوصول لهذه الصفحة'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = isAdmin;
