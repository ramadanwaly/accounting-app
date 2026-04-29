/**
 * HTTPS Configuration for Cloudflare Tunnel
 * 
 * ملاحظة: عند استخدام Cloudflare Tunnel، Cloudflare يوفر SSL/TLS تلقائياً
 * لكن يمكنك تفعيل HTTPS محلياً للأمان الإضافي
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * إنشاء خادم HTTPS
 * @param {Express} app - Express application
 * @param {number} port - Port number
 * @returns {https.Server|null} HTTPS server or null if disabled
 */
function createHTTPSServer(app, port) {
    // التحقق من تفعيل HTTPS
    if (process.env.HTTPS_ENABLED !== 'true') {
        console.log('ℹ️  HTTPS غير مفعّل. استخدام HTTP فقط.');
        console.log('   مع Cloudflare Tunnel، SSL/TLS يُدار تلقائياً بواسطة Cloudflare');
        return null;
    }

    try {
        const keyPath = process.env.SSL_KEY_PATH || './ssl/key.pem';
        const certPath = process.env.SSL_CERT_PATH || './ssl/cert.pem';

        // التحقق من وجود الملفات
        if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
            console.warn('⚠️  ملفات SSL غير موجودة. تخطي HTTPS.');
            console.warn(`   المتوقع: ${keyPath} و ${certPath}`);
            return null;
        }

        const options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };

        const httpsServer = https.createServer(options, app);

        httpsServer.listen(port, () => {
            console.log(`🔒 HTTPS Server running on port ${port}`);
        });

        return httpsServer;
    } catch (error) {
        console.error('❌ خطأ في إنشاء HTTPS server:', error.message);
        return null;
    }
}

/**
 * معلومات عن Cloudflare Tunnel
 */
function logCloudflareInfo() {
    if (process.env.CLOUDFLARE_TUNNEL === 'true') {
        console.log('\n📡 Cloudflare Tunnel Configuration:');
        console.log('   ✅ SSL/TLS managed by Cloudflare');
        console.log('   ✅ DDoS protection enabled');
        console.log('   ✅ CDN caching available');
        console.log('   💡 Tip: Set SSL/TLS mode to "Full" or "Full (strict)" in Cloudflare dashboard\n');
    }
}

module.exports = {
    createHTTPSServer,
    logCloudflareInfo
};
