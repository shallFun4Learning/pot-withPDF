import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 60000,
    use: {
        baseURL: 'http://127.0.0.1:1420',
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'pnpm exec vite --host 127.0.0.1 --port 1420',
        url: 'http://127.0.0.1:1420',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
