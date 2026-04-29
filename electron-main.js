const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// تشغيل خادم Express
function startServer() {
    const serverPath = path.join(__dirname, 'server.js');
    serverProcess = spawn('node', [serverPath], {
        stdio: 'inherit',
        env: { ...process.env, ELECTRON_MODE: 'true' }
    });

    serverProcess.on('error', (err) => {
        console.error('Failed to start server:', err);
    });
}

// إنشاء النافذة الرئيسية
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        backgroundColor: '#667eea',
        icon: path.join(__dirname, 'build/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        },
        show: false,
        autoHideMenuBar: false
    });

    // إنشاء قائمة عربية
    const menuTemplate = [
        {
            label: 'ملف',
            submenu: [
                {
                    label: 'نسخة احتياطية',
                    click: () => {
                        const { exec } = require('child_process');
                        exec('npm run backup', (error) => {
                            if (error) {
                                console.error('Backup failed:', error);
                            }
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'إعادة تحميل',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => mainWindow.reload()
                },
                { type: 'separator' },
                {
                    label: 'خروج',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'عرض',
            submenu: [
                {
                    label: 'ملء الشاشة',
                    accelerator: 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                },
                { type: 'separator' },
                {
                    label: 'تكبير',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
                    }
                },
                {
                    label: 'تصغير',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
                    }
                },
                {
                    label: 'إعادة ضبط الحجم',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => mainWindow.webContents.setZoomLevel(0)
                }
            ]
        },
        {
            label: 'مساعدة',
            submenu: [
                {
                    label: 'دليل الاستخدام',
                    click: () => {
                        shell.openExternal('https://github.com/your-repo/accounting-app#readme');
                    }
                },
                { type: 'separator' },
                {
                    label: 'حول البرنامج',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'حول البرنامج',
                            message: 'برنامج المحاسبة الاحترافي',
                            detail: `الإصدار: 1.0.0\nتطبيق سطح مكتب لإدارة الحسابات\nمبني بـ Electron + Node.js`,
                            buttons: ['موافق']
                        });
                    }
                }
            ]
        }
    ];

    // في بيئة التطوير، أضف أدوات المطور
    if (process.env.NODE_ENV !== 'production') {
        menuTemplate.push({
            label: 'تطوير',
            submenu: [
                {
                    label: 'أدوات المطور',
                    accelerator: 'F12',
                    click: () => mainWindow.webContents.openDevTools()
                }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    // الانتظار حتى يصبح الخادم جاهزاً ثم تحميل التطبيق
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
    }, 2000);

    // إظهار النافذة عندما تكون جاهزة
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // فتح الروابط الخارجية في المتصفح
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// عند جاهزية Electron
app.whenReady().then(() => {
    startServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// إغلاق الخادم عند إنهاء التطبيق
app.on('will-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

// الخروج عند إغلاق جميع النوافذ (ما عدا macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
