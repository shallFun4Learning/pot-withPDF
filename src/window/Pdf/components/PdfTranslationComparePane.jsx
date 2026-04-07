import { Button, Chip, Spinner } from '@nextui-org/react';
import { writeText } from '@tauri-apps/api/clipboard';
import React from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { HiTranslate } from 'react-icons/hi';
import { MdContentCopy, MdFormatQuote } from 'react-icons/md';
import { LuX } from 'react-icons/lu';

import { createPdfCitationCopyText } from '../utils/quotes';

export default function PdfTranslationComparePane({
    documentName = '',
    documentPath = '',
    currentPage = 0,
    sourceText = '',
    translationText = '',
    serviceLabel = '',
    isLoading = false,
    error = '',
    onClose,
}) {
    const { t } = useTranslation();
    const normalizedSourceText = String(sourceText || '').trim();
    const normalizedTranslationText = String(translationText || '').trim();

    const copyOriginal = async () => {
        if (!normalizedSourceText) {
            return;
        }
        await writeText(normalizedSourceText);
        toast.success(t('pdf.copy_extract_success'));
    };

    const copyCitation = async () => {
        if (!normalizedSourceText) {
            return;
        }
        await writeText(
            createPdfCitationCopyText(
                {
                    snippet: normalizedSourceText,
                    pageNumber: currentPage,
                },
                { documentName, documentPath }
            )
        );
        toast.success(t('pdf.copy_citation_success'));
    };

    const copyTranslation = async () => {
        if (!normalizedTranslationText) {
            return;
        }
        await writeText(normalizedTranslationText);
        toast.success(t('pdf.copy_translation_success'));
    };

    return (
        <div className='min-h-0 flex flex-col rounded-[24px] border border-default-100 bg-content1/80 p-[10px]'>
            <div className='mb-[10px] flex items-center justify-between gap-[10px] rounded-[18px] bg-default-50/80 px-[12px] py-[10px]'>
                <div className='min-w-0'>
                    <div className='flex items-center gap-[8px]'>
                        <Chip
                            size='sm'
                            radius='full'
                            color='secondary'
                            variant='flat'
                            startContent={<HiTranslate className='text-[12px]' />}
                        >
                            {t('pdf.compare_translation_mode')}
                        </Chip>
                        {serviceLabel ? (
                            <Chip
                                size='sm'
                                radius='full'
                                variant='flat'
                            >
                                {serviceLabel}
                            </Chip>
                        ) : null}
                    </div>
                    <div className='mt-[4px] text-xs text-default-500'>
                        {currentPage ? t('pdf.highlight_page_label', { page: currentPage }) : t('pdf.selection_ready')}
                    </div>
                </div>

                <Button
                    isIconOnly
                    size='sm'
                    radius='full'
                    variant='light'
                    onPress={onClose}
                >
                    <LuX className='text-[14px]' />
                </Button>
            </div>

            {!normalizedSourceText ? (
                <div className='flex min-h-0 flex-1 items-center justify-center rounded-[18px] border border-dashed border-default-200 bg-default-50/60 px-[18px] py-[18px] text-center'>
                    <div>
                        <div className='text-base font-semibold text-foreground'>
                            {t('pdf.compare_translation_empty_title')}
                        </div>
                        <p className='mt-[6px] text-sm leading-[1.65] text-default-500'>
                            {t('pdf.compare_translation_empty_description')}
                        </p>
                    </div>
                </div>
            ) : (
                <div className='min-h-0 flex flex-1 flex-col gap-[10px] overflow-hidden'>
                    <section className='min-h-0 rounded-[20px] border border-default-100 bg-default-50/70 px-[14px] py-[14px]'>
                        <div className='flex items-center justify-between gap-[10px]'>
                            <div>
                                <div className='text-[11px] uppercase tracking-[0.16em] text-default-400'>
                                    {t('pdf.compare_original_title')}
                                </div>
                                <div className='mt-[4px] text-xs text-default-500'>
                                    {documentName || t('pdf.tab_untitled')}
                                </div>
                            </div>
                            <div className='flex items-center gap-[4px]'>
                                <Button
                                    isIconOnly
                                    size='sm'
                                    radius='full'
                                    variant='light'
                                    aria-label={t('pdf.copy_selection')}
                                    onPress={copyOriginal}
                                >
                                    <MdContentCopy className='text-[15px]' />
                                </Button>
                                <Button
                                    isIconOnly
                                    size='sm'
                                    radius='full'
                                    variant='light'
                                    aria-label={t('pdf.copy_selection_with_page')}
                                    onPress={copyCitation}
                                >
                                    <MdFormatQuote className='text-[15px]' />
                                </Button>
                            </div>
                        </div>
                        <div className='mt-[12px] max-h-[32vh] overflow-y-auto pr-[2px] text-sm leading-[1.75] text-foreground whitespace-pre-wrap'>
                            {normalizedSourceText}
                        </div>
                    </section>

                    <section className='min-h-0 flex-1 rounded-[20px] border border-primary/10 bg-primary/5 px-[14px] py-[14px]'>
                        <div className='flex items-center justify-between gap-[10px]'>
                            <div>
                                <div className='text-[11px] uppercase tracking-[0.16em] text-default-400'>
                                    {t('pdf.compare_translation_title')}
                                </div>
                                <div className='mt-[4px] text-xs text-default-500'>
                                    {serviceLabel || t('pdf.translate_primary_title')}
                                </div>
                            </div>
                            <Button
                                isIconOnly
                                size='sm'
                                radius='full'
                                variant='light'
                                aria-label={t('pdf.copy_translation')}
                                onPress={copyTranslation}
                                isDisabled={!normalizedTranslationText}
                            >
                                <MdContentCopy className='text-[15px]' />
                            </Button>
                        </div>

                        <div className='mt-[12px] h-full max-h-[42vh] overflow-y-auto pr-[2px] text-sm leading-[1.75]'>
                            {error ? (
                                <div className='rounded-[16px] border border-danger/10 bg-danger/5 px-[12px] py-[12px] text-danger'>
                                    {error}
                                </div>
                            ) : isLoading && !normalizedTranslationText ? (
                                <div className='flex h-full min-h-[140px] items-center justify-center'>
                                    <div className='flex items-center gap-[10px] text-default-500'>
                                        <Spinner size='sm' />
                                        {t('pdf.compare_translation_loading')}
                                    </div>
                                </div>
                            ) : normalizedTranslationText ? (
                                <div className='text-foreground whitespace-pre-wrap'>{normalizedTranslationText}</div>
                            ) : (
                                <div className='flex h-full min-h-[140px] items-center justify-center rounded-[16px] border border-dashed border-default-200 bg-content1/60 px-[12px] py-[12px] text-default-500'>
                                    {t('pdf.compare_translation_waiting')}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
