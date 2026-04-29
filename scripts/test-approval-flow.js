const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const API_URL = 'http://localhost:3000';
const TEST_EMAIL = `test_approval_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';

async function runTest() {
    try {
        console.log('1. Registering new user...');
        const registerRes = await axios.post(`${API_URL}/api/auth/register`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            fullName: 'Test User'
        });

        if (registerRes.data.token) {
            console.error('FAIL: Token received immediately!');
            process.exit(1);
        }
        console.log('PASS: Registration successful, no token received.');

        console.log('2. Trying to login (should fail)...');
        try {
            await axios.post(`${API_URL}/api/auth/login`, {
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            });
            console.error('FAIL: Login succeeded but should have failed!');
            process.exit(1);
        } catch (error) {
            if (error.response && error.response.status === 401 && error.response.data.message.includes('المراجعة')) {
                console.log('PASS: Login failed as expected with pending message.');
            } else {
                console.error('FAIL: Login failed with unexpected error:', error.message);
                process.exit(1);
            }
        }

        console.log('3. Approving user...');
        await new Promise((resolve, reject) => {
            const child = spawn('node', ['scripts/approve-user.js', TEST_EMAIL], {
                cwd: path.join(__dirname, '..')
            });

            child.stdout.on('data', (data) => console.log(`[Script]: ${data}`));
            child.stderr.on('data', (data) => console.error(`[Script Error]: ${data}`));

            child.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Approval script failed'));
            });
        });
        console.log('PASS: User approved.');

        console.log('4. Trying to login again (should succeed)...');
        const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        if (loginRes.data.token) {
            console.log('PASS: Login successful, token received.');
        } else {
            console.error('FAIL: Login successful but no token received?');
            process.exit(1);
        }

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        process.exit(1);
    }
}

// Ensure server is running or we need to start it?
// Assuming server is running on port 3000 as per common practice.
// If not, this script will fail connection.
runTest();
