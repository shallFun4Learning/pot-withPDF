import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';

import PdfViewerPane from './window/Pdf/components/PdfViewerPane';

function Harness() {
    const viewerRef = useRef(null);
    const [selectionText, setSelectionText] = useState('');
    const [highlightEnabled, setHighlightEnabled] = useState(false);
    const [savedBytes, setSavedBytes] = useState(0);
    const [dirty, setDirty] = useState(false);
    const [annotations, setAnnotations] = useState([]);
    const documentUrl = new URLSearchParams(window.location.search).get('doc') || '/test-assets/sample.pdf';

    useEffect(() => {
        viewerRef.current?.openDocument({ url: documentUrl });
    }, [documentUrl]);

    return (
        <div
            style={{
                height: '100vh',
                display: 'grid',
                gridTemplateColumns: '1fr 320px',
                gap: 16,
                padding: 16,
                boxSizing: 'border-box',
            }}
        >
            <div>
                <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                    <button
                        type='button'
                        data-testid='toggle-highlight'
                        onClick={() => {
                            const nextState = !highlightEnabled;
                            setHighlightEnabled(nextState);
                            viewerRef.current?.setHighlightMode(nextState);
                        }}
                    >
                        {highlightEnabled ? 'Disable highlight' : 'Enable highlight'}
                    </button>
                    <button
                        type='button'
                        data-testid='save-pdf'
                        onClick={async () => {
                            const bytes = await viewerRef.current?.saveDocument();
                            setSavedBytes(bytes?.length ?? 0);
                        }}
                    >
                        Save
                    </button>
                    <span data-testid='dirty-state'>{dirty ? 'dirty' : 'clean'}</span>
                </div>
                <div style={{ height: 'calc(100vh - 72px)' }}>
                    <PdfViewerPane
                        ref={viewerRef}
                        onAnnotationsChange={setAnnotations}
                        onSelectionTextChange={setSelectionText}
                        onDirtyChange={setDirty}
                    />
                </div>
            </div>
            <aside style={{ padding: 12, border: '1px solid #ddd', borderRadius: 12, overflow: 'auto' }}>
                <h2>Sidebar</h2>
                <p data-testid='selection-text'>{selectionText}</p>
                <div data-testid='translation-result'>{selectionText ? `MOCK: ${selectionText}` : ''}</div>
                <div data-testid='saved-bytes'>{savedBytes}</div>
                <h3>Highlights</h3>
                <div data-testid='annotation-count'>{annotations.length}</div>
                <ul data-testid='annotation-list'>
                    {annotations.map((annotation) => (
                        <li
                            key={annotation.annotationElementId || annotation.id}
                            data-testid='annotation-item'
                            style={{ marginBottom: 8 }}
                        >
                            <div>{annotation.snippet || `Page ${annotation.pageNumber}`}</div>
                            <button
                                type='button'
                                data-testid={`focus-annotation-${annotation.annotationElementId || annotation.id}`}
                                onClick={() => viewerRef.current?.focusAnnotation(annotation)}
                            >
                                Focus
                            </button>
                            <button
                                type='button'
                                data-testid={`delete-annotation-${annotation.annotationElementId || annotation.id}`}
                                onClick={() => viewerRef.current?.deleteAnnotation(annotation)}
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Harness />);
