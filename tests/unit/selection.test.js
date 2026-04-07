import { describe, expect, it } from 'vitest';

import { getSelectionTextFromViewer } from '../../src/window/Pdf/utils/selection';

describe('getSelectionTextFromViewer', () => {
    it('returns normalized text when selection belongs to the viewer', () => {
        const viewer = document.createElement('div');
        const textNode = document.createTextNode('Hello\nPDF');
        viewer.appendChild(textNode);

        const selection = {
            rangeCount: 1,
            isCollapsed: false,
            anchorNode: textNode,
            focusNode: textNode,
            toString: () => 'Hello\nPDF',
        };

        expect(getSelectionTextFromViewer(selection, viewer)).toBe('Hello PDF');
    });

    it('ignores selections outside of the viewer', () => {
        const viewer = document.createElement('div');
        const inside = document.createTextNode('Inside');
        const outside = document.createTextNode('Outside');
        viewer.appendChild(inside);

        const selection = {
            rangeCount: 1,
            isCollapsed: false,
            anchorNode: outside,
            focusNode: outside,
            toString: () => 'Outside',
        };

        expect(getSelectionTextFromViewer(selection, viewer)).toBe('');
    });
});
