import { Button, Chip } from '@nextui-org/react';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import { LuListTree, LuPanelLeft } from 'react-icons/lu';

import { flattenOutlineItems } from '../utils/outline';

function SidebarModeButton({ active, children, onPress, icon: Icon, testId }) {
    return (
        <Button
            size='sm'
            radius='full'
            variant={active ? 'solid' : 'light'}
            color={active ? 'primary' : 'default'}
            startContent={Icon ? <Icon className='text-[14px]' /> : null}
            className='min-w-0'
            onPress={onPress}
            data-testid={testId}
        >
            {children}
        </Button>
    );
}

export default function PdfThumbnailSidebar({
    hasDocument = false,
    mode = 'pages',
    onModeChange,
    thumbnails,
    currentPage,
    onSelectPage,
    recentFiles = [],
    readingProgressMap = {},
    onOpenRecent,
    outline = [],
    onSelectOutlineItem,
    annotations = [],
    selectedAnnotationKey = '',
    onSelectAnnotation,
}) {
    const { t } = useTranslation();
    const outlineItems = useMemo(() => flattenOutlineItems(outline), [outline]);

    const sectionCopy = hasDocument
        ? {
              pages: {
                  eyebrow: t('pdf.navigation_eyebrow'),
                  title: t('pdf.page_thumbnails'),
                  description: t('pdf.page_thumbnails_description'),
              },
              outline: {
                  eyebrow: t('pdf.navigation_eyebrow'),
                  title: t('pdf.outline_title'),
                  description: t('pdf.outline_description'),
              },
              extracts: {
                  eyebrow: t('pdf.navigation_eyebrow'),
                  title: t('pdf.extracts_title'),
                  description: t('pdf.extracts_description'),
              },
          }[mode] || {
              eyebrow: t('pdf.navigation_eyebrow'),
              title: t('pdf.page_thumbnails'),
              description: t('pdf.page_thumbnails_description'),
          }
        : {
              eyebrow: t('pdf.recent_files'),
              title: t('pdf.recent_files_title'),
              description: t('pdf.recent_files_description'),
          };

    return (
        <aside className='min-h-0 overflow-hidden rounded-[28px] bg-content1/95 px-[14px] py-[16px] shadow-sm ring-1 ring-black/5 dark:ring-white/10 backdrop-blur'>
            <div className='pb-[12px] border-b-1 border-default-100'>
                <p className='text-[11px] uppercase tracking-[0.22em] text-default-400 mb-[8px]'>
                    {sectionCopy.eyebrow}
                </p>
                <div className='flex items-start justify-between gap-[10px]'>
                    <div>
                        <h2 className='text-[22px] font-semibold leading-[1.2] text-foreground'>{sectionCopy.title}</h2>
                        <p className='text-sm text-default-500 mt-[6px]'>{sectionCopy.description}</p>
                    </div>
                    {hasDocument ? (
                        <Chip
                            size='sm'
                            radius='full'
                            variant='flat'
                        >
                            {mode === 'pages'
                                ? t('pdf.page_count_badge', { count: thumbnails.length || currentPage || 0 })
                                : mode === 'outline'
                                  ? t('pdf.outline_count_badge', { count: outlineItems.length })
                                  : t('pdf.extract_count_badge', { count: annotations.length })}
                        </Chip>
                    ) : null}
                </div>
                {hasDocument ? (
                    <div className='mt-[14px] flex flex-wrap items-center gap-[6px] rounded-full bg-default-100/75 p-[4px]'>
                        <SidebarModeButton
                            active={mode === 'pages'}
                            onPress={() => onModeChange?.('pages')}
                            icon={LuPanelLeft}
                            testId='pdf-navigation-pages'
                        >
                            {t('pdf.navigation_pages')}
                        </SidebarModeButton>
                        <SidebarModeButton
                            active={mode === 'outline'}
                            onPress={() => onModeChange?.('outline')}
                            icon={LuListTree}
                            testId='pdf-navigation-outline'
                        >
                            {t('pdf.navigation_outline')}
                        </SidebarModeButton>
                        <SidebarModeButton
                            active={mode === 'extracts'}
                            onPress={() => onModeChange?.('extracts')}
                            icon={MdOutlineStickyNote2}
                            testId='pdf-navigation-extracts'
                        >
                            {t('pdf.navigation_extracts')}
                        </SidebarModeButton>
                    </div>
                ) : null}
            </div>

            <div className='mt-[14px] h-[calc(100%-120px)] overflow-y-auto pr-[4px] space-y-[10px]'>
                {hasDocument && mode === 'pages'
                    ? thumbnails.map((thumbnail) => {
                          const isActive = thumbnail.pageNumber === currentPage;
                          return (
                              <Button
                                  key={thumbnail.pageNumber}
                                  radius='lg'
                                  variant='light'
                                  className={`w-full h-auto justify-start px-[8px] py-[8px] ${
                                      isActive ? 'bg-primary/10 ring-1 ring-primary/25' : 'bg-default-50/50'
                                  }`}
                                  onPress={() => onSelectPage(thumbnail.pageNumber)}
                              >
                                  <div className='flex items-start gap-[10px] w-full'>
                                      <div className='w-[24px] pt-[10px] text-xs font-medium text-default-500 text-left shrink-0'>
                                          {thumbnail.pageNumber}
                                      </div>
                                      <div className='flex-1 rounded-[14px] bg-white dark:bg-content2 shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden'>
                                          {thumbnail.dataUrl ? (
                                              <img
                                                  src={thumbnail.dataUrl}
                                                  alt={`${t('pdf.page')} ${thumbnail.pageNumber}`}
                                                  className='block w-full h-auto'
                                              />
                                          ) : (
                                              <div className='aspect-[0.72/1] w-full bg-default-100 animate-pulse' />
                                          )}
                                      </div>
                                  </div>
                              </Button>
                          );
                      })
                    : null}

                {hasDocument && mode === 'outline'
                    ? outlineItems.map((item) => (
                          <button
                              key={item.id}
                              type='button'
                              className='w-full rounded-[18px] border border-default-100 bg-default-50/60 px-[12px] py-[10px] text-left transition hover:bg-default-100/70'
                              style={{ paddingLeft: 12 + item.depth * 16 }}
                              onClick={() => onSelectOutlineItem?.(item)}
                          >
                              <div className='flex items-start justify-between gap-[10px]'>
                                  <div className='min-w-0'>
                                      <div className='text-sm font-medium leading-[1.45] text-foreground line-clamp-2'>
                                          {item.title ||
                                              (item.pageNumber
                                                  ? t('pdf.outline_item_fallback', { page: item.pageNumber })
                                                  : t('pdf.outline_item_untitled'))}
                                      </div>
                                  </div>
                                  {item.pageNumber ? (
                                      <div className='shrink-0 rounded-full bg-default-100 px-[8px] py-[3px] text-[11px] text-default-500'>
                                          {t('pdf.outline_page_short', { page: item.pageNumber })}
                                      </div>
                                  ) : null}
                              </div>
                          </button>
                      ))
                    : null}

                {hasDocument && mode === 'extracts'
                    ? annotations.map((annotation) => {
                          const isSelected = annotation.annotationKey === selectedAnnotationKey;
                          return (
                              <button
                                  key={annotation.annotationKey}
                                  type='button'
                                  className={`w-full rounded-[18px] border px-[12px] py-[12px] text-left transition ${
                                      isSelected
                                          ? 'border-warning-300 bg-warning-50/70 dark:bg-warning-100/10'
                                          : 'border-default-100 bg-default-50/60 hover:bg-default-100/70'
                                  }`}
                                  onClick={() => onSelectAnnotation?.(annotation)}
                              >
                                  <div className='flex items-start gap-[10px]'>
                                      <div
                                          className='mt-[4px] h-[11px] w-[11px] shrink-0 rounded-full ring-1 ring-black/5 dark:ring-white/10'
                                          style={{ backgroundColor: annotation.color }}
                                      />
                                      <div className='min-w-0 flex-1'>
                                          <div className='flex items-center justify-between gap-[8px]'>
                                              <div className='text-[11px] uppercase tracking-[0.16em] text-default-400'>
                                                  {t('pdf.highlight_page_label', { page: annotation.pageNumber })}
                                              </div>
                                              {annotation.readerNote ? (
                                                  <Chip
                                                      size='sm'
                                                      radius='full'
                                                      color='warning'
                                                      variant='flat'
                                                  >
                                                      {t('pdf.reader_note_badge')}
                                                  </Chip>
                                              ) : null}
                                          </div>
                                          <div className='mt-[4px] text-sm font-medium leading-[1.5] text-foreground line-clamp-2'>
                                              {annotation.snippet ||
                                                  t('pdf.highlight_snippet_fallback', { page: annotation.pageNumber })}
                                          </div>
                                          {annotation.displayNote ? (
                                              <div className='mt-[4px] text-xs leading-[1.5] text-default-500 line-clamp-2'>
                                                  {annotation.displayNote}
                                              </div>
                                          ) : null}
                                      </div>
                                  </div>
                              </button>
                          );
                      })
                    : null}

                {!hasDocument
                    ? recentFiles.map((file) => (
                          <Button
                              key={file.path}
                              radius='lg'
                              variant='light'
                              className='w-full h-auto justify-start px-[12px] py-[10px] bg-default-50/60'
                              onPress={() => onOpenRecent?.(file.path)}
                          >
                              <div className='w-full text-left'>
                                  <div className='flex items-center justify-between gap-[8px]'>
                                      <div className='text-sm font-medium text-foreground truncate'>{file.name}</div>
                                      {readingProgressMap[file.path]?.pageNumber ? (
                                          <div className='shrink-0 rounded-full bg-default-100 px-[8px] py-[3px] text-[11px] text-default-500'>
                                              {t('pdf.resume_page', { page: readingProgressMap[file.path].pageNumber })}
                                          </div>
                                      ) : null}
                                  </div>
                                  <div className='mt-[4px] text-xs text-default-400 line-clamp-2 break-all'>{file.path}</div>
                              </div>
                          </Button>
                      ))
                    : null}

                {!hasDocument && recentFiles.length === 0 ? (
                    <div className='rounded-[18px] border-1 border-dashed border-default-200 px-[14px] py-[16px] text-sm text-default-500'>
                        <div className='font-medium text-foreground'>{t('pdf.recent_files_empty_title')}</div>
                        <p className='mt-[4px] leading-[1.55]'>{t('pdf.recent_files_empty_description')}</p>
                    </div>
                ) : null}

                {hasDocument && mode === 'outline' && outlineItems.length === 0 ? (
                    <div className='rounded-[18px] border-1 border-dashed border-default-200 px-[14px] py-[16px] text-sm text-default-500'>
                        <div className='font-medium text-foreground'>{t('pdf.outline_empty_title')}</div>
                        <p className='mt-[4px] leading-[1.55]'>{t('pdf.outline_empty_description')}</p>
                    </div>
                ) : null}

                {hasDocument && mode === 'extracts' && annotations.length === 0 ? (
                    <div className='rounded-[18px] border-1 border-dashed border-default-200 px-[14px] py-[16px] text-sm text-default-500'>
                        <div className='font-medium text-foreground'>{t('pdf.extracts_empty_title')}</div>
                        <p className='mt-[4px] leading-[1.55]'>{t('pdf.extracts_empty_description')}</p>
                    </div>
                ) : null}
            </div>
        </aside>
    );
}
