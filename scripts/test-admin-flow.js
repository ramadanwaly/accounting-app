const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const API_URL = 'http://localhost:3000';
const ADMIN_EMAIL = `admin_${Date.now()}@test.com`;
const USER_EMAIL = `user_${Date.now()}@test.com`;
const PASSWORD = 'password123';

async function runTest() {
    try {
        console.log('1. Registering Admin User...');
        await axios.post(`${API_URL}/api/auth/register`, {
            email: ADMIN_EMAIL,
            password: PASSWORD,
            fullName: 'Admin User'
        });

        console.log('2. Promoting to Admin (via script)...');
        await new Promise((resolve, reject) => {
            const child = spawn('node', ['scripts/make-admin.js', ADMIN_EMAIL], {
                cwd: path.join(__dirname, '..')
            });
            child.on('close', (code) => code === 0 ? resolve() : reject(new Error('make-admin failed')));
        });

        console.log('3. Logging in as Admin...');
        const adminLogin = await axios.post(`${API_URL}/api/auth/login`, {
            email: ADMIN_EMAIL,
            password: PASSWORD
        });
        const adminToken = adminLogin.data.token;
        if (!adminToken) throw new Error('No admin token');
        console.log('PASS: Admin logged in.');

        console.log('4. Registering Regular User...');
        await axios.post(`${API_URL}/api/auth/register`, {
            email: USER_EMAIL,
            password: PASSWORD,
            fullName: 'Regular User'
        });

        console.log('5. Verifying Regular User is pending...');
        try {
            await axios.post(`${API_URL}/api/auth/login`, {
                email: USER_EMAIL,
                password: PASSWORD
            });
            throw new Error('User logged in but should be pending');
        } catch (e) {
            if (e.response && e.response.status === 401) console.log('PASS: User login blocked.');
            else throw e;
        }

        console.log('6. Fetching users list as Admin...');
        const listRes = await axios.get(`${API_URL}/api/admin/users`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const targetUser = listRes.data.users.find(u => u.email === USER_EMAIL);
        if (!targetUser) throw new Error('User not found in admin list');
        console.log('PASS: User found in list.');

        console.log('7. Approving User as Admin...');
        await axios.post(`${API_URL}/api/admin/users/approve`, { userId: targetUser.id }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('PASS: Approval request sent.');

        console.log('8. Verifying Regular User can login...');
        const userLogin = await axios.post(`${API_URL}/api/auth/login`, {
            email: USER_EMAIL,
            password: PASSWORD
        });
        if (userLogin.data.token) console.log('PASS: User logged in successfully.');
        else throw new Error('User login failed after approval');

    } catch (error) {
        console.error('TEST FAILED:', error.message);
        if (error.response) console.error('Response:', error.response.data);
        process.exit(1);
    }
}

runTest();
