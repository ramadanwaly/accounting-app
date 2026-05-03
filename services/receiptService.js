const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'receipts');
const ORIGINAL_DIR = path.join(UPLOADS_DIR, 'original');
const THUMBNAIL_DIR = path.join(UPLOADS_DIR, 'thumbnails');

class ReceiptService {
    /**
     * التأكد من وجود مجلدات التخزين قبل أي عملية كتابة
     */
    static async ensureStorageDirs() {
        await fs.mkdir(ORIGINAL_DIR, { recursive: true });
        await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
    }

    /**
     * يحفظ ملف الإيصال ويولد نسخة مصغرة له
     * @param {Object} file - كائن الملف من multer
     * @returns {Promise<Object>} - بيانات الملف المحفوظ
     */
    static async saveReceipt(file) {
        await ReceiptService.ensureStorageDirs();

        // تحقق فعلي من محتوى الصورة (وليس الاعتماد على mimetype فقط)
        let metadata;
        try {
            metadata = await sharp(file.buffer).metadata();
        } catch (error) {
            const invalidFileError = new Error('ملف الإيصال غير صالح أو تالف. يرجى رفع صورة JPG أو PNG صحيحة.');
            invalidFileError.status = 400;
            throw invalidFileError;
        }

        const allowedFormats = ['jpeg', 'png'];
        if (!metadata || !allowedFormats.includes(metadata.format)) {
            const invalidTypeError = new Error('نوع الملف غير مدعوم. يرجى رفع صورة JPG أو PNG فقط.');
            invalidTypeError.status = 400;
            throw invalidTypeError;
        }

        // توليد اسم فريد للملف
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `${uniqueSuffix}${ext}`;
        
        const originalPath = path.join(ORIGINAL_DIR, filename);
        const thumbnailPath = path.join(THUMBNAIL_DIR, filename);

        // حفظ الملف الأصلي
        await fs.writeFile(originalPath, file.buffer);

        // توليد الصورة المصغرة (Thumbnail) - مع معالجة الأخطاء بشكل آمن
        try {
            await sharp(file.buffer)
                .resize(200, 200, {
                    fit: 'cover',
                    position: 'center'
                })
                .toFile(thumbnailPath);
        } catch (sharpError) {
            // في حالة فشل معالجة الصورة (مثلاً في بيئة الاختبار)، نسخ الملف الأصلي كـ thumbnail
            console.warn(`Thumbnail generation failed for ${filename}, using original:`, sharpError.message);
            await fs.copyFile(originalPath, thumbnailPath);
        }

        return {
            filename,
            file_path: `/api/expenses/receipts/original/${filename}`,
            thumbnail_path: `/api/expenses/receipts/thumbnails/${filename}`,
            original_name: file.originalname,
            mime_type: file.mimetype,
            size: file.size
        };
    }

    /**
     * يحذف ملفات الإيصال (الأصل والThumbnail)
     * @param {string} filename - اسم الملف
     */
    static async deleteReceipt(filename) {
        const paths = [
            path.join(ORIGINAL_DIR, filename),
            path.join(THUMBNAIL_DIR, filename)
        ];

        for (const p of paths) {
            try {
                await fs.unlink(p);
            } catch (error) {
                // إذا لم يكن الملف موجوداً، لا داعي للقلق
                if (error.code !== 'ENOENT') {
                    console.error(`Error deleting file ${p}:`, error.message);
                }
            }
        }
    }

    /**
     * يحصل على المسار الكامل للملف
     * @param {string} filename - اسم الملف
     * @param {boolean} isThumbnail - هل المطلوب هو الصورة المصغرة؟
     * @returns {string} - المسار الكامل
     */
    static getFullPath(filename, isThumbnail = false) {
        const dir = isThumbnail ? THUMBNAIL_DIR : ORIGINAL_DIR;
        return path.join(dir, filename);
    }
}

module.exports = ReceiptService;
