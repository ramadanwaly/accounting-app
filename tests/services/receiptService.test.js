const ReceiptService = require('../../services/receiptService');
const fs = require('fs').promises;
const path = require('path');

describe('ReceiptService', () => {
    const testFilename = 'test-image.jpg';
    const validPngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z6L8AAAAASUVORK5CYII=',
        'base64'
    );
    
    beforeAll(async () => {
        // التأكد من وجود المجلدات (قد تكون موجودة بالفعل من Phase 1)
        const dirs = [
            path.join(__dirname, '../../uploads/receipts/original'),
            path.join(__dirname, '../../uploads/receipts/thumbnails')
        ];
        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    });

    it('should save a receipt and return metadata (US4 foundation)', async () => {
        const mockFile = {
            originalname: 'test.jpg',
            mimetype: 'image/jpeg',
            buffer: validPngBuffer,
            size: 1024
        };

        const result = await ReceiptService.saveReceipt(mockFile);

        expect(result).toHaveProperty('filename');
        expect(result.original_name).toBe('test.jpg');
        expect(result.mime_type).toBe('image/jpeg');

        // التحقق من وجود الملف الأصلي (تم حفظه عبر fs.writeFile)
        const originalPath = ReceiptService.getFullPath(result.filename, false);
        const exists = await fs.access(originalPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);

        // تنظيف
        await ReceiptService.deleteReceipt(result.filename);
    });

    it('should correctly delete both original and thumbnail files', async () => {
        const filename = 'delete-test.jpg';
        const originalPath = ReceiptService.getFullPath(filename, false);
        const thumbPath = ReceiptService.getFullPath(filename, true);

        // إنشاء ملفات وهمية
        await fs.writeFile(originalPath, 'data');
        await fs.writeFile(thumbPath, 'data');

        await ReceiptService.deleteReceipt(filename);

        const originalExists = await fs.access(originalPath).then(() => true).catch(() => false);
        const thumbExists = await fs.access(thumbPath).then(() => true).catch(() => false);

        expect(originalExists).toBe(false);
        expect(thumbExists).toBe(false);
    });
});
