import { expect, test } from '@playwright/test';

test('selecting PDF text updates sidebar and save returns bytes', async ({ page }) => {
    await page.goto('/pdf-test.html');
    await page.locator('.textLayer span').first().waitFor({ state: 'visible' });

    await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('.textLayer span'));
        const start = spans.find((span) => span.textContent.includes('Hello PDF')) || spans[0];
        const end = spans.find((span) => span.textContent.includes('Select this sentence')) || spans[spans.length - 1];
        const range = document.createRange();
        range.setStart(start.firstChild || start, 0);
        range.setEnd(end.firstChild || end, (end.textContent || '').length);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document
            .querySelector('[data-testid="pdf-scroll-container"]')
            .dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    await expect(page.getByTestId('selection-text')).toContainText('Hello PDF');
    await expect(page.getByTestId('translation-result')).toContainText('MOCK: Hello PDF');

    await page.getByTestId('toggle-highlight').click();
    await page.getByTestId('save-pdf').click();
    await expect(page.getByTestId('saved-bytes')).not.toHaveText('0');
});

test('leaving highlight mode restores selection tracking', async ({ page }) => {
    await page.goto('/pdf-test.html');
    await page.locator('.textLayer span').first().waitFor({ state: 'visible' });

    await page.getByTestId('toggle-highlight').click();
    await page.getByTestId('toggle-highlight').click();

    await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('.textLayer span'));
        const start = spans.find((span) => span.textContent.includes('Hello PDF')) || spans[0];
        const end = spans.find((span) => span.textContent.includes('Select this sentence')) || spans[spans.length - 1];
        const range = document.createRange();
        range.setStart(start.firstChild || start, 0);
        range.setEnd(end.firstChild || end, (end.textContent || '').length);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document
            .querySelector('[data-testid="pdf-scroll-container"]')
            .dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    await expect(page.getByTestId('selection-text')).toContainText('Hello PDF');
    await expect(page.getByTestId('dirty-state')).toHaveText('clean');
});

test('saved highlights appear in the list and can be deleted', async ({ page }) => {
    await page.goto('/pdf-test.html?doc=/test-assets/highlighted-sample.pdf');
    await expect(page.getByTestId('annotation-count')).toHaveText('1');
    await expect(page.getByTestId('annotation-item')).toBeVisible();

    await page.getByTestId('toggle-highlight').click();
    await page.getByTestId('annotation-item').getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByTestId('annotation-count')).toHaveText('0');
    await expect(page.getByTestId('dirty-state')).toHaveText('dirty');
});
