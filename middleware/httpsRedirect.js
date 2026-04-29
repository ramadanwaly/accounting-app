/**
 * Middleware لإعادة توجيه HTTP إلى HTTPS
 * 
 * ملاحظة: مع Cloudflare Tunnel، هذا اختياري لأن Cloudflare
 * يمكنه إدارة redirect تلقائياً
 */

const httpsRedirect = (req, res, next) => {
    // تخطي في بيئة التطوير
    if (process.env.NODE_ENV !== 'production') {
        return next();
    }

    // تخطي إذا كان HTTPS redirect غير مفعّل
    if (process.env.FORCE_HTTPS_REDIRECT !== 'true') {
        return next();
    }

    // تخطي إذا كان مع Cloudflare (يدير redirect تلقائياً)
    if (process.env.CLOUDFLARE_TUNNEL === 'true') {
        return next();
    }

    // التحقق من البروتوكول
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;

    if (protocol !== 'https') {
        const httpsUrl = `https://${req.headers.host}${req.url}`;
        return res.redirect(301, httpsUrl);
    }

    next();
};

module.exports = httpsRedirect;
