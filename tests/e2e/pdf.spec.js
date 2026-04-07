import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

function writeHighlightedFixture() {
    execFileSync(
        'python',
        [
            '-c',
            `
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from pypdf import PdfReader, PdfWriter
from pypdf.annotations import Highlight
from pypdf.generic import ArrayObject, FloatObject

source_path = 'public/test-assets/highlighted-sample-generated-source.pdf'
output_path = 'public/test-assets/highlighted-sample-generated.pdf'

c = canvas.Canvas(source_path, pagesize=letter)
c.setFont('Helvetica', 24)
c.drawString(100, 700, 'Hello PDF annotation list test')
c.save()

reader = PdfReader(source_path)
writer = PdfWriter()
for page in reader.pages:
    writer.add_page(page)

quad_points = ArrayObject([
    FloatObject(100), FloatObject(724),
    FloatObject(165), FloatObject(724),
    FloatObject(100), FloatObject(694),
    FloatObject(165), FloatObject(694),
])
writer.add_annotation(
    0,
    Highlight(
        rect=(98, 694, 165, 724),
        quad_points=quad_points,
        highlight_color='ffe066',
    ),
)

with open(output_path, 'wb') as file:
    writer.write(file)
            `,
        ],
        { cwd: process.cwd() }
    );
}

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
    writeHighlightedFixture();

    await page.goto('/pdf-test.html?doc=/test-assets/highlighted-sample-generated.pdf');
    await expect(page.getByTestId('annotation-count')).toHaveText('1');
    await expect(page.getByTestId('annotation-item')).toBeVisible();

    await page.getByTestId('toggle-highlight').click();
    await page.getByTestId('annotation-item').getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByTestId('annotation-count')).toHaveText('0');
    await expect(page.getByTestId('dirty-state')).toHaveText('dirty');
});
