import { Button, Chip } from '@nextui-org/react';
import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { MdOutlineCompareArrows } from 'react-icons/md';
import { LuArrowLeftRight, LuLink2, LuUnlink2, LuX } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';

import PdfViewerPane from './PdfViewerPane';

export default function PdfComparePane({
    viewerRef,
    documentName = '',
    viewerState = { currentPage: 0, pageCount: 0 },
    onPreviousPage,
    onNextPage,
    onFitWidth,
    onClose,
    syncPages = true,
    onToggleSyncPages,
    onSwapDocuments,
    onScrollStateChange,
    onViewerStateChange,
    onError,
}) {
    const { t } = useTranslation();

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
                            startContent={<MdOutlineCompareArrows className='text-[12px]' />}
                        >
                            {t('pdf.compare_mode')}
                        </Chip>
                        <div className='text-sm font-medium text-foreground truncate'>
                            {documentName || t('pdf.tab_untitled')}
                        </div>
                    </div>
                    <div className='mt-[4px] text-xs text-default-500'>
                        {t('pdf.compare_page_summary', {
                            page: viewerState?.currentPage || 0,
                            total: viewerState?.pageCount || 0,
                        })}
                    </div>
                </div>

                <div className='flex items-center gap-[6px]'>
                    <Button
                        isIconOnly
                        size='sm'
                        radius='full'
                        variant={syncPages ? 'flat' : 'light'}
                        color={syncPages ? 'primary' : 'default'}
                        onPress={() => onToggleSyncPages?.()}
                        title={syncPages ? t('pdf.compare_sync_disable') : t('pdf.compare_sync_enable')}
                    >
                        {syncPages ? <LuLink2 className='text-[14px]' /> : <LuUnlink2 className='text-[14px]' />}
                    </Button>
                    <Button
                        isIconOnly
                        size='sm'
                        radius='full'
                        variant='light'
                        onPress={onSwapDocuments}
                        title={t('pdf.compare_swap_documents')}
                    >
                        <LuArrowLeftRight className='text-[14px]' />
                    </Button>
                    <Button
                        isIconOnly
                        size='sm'
                        radius='full'
                        variant='light'
                        onPress={onPreviousPage}
                        isDisabled={!viewerState?.pageCount}
                    >
                        <FaChevronLeft className='text-[13px]' />
                    </Button>
                    <Button
                        size='sm'
                        radius='full'
                        variant='light'
                        onPress={onFitWidth}
                        isDisabled={!viewerState?.pageCount}
                    >
                        {Math.round((viewerState?.scale || 1) * 100)}%
                    </Button>
                    <Button
                        isIconOnly
                        size='sm'
                        radius='full'
                        variant='light'
                        onPress={onNextPage}
                        isDisabled={!viewerState?.pageCount}
                    >
                        <FaChevronRight className='text-[13px]' />
                    </Button>
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
            </div>

            <div className='min-h-0 flex-1'>
                <PdfViewerPane
                    ref={viewerRef}
                    trackSelection={false}
                    onSelectionTextChange={() => {}}
                    onDirtyChange={() => {}}
                    onAnnotationsChange={() => {}}
                    onOutlineChange={() => {}}
                    onSearchStateChange={() => {}}
                    onThumbnailsChange={() => {}}
                    onScrollStateChange={onScrollStateChange}
                    onViewerStateChange={onViewerStateChange}
                    onError={onError}
                />
            </div>
        </div>
    );
}
