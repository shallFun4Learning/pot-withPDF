import { Button, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Tooltip } from '@nextui-org/react';
import { AiOutlineFilePdf, AiOutlineSave } from 'react-icons/ai';
import { HiOutlineDocumentAdd, HiTranslate } from 'react-icons/hi';
import { MdHighlightAlt, MdOutlineCenterFocusStrong } from 'react-icons/md';
import { FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import React, { useState } from 'react';
import { LuHistory, LuPanelLeft, LuPanelLeftClose, LuSearch, LuX } from 'react-icons/lu';

export default function PdfToolbar({
    documentName,
    dirty,
    currentPage,
    pageCount,
    scale,
    interactionMode,
    focusMode,
    compareMode = '',
    compareDocumentName = '',
    compareCandidates = [],
    compareSyncPages = true,
    thumbnailSidebarVisible,
    recentFiles = [],
    searchQuery = '',
    searchCurrent = 0,
    searchTotal = 0,
    searchStatus = 'idle',
    onOpen,
    onOpenRecent,
    onClearRecentFiles,
    onSave,
    onSaveAs,
    onPreviousPage,
    onNextPage,
    onPageSubmit,
    onZoomIn,
    onZoomOut,
    onFitWidth,
    onChangeMode,
    onToggleFocusMode,
    onSelectTranslationCompare,
    onSelectCompareDocument,
    onClearCompareDocument,
    onToggleThumbnailSidebar,
    onSearchChange,
    onSearchNext,
    onSearchPrevious,
    onSearchClear,
}) {
    const { t } = useTranslation();
    const [pageInput, setPageInput] = useState('1');
    const hasRecentFiles = recentFiles.length > 0;
    const hasDocument = Boolean(documentName);
    const hasSearch = Boolean(searchQuery.trim());
    const isSearchPending = searchStatus === 'pending';
    const isSearchEmpty = hasSearch && !isSearchPending && searchTotal === 0;
    const translationCompareActive = compareMode === 'translation';
    const hasCompare = translationCompareActive || Boolean(compareDocumentName);
    const hasCompareCandidates = (compareCandidates || []).length > 0;

    React.useEffect(() => {
        setPageInput(String(currentPage || 1));
    }, [currentPage]);

    const searchSummary = !hasSearch
        ? null
        : isSearchPending
          ? t('pdf.search_loading')
          : isSearchEmpty
            ? t('pdf.search_no_results')
            : t('pdf.search_match_count', {
                  current: searchCurrent || 1,
                  total: searchTotal,
              });

    return (
        <div className='flex flex-wrap items-start gap-x-[12px] gap-y-[10px] border-b-1 border-default-100 bg-content1/90 px-[16px] py-[12px] backdrop-blur supports-[backdrop-filter]:bg-content1/75'>
            <div className='flex min-w-0 flex-1 flex-wrap items-center gap-[12px]'>
                <div className='flex shrink-0 items-center gap-[4px] rounded-full bg-default-100/80 p-[4px]'>
                    <Tooltip content={t('pdf.toggle_navigation_sidebar')}>
                        <Button
                            isIconOnly
                            aria-label={t('pdf.toggle_navigation_sidebar')}
                            radius='full'
                            variant='light'
                            onPress={onToggleThumbnailSidebar}
                        >
                            {thumbnailSidebarVisible ? (
                                <LuPanelLeftClose className='text-[18px]' />
                            ) : (
                                <LuPanelLeft className='text-[18px]' />
                            )}
                        </Button>
                    </Tooltip>
                    <Tooltip content={t('pdf.open')}>
                        <Button
                            isIconOnly
                            aria-label={t('pdf.open')}
                            radius='full'
                            variant='light'
                            onPress={onOpen}
                        >
                            <AiOutlineFilePdf className='text-[18px]' />
                        </Button>
                    </Tooltip>
                    <Dropdown placement='bottom-start'>
                        <DropdownTrigger>
                            <div>
                                <Tooltip content={t('pdf.recent_files')}>
                                    <Button
                                        isIconOnly
                                        aria-label={t('pdf.recent_files')}
                                        radius='full'
                                        variant='light'
                                        isDisabled={!hasRecentFiles}
                                    >
                                        <LuHistory className='text-[18px]' />
                                    </Button>
                                </Tooltip>
                            </div>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label={t('pdf.recent_files')}
                            disabledKeys={hasRecentFiles ? [] : ['empty']}
                            onAction={(key) => {
                                if (key === 'clear') {
                                    onClearRecentFiles?.();
                                    return;
                                }
                                onOpenRecent?.(String(key));
                            }}
                        >
                            {hasRecentFiles ? (
                                recentFiles.map((file) => (
                                    <DropdownItem
                                        key={file.path}
                                        textValue={`${file.name} ${file.path}`}
                                        description={file.path}
                                    >
                                        {file.name}
                                    </DropdownItem>
                                ))
                            ) : (
                                <DropdownItem
                                    key='empty'
                                    className='text-default-400'
                                >
                                    {t('pdf.recent_files_empty')}
                                </DropdownItem>
                            )}
                            {hasRecentFiles ? (
                                <DropdownItem
                                    key='clear'
                                    className='text-danger'
                                    color='danger'
                                >
                                    {t('pdf.clear_recent_files')}
                                </DropdownItem>
                            ) : null}
                        </DropdownMenu>
                    </Dropdown>
                    <Tooltip content={t('pdf.save')}>
                        <Button
                            isIconOnly
                            aria-label={t('pdf.save')}
                            radius='full'
                            variant='light'
                            onPress={onSave}
                            isDisabled={!documentName}
                        >
                            <AiOutlineSave className='text-[18px]' />
                        </Button>
                    </Tooltip>
                    <Tooltip content={t('pdf.save_as')}>
                        <Button
                            isIconOnly
                            aria-label={t('pdf.save_as')}
                            radius='full'
                            variant='light'
                            onPress={onSaveAs}
                            isDisabled={!documentName}
                        >
                            <HiOutlineDocumentAdd className='text-[18px]' />
                        </Button>
                    </Tooltip>
                </div>

                <div className='hidden h-[24px] w-px bg-default-200 xl:block' />

                <div className='flex shrink-0 items-center gap-[6px] rounded-full bg-default-100/70 px-[6px] py-[4px]'>
                    <Button
                        isIconOnly
                        aria-label='Previous page'
                        radius='full'
                        variant='light'
                        onPress={onPreviousPage}
                        isDisabled={pageCount === 0}
                    >
                        <FaChevronLeft className='text-[14px]' />
                    </Button>
                    <div className='flex w-[116px] items-center gap-[6px] xl:w-[132px]'>
                        <Input
                            aria-label={t('pdf.page')}
                            size='sm'
                            radius='full'
                            classNames={{ inputWrapper: 'bg-content1 shadow-none' }}
                            value={pageInput}
                            onChange={(event) => setPageInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    onPageSubmit(Number(pageInput));
                                }
                            }}
                        />
                        <span className='whitespace-nowrap text-sm text-default-500'>/ {pageCount || 0}</span>
                    </div>
                    <Button
                        isIconOnly
                        aria-label='Next page'
                        radius='full'
                        variant='light'
                        onPress={onNextPage}
                        isDisabled={pageCount === 0}
                    >
                        <FaChevronRight className='text-[14px]' />
                    </Button>
                </div>

                <div className='flex shrink-0 items-center gap-[4px] rounded-full bg-default-100/70 p-[4px]'>
                    <Button
                        isIconOnly
                        aria-label='Zoom out'
                        radius='full'
                        variant='light'
                        onPress={onZoomOut}
                        isDisabled={pageCount === 0}
                    >
                        <FiZoomOut className='text-[16px]' />
                    </Button>
                    <Button
                        aria-label='Fit width'
                        radius='full'
                        variant='light'
                        onPress={onFitWidth}
                        isDisabled={pageCount === 0}
                    >
                        {Math.round((scale || 1) * 100)}%
                    </Button>
                    <Button
                        isIconOnly
                        aria-label='Zoom in'
                        radius='full'
                        variant='light'
                        onPress={onZoomIn}
                        isDisabled={pageCount === 0}
                    >
                        <FiZoomIn className='text-[16px]' />
                    </Button>
                </div>

                <div className='order-last min-w-0 basis-full xl:order-none xl:min-w-[280px] xl:max-w-[420px] xl:flex-1'>
                    <div className='flex items-center gap-[8px] rounded-[22px] bg-default-100/70 px-[8px] py-[6px]'>
                        <Input
                            aria-label={t('pdf.search_placeholder')}
                            placeholder={t('pdf.search_placeholder')}
                            data-testid='pdf-search-input'
                            size='sm'
                            radius='full'
                            isDisabled={!hasDocument}
                            value={searchQuery}
                            onChange={(event) => onSearchChange?.(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    if (event.shiftKey) {
                                        onSearchPrevious?.();
                                        return;
                                    }
                                    onSearchNext?.();
                                }
                            }}
                            startContent={<LuSearch className='text-[16px] text-default-400' />}
                            endContent={
                                hasSearch ? (
                                    <Button
                                        isIconOnly
                                        aria-label='Clear search'
                                        radius='full'
                                        size='sm'
                                        variant='light'
                                        onPress={onSearchClear}
                                    >
                                        <LuX className='text-[14px]' />
                                    </Button>
                                ) : null
                            }
                            classNames={{
                                base: 'flex-1',
                                inputWrapper: 'bg-content1 shadow-none',
                            }}
                        />
                        <Button
                            isIconOnly
                            aria-label='Previous match'
                            radius='full'
                            variant='light'
                            onPress={onSearchPrevious}
                            isDisabled={!hasSearch || !hasDocument}
                        >
                            <FaChevronLeft className='text-[13px]' />
                        </Button>
                        <Button
                            isIconOnly
                            aria-label='Next match'
                            radius='full'
                            variant='light'
                            onPress={onSearchNext}
                            isDisabled={!hasSearch || !hasDocument}
                        >
                            <FaChevronRight className='text-[13px]' />
                        </Button>
                        {searchSummary ? (
                            <Chip
                                size='sm'
                                radius='full'
                                color={isSearchEmpty ? 'warning' : 'default'}
                                variant='flat'
                                className='hidden max-w-[140px] truncate 2xl:inline-flex'
                            >
                                {searchSummary}
                            </Chip>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className='flex min-w-0 flex-1 flex-wrap items-start justify-end gap-[12px]'>
                <div className='flex shrink-0 flex-wrap items-center gap-[4px] rounded-full bg-default-100/80 p-[4px]'>
                    <Tooltip content={t('pdf.shortcut_translate_mode')}>
                        <Button
                            aria-label={t('pdf.mode_translate')}
                            radius='full'
                            size='sm'
                            variant={interactionMode === 'translate' ? 'solid' : 'light'}
                            color={interactionMode === 'translate' ? 'primary' : 'default'}
                            startContent={<HiTranslate className='text-[16px]' />}
                            onPress={() => onChangeMode('translate')}
                        >
                            <span className='hidden xl:inline'>{t('pdf.mode_translate')}</span>
                        </Button>
                    </Tooltip>
                    <Tooltip content={t('pdf.shortcut_highlight_mode')}>
                        <Button
                            aria-label={t('pdf.mode_highlight')}
                            radius='full'
                            size='sm'
                            variant={interactionMode === 'highlight' ? 'solid' : 'light'}
                            color={interactionMode === 'highlight' ? 'warning' : 'default'}
                            startContent={<MdHighlightAlt className='text-[16px]' />}
                            onPress={() => onChangeMode('highlight')}
                        >
                            <span className='hidden xl:inline'>{t('pdf.mode_highlight')}</span>
                        </Button>
                    </Tooltip>
                    <Tooltip content={t('pdf.shortcut_focus_mode')}>
                        <Button
                            aria-label={t('pdf.focus_mode')}
                            radius='full'
                            size='sm'
                            variant={focusMode ? 'solid' : 'light'}
                            color={focusMode ? 'secondary' : 'default'}
                            startContent={<MdOutlineCenterFocusStrong className='text-[16px]' />}
                            onPress={() => onToggleFocusMode?.()}
                        >
                            <span className='hidden xl:inline'>{t('pdf.focus_mode')}</span>
                        </Button>
                    </Tooltip>
                    <Dropdown placement='bottom-end'>
                        <DropdownTrigger>
                            <div>
                                <Button
                                    aria-label={hasCompare ? t('pdf.compare_active') : t('pdf.compare_mode')}
                                    radius='full'
                                    size='sm'
                                    variant={hasCompare ? 'solid' : 'light'}
                                    color={hasCompare ? 'secondary' : 'default'}
                                    isDisabled={!hasCompare && !hasCompareCandidates}
                                >
                                    {hasCompare ? t('pdf.compare_active') : t('pdf.compare_mode')}
                                </Button>
                            </div>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label={t('pdf.compare_mode')}
                            disabledKeys={hasCompareCandidates ? [] : ['empty']}
                            onAction={(key) => {
                                if (key === 'clear') {
                                    onClearCompareDocument?.();
                                    return;
                                }
                                if (key === 'translation') {
                                    onSelectTranslationCompare?.();
                                    return;
                                }
                                onSelectCompareDocument?.(String(key));
                            }}
                        >
                            {hasCompare ? <DropdownItem key='clear'>{t('pdf.compare_stop')}</DropdownItem> : null}
                            {hasDocument ? (
                                <DropdownItem
                                    key='translation'
                                    textValue={t('pdf.compare_translation_mode')}
                                    description={t('pdf.compare_translation_description')}
                                >
                                    {t('pdf.compare_translation_mode')}
                                </DropdownItem>
                            ) : null}
                            {hasCompareCandidates ? (
                                compareCandidates.map((candidate) => (
                                    <DropdownItem
                                        key={candidate.path}
                                        textValue={`${candidate.name} ${candidate.path}`}
                                        description={candidate.path}
                                    >
                                        {candidate.name}
                                    </DropdownItem>
                                ))
                            ) : (
                                <DropdownItem key='empty'>
                                    {hasDocument ? t('pdf.compare_empty') : t('pdf.compare_disabled')}
                                </DropdownItem>
                            )}
                        </DropdownMenu>
                    </Dropdown>
                </div>
                <div className='min-w-0 basis-full text-left lg:basis-auto lg:flex-1 lg:text-right'>
                    <div className='max-w-full truncate text-sm font-medium text-foreground 2xl:max-w-[320px] lg:ml-auto'>
                        {documentName || t('pdf.no_document')}
                    </div>
                    {documentName ? (
                        <div className='mt-[4px] flex flex-wrap items-center gap-[6px] lg:justify-end'>
                            {translationCompareActive ? (
                                <Chip
                                    size='sm'
                                    radius='full'
                                    color='secondary'
                                    variant='flat'
                                >
                                    {t('pdf.compare_translation_chip')}
                                </Chip>
                            ) : null}
                            {!translationCompareActive && hasCompare ? (
                                <Chip
                                    size='sm'
                                    radius='full'
                                    color='secondary'
                                    variant='flat'
                                >
                                    {t('pdf.compare_with_short', { name: compareDocumentName })}
                                </Chip>
                            ) : null}
                            {!translationCompareActive && hasCompare ? (
                                <Chip
                                    size='sm'
                                    radius='full'
                                    color={compareSyncPages ? 'primary' : 'default'}
                                    variant='flat'
                                >
                                    {compareSyncPages ? t('pdf.compare_sync_short') : t('pdf.compare_free_short')}
                                </Chip>
                            ) : null}
                            <Chip
                                size='sm'
                                radius='full'
                                color={dirty ? 'warning' : 'success'}
                                variant='flat'
                            >
                                {dirty ? t('pdf.unsaved') : t('pdf.saved_state_clean')}
                            </Chip>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
