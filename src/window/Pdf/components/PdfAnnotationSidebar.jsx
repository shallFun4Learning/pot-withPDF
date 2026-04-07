import { Button, Chip, Input, Textarea, Tooltip } from '@nextui-org/react';
import React, { useMemo, useState } from 'react';
import { writeText } from '@tauri-apps/api/clipboard';
import { AiOutlineSave } from 'react-icons/ai';
import { MdContentCopy, MdDeleteOutline, MdFormatQuote, MdHighlightAlt, MdOutlineStickyNote2 } from 'react-icons/md';
import { HiTranslate } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { FiArrowUpRight } from 'react-icons/fi';
import { LuSearch, LuX } from 'react-icons/lu';
import toast from 'react-hot-toast';

import { filterHighlightAnnotations, hasActiveAnnotationFilters } from '../utils/annotationFilters';
import { PDF_HIGHLIGHT_PRESETS } from '../utils/highlightPalette';
import { createPdfCitationCopyText, createPdfExtractCopyText } from '../utils/quotes';

export default function PdfAnnotationSidebar({
    annotations = [],
    documentName = '',
    documentPath = '',
    dirty,
    onExitHighlightMode,
    onSave,
    onExportExtracts,
    canSave,
    canExport = false,
    highlightColor,
    onHighlightColorChange,
    onFocusAnnotation,
    onDeleteAnnotation,
    selectedAnnotation = null,
    selectedAnnotationKey = '',
    onSelectAnnotation,
    onAnnotationNoteChange,
}) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [colorFilter, setColorFilter] = useState('all');

    const filteredAnnotations = useMemo(
        () =>
            filterHighlightAnnotations({
                annotations,
                searchQuery,
                colorFilter,
            }),
        [annotations, colorFilter, searchQuery]
    );
    const hasActiveFilters = hasActiveAnnotationFilters({ searchQuery, colorFilter });
    const getAnnotationKey = (annotation) => annotation.annotationKey || annotation.annotationElementId || annotation.id;
    const copyAnnotation = async (annotation, mode = 'extract') => {
        const text =
            mode === 'citation'
                ? createPdfCitationCopyText(annotation, { documentName, documentPath })
                : createPdfExtractCopyText(annotation, { documentName, documentPath });
        await writeText(text);
        toast.success(mode === 'citation' ? t('pdf.copy_citation_success') : t('pdf.copy_extract_success'));
    };

    return (
        <div className='h-full flex flex-col'>
            <div className='pb-[20px] border-b-1 border-default-100'>
                <p className='text-[11px] uppercase tracking-[0.22em] text-default-400 mb-[8px]'>
                    {t('pdf.highlight_panel_eyebrow')}
                </p>
                <div className='flex items-start justify-between gap-[12px]'>
                    <div>
                        <h2 className='text-[24px] font-semibold leading-[1.2] text-foreground'>
                            {t('pdf.highlight_panel_title')}
                        </h2>
                        <p className='text-sm text-default-500 mt-[6px] max-w-[28ch]'>
                            {t('pdf.highlight_panel_description')}
                        </p>
                    </div>
                    <Chip
                        radius='full'
                        color={dirty ? 'warning' : 'success'}
                        variant='flat'
                    >
                        {dirty ? t('pdf.saved_state_dirty') : t('pdf.saved_state_clean')}
                    </Chip>
                </div>
            </div>

            <div className='mt-[16px] rounded-[20px] bg-warning-50/70 dark:bg-warning-100/10 border-1 border-warning-100 dark:border-warning-900 px-[16px] py-[16px]'>
                <div className='flex items-center gap-[10px] text-warning-700 dark:text-warning-300'>
                    <div className='flex h-[36px] w-[36px] items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900/40'>
                        <MdHighlightAlt className='text-[18px]' />
                    </div>
                    <div>
                        <div className='text-sm font-semibold'>{t('pdf.highlight_mode_active')}</div>
                        <div className='text-xs text-warning-700/80 dark:text-warning-300/80'>
                            {t('pdf.translation_paused')}
                        </div>
                    </div>
                </div>
            </div>

            <div className='mt-[16px]'>
                <div className='text-[11px] uppercase tracking-[0.18em] text-default-400 mb-[10px]'>
                    {t('pdf.highlight_color')}
                </div>
                <div className='flex items-center gap-[10px]'>
                    {PDF_HIGHLIGHT_PRESETS.map((preset) => {
                        const selected = preset.value === highlightColor;
                        return (
                            <button
                                key={preset.key}
                                type='button'
                                aria-label={t(`pdf.highlight_color_${preset.key}`)}
                                title={t(`pdf.highlight_color_${preset.key}`)}
                                onClick={() => onHighlightColorChange(preset.value)}
                                className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border transition ${
                                    selected
                                        ? 'border-foreground/40 scale-110 shadow-sm'
                                        : 'border-black/5 dark:border-white/10'
                                }`}
                                style={{ backgroundColor: preset.value }}
                            >
                                {selected ? <span className='h-[8px] w-[8px] rounded-full bg-black/50 dark:bg-white/70' /> : null}
                            </button>
                        );
                    })}
                </div>
            </div>

            {selectedAnnotation ? (
                <div className='mt-[18px] rounded-[22px] border border-default-100 bg-default-50/70 px-[14px] py-[14px]'>
                    <div className='flex items-start justify-between gap-[10px]'>
                        <div>
                            <div className='flex items-center gap-[8px]'>
                                <div
                                    className='h-[11px] w-[11px] rounded-full ring-1 ring-black/5 dark:ring-white/10'
                                    style={{ backgroundColor: selectedAnnotation.color }}
                                />
                                <div className='text-[11px] uppercase tracking-[0.16em] text-default-400'>
                                    {t('pdf.highlight_page_label', { page: selectedAnnotation.pageNumber })}
                                </div>
                            </div>
                            <div className='mt-[6px] text-sm font-medium leading-[1.55] text-foreground'>
                                {selectedAnnotation.snippet ||
                                    t('pdf.highlight_snippet_fallback', { page: selectedAnnotation.pageNumber })}
                            </div>
                        </div>
                        <div className='flex items-center gap-[2px]'>
                            <Tooltip content={t('pdf.copy_extract')}>
                                <Button
                                    isIconOnly
                                    size='sm'
                                    radius='full'
                                    variant='light'
                                    onPress={() => copyAnnotation(selectedAnnotation, 'extract')}
                                >
                                    <MdContentCopy className='text-[16px]' />
                                </Button>
                            </Tooltip>
                            <Tooltip content={t('pdf.copy_citation')}>
                                <Button
                                    isIconOnly
                                    size='sm'
                                    radius='full'
                                    variant='light'
                                    onPress={() => copyAnnotation(selectedAnnotation, 'citation')}
                                >
                                    <MdFormatQuote className='text-[16px]' />
                                </Button>
                            </Tooltip>
                            <Tooltip content={t('pdf.highlight_jump_to_annotation')}>
                                <Button
                                    isIconOnly
                                    size='sm'
                                    radius='full'
                                    variant='light'
                                    onPress={() => onFocusAnnotation(selectedAnnotation)}
                                >
                                    <FiArrowUpRight className='text-[16px]' />
                                </Button>
                            </Tooltip>
                            <Tooltip content={t('pdf.highlight_delete_annotation')}>
                                <Button
                                    isIconOnly
                                    size='sm'
                                    radius='full'
                                    variant='light'
                                    color='danger'
                                    onPress={() => onDeleteAnnotation(selectedAnnotation)}
                                >
                                    <MdDeleteOutline className='text-[17px]' />
                                </Button>
                            </Tooltip>
                        </div>
                    </div>

                    {selectedAnnotation.comment ? (
                        <div className='mt-[12px] rounded-[16px] bg-content1/80 px-[12px] py-[10px]'>
                            <div className='text-[11px] uppercase tracking-[0.16em] text-default-400'>
                                {t('pdf.embedded_pdf_comment')}
                            </div>
                            <div className='mt-[4px] text-sm leading-[1.55] text-default-600'>
                                {selectedAnnotation.comment}
                            </div>
                        </div>
                    ) : null}

                    <div className='mt-[12px]'>
                        <div className='mb-[8px] flex items-center gap-[8px] text-sm font-semibold text-foreground'>
                            <MdOutlineStickyNote2 className='text-[16px]' />
                            {t('pdf.reader_note_title')}
                        </div>
                        <Textarea
                            minRows={4}
                            radius='lg'
                            value={selectedAnnotation.readerNote || ''}
                            onValueChange={(value) => onAnnotationNoteChange?.(selectedAnnotation, value)}
                            placeholder={t('pdf.reader_note_placeholder')}
                            classNames={{
                                inputWrapper: 'bg-content1 shadow-none',
                            }}
                        />
                        <div className='mt-[6px] text-xs text-default-500'>
                            {t('pdf.reader_note_hint')}
                        </div>
                    </div>
                </div>
            ) : (
                <div className='mt-[18px] rounded-[22px] border border-dashed border-default-200 px-[14px] py-[16px] text-sm text-default-500'>
                    <div className='font-medium text-foreground'>{t('pdf.reader_note_empty_title')}</div>
                    <p className='mt-[4px] leading-[1.55]'>{t('pdf.reader_note_empty_description')}</p>
                </div>
            )}

            <div className='mt-[20px] min-h-0 flex-1 overflow-hidden'>
                <div className='flex items-center justify-between gap-[12px]'>
                    <div>
                        <div className='text-[11px] uppercase tracking-[0.18em] text-default-400 mb-[4px]'>
                            {t('pdf.highlight_list_eyebrow')}
                        </div>
                        <div className='text-sm font-semibold text-foreground'>{t('pdf.highlight_list_title')}</div>
                    </div>
                    <Chip
                        radius='full'
                        variant='flat'
                        color='warning'
                    >
                        {hasActiveFilters
                            ? t('pdf.highlight_list_count_filtered', {
                                  count: filteredAnnotations.length,
                                  total: annotations.length,
                              })
                            : t('pdf.highlight_list_count', { count: annotations.length })}
                    </Chip>
                </div>

                {annotations.length > 0 ? (
                    <div className='mt-[12px] space-y-[10px]'>
                        <Input
                            aria-label={t('pdf.highlight_filter_search_placeholder')}
                            placeholder={t('pdf.highlight_filter_search_placeholder')}
                            data-testid='pdf-annotation-search'
                            radius='full'
                            size='sm'
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            startContent={<LuSearch className='text-[16px] text-default-400' />}
                            endContent={
                                searchQuery ? (
                                    <Button
                                        isIconOnly
                                        radius='full'
                                        size='sm'
                                        variant='light'
                                        onPress={() => setSearchQuery('')}
                                    >
                                        <LuX className='text-[14px]' />
                                    </Button>
                                ) : null
                            }
                            classNames={{
                                inputWrapper: 'bg-default-50/70 shadow-none',
                            }}
                        />

                        <div className='flex flex-wrap items-center gap-[8px]'>
                            <button
                                type='button'
                                data-testid='pdf-annotation-filter-all'
                                onClick={() => setColorFilter('all')}
                                className={`rounded-full border px-[12px] py-[6px] text-xs font-medium transition ${
                                    colorFilter === 'all'
                                        ? 'border-warning-300 bg-warning-50 text-warning-700 dark:bg-warning-100/10 dark:text-warning-300'
                                        : 'border-default-200 bg-default-50 text-default-500'
                                }`}
                            >
                                {t('pdf.highlight_filter_all')}
                            </button>
                            {PDF_HIGHLIGHT_PRESETS.map((preset) => {
                                const selected = colorFilter === preset.value;
                                return (
                                    <button
                                        key={preset.key}
                                        type='button'
                                        data-testid={`pdf-annotation-filter-${preset.key}`}
                                        aria-label={t(`pdf.highlight_color_${preset.key}`)}
                                        title={t(`pdf.highlight_color_${preset.key}`)}
                                        onClick={() => setColorFilter(selected ? 'all' : preset.value)}
                                        className={`flex h-[28px] w-[28px] items-center justify-center rounded-full border transition ${
                                            selected
                                                ? 'border-foreground/40 scale-110 shadow-sm'
                                                : 'border-black/5 dark:border-white/10'
                                        }`}
                                        style={{ backgroundColor: preset.value }}
                                    >
                                        {selected ? (
                                            <span className='h-[7px] w-[7px] rounded-full bg-black/50 dark:bg-white/70' />
                                        ) : null}
                                    </button>
                                );
                            })}
                            {hasActiveFilters ? (
                                <Button
                                    size='sm'
                                    radius='full'
                                    variant='light'
                                    onPress={() => {
                                        setSearchQuery('');
                                        setColorFilter('all');
                                    }}
                                >
                                    {t('pdf.highlight_filter_clear')}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                {filteredAnnotations.length > 0 ? (
                    <div
                        className='mt-[12px] h-full overflow-y-auto pr-[4px] space-y-[10px]'
                        data-testid='pdf-annotation-list'
                    >
                        {filteredAnnotations.map((annotation) => {
                            const annotationKey = getAnnotationKey(annotation);
                            const isSelected = annotationKey === selectedAnnotationKey;
                            return (
                                <div
                                    key={annotationKey}
                                    role='button'
                                    tabIndex={0}
                                    data-testid='pdf-annotation-card'
                                    className={`w-full rounded-[18px] border px-[12px] py-[12px] text-left ${
                                        isSelected
                                            ? 'border-warning-300 bg-warning-50/70 dark:bg-warning-100/10'
                                            : 'border-default-100 bg-default-50/70'
                                    }`}
                                    onClick={() => onSelectAnnotation?.(annotation)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            onSelectAnnotation?.(annotation);
                                        }
                                    }}
                                >
                                    <div className='flex items-start gap-[10px]'>
                                        <div
                                            className='mt-[3px] h-[12px] w-[12px] shrink-0 rounded-full ring-1 ring-black/5 dark:ring-white/10'
                                            style={{ backgroundColor: annotation.color }}
                                        />
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex items-start justify-between gap-[10px]'>
                                                <div className='text-[11px] uppercase tracking-[0.16em] text-default-400'>
                                                    {t('pdf.highlight_page_label', { page: annotation.pageNumber })}
                                                </div>
                                                <div className='flex items-center gap-[2px]'>
                                                    <Tooltip content={t('pdf.copy_extract')}>
                                                        <Button
                                                            isIconOnly
                                                            aria-label={t('pdf.copy_extract')}
                                                            size='sm'
                                                            radius='full'
                                                            variant='light'
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                void copyAnnotation(annotation, 'extract');
                                                            }}
                                                        >
                                                            <MdContentCopy className='text-[14px]' />
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip content={t('pdf.copy_citation')}>
                                                        <Button
                                                            isIconOnly
                                                            aria-label={t('pdf.copy_citation')}
                                                            size='sm'
                                                            radius='full'
                                                            variant='light'
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                void copyAnnotation(annotation, 'citation');
                                                            }}
                                                        >
                                                            <MdFormatQuote className='text-[14px]' />
                                                        </Button>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                            <p className='mt-[4px] text-sm font-medium leading-[1.5] text-foreground line-clamp-2'>
                                                {annotation.snippet ||
                                                    t('pdf.highlight_snippet_fallback', { page: annotation.pageNumber })}
                                            </p>
                                            {annotation.displayNote ? (
                                                <p className='mt-[4px] text-xs leading-[1.5] text-default-500 line-clamp-2'>
                                                    {annotation.displayNote}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className='mt-[12px] rounded-[18px] border-1 border-dashed border-default-200 px-[14px] py-[14px] text-sm text-default-500'>
                        <div className='font-medium text-foreground'>
                            {hasActiveFilters
                                ? t('pdf.highlight_list_empty_filtered_title')
                                : t('pdf.highlight_list_empty_title')}
                        </div>
                        <p className='mt-[4px] leading-[1.55]'>
                            {hasActiveFilters
                                ? t('pdf.highlight_list_empty_filtered_description')
                                : t('pdf.highlight_list_empty_description')}
                        </p>
                    </div>
                )}
            </div>

            <div className='flex flex-col gap-[10px] pt-[24px]'>
                <Button
                    radius='full'
                    variant='flat'
                    startContent={<MdOutlineStickyNote2 className='text-[18px]' />}
                    onPress={onExportExtracts}
                    isDisabled={!canExport}
                >
                    {t('pdf.export_extracts')}
                </Button>
                <Button
                    color='warning'
                    radius='full'
                    startContent={<AiOutlineSave className='text-[18px]' />}
                    onPress={onSave}
                    isDisabled={!canSave}
                >
                    {t('pdf.save_changes_now')}
                </Button>
                <Button
                    radius='full'
                    variant='light'
                    startContent={<HiTranslate className='text-[18px]' />}
                    onPress={onExitHighlightMode}
                >
                    {t('pdf.exit_highlight')}
                </Button>
            </div>
        </div>
    );
}
