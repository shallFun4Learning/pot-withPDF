import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Tooltip } from '@nextui-org/react';
import React, { useState } from 'react';
import { AiOutlineFilePdf } from 'react-icons/ai';
import { LuHistory, LuMoreHorizontal, LuPin, LuPlus, LuX } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';

export default function PdfTabStrip({
    tabs = [],
    activeTabId,
    onSelectTab,
    onCloseTab,
    onOpenDocument,
    onTogglePinTab,
    onCloseOtherTabs,
    onCloseTabsToRight,
    onReorderTabs,
    recentlyClosedTabs = [],
    onRestoreClosedTab,
}) {
    const { t } = useTranslation();
    const [draggedTabId, setDraggedTabId] = useState('');
    const [dragOverTabId, setDragOverTabId] = useState('');
    const hasRecentlyClosed = recentlyClosedTabs.length > 0;

    return (
        <div className='flex items-center gap-[10px] border-b-1 border-default-100 bg-content1/80 px-[16px] py-[10px] backdrop-blur supports-[backdrop-filter]:bg-content1/65'>
            <div className='flex min-w-0 flex-1 items-center gap-[8px] overflow-x-auto pb-[2px]'>
                {tabs.map((tab, index) => {
                    const isActive = tab.id === activeTabId;
                    const isPinned = Boolean(tab.isPinned);
                    const hasTabsToRight = index < tabs.length - 1;
                    const isDragTarget = dragOverTabId === tab.id && draggedTabId && draggedTabId !== tab.id;

                    return (
                        <div
                            key={tab.id}
                            role='button'
                            tabIndex={0}
                            aria-pressed={isActive}
                            draggable
                            onClick={() => onSelectTab?.(tab.id)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onSelectTab?.(tab.id);
                                }
                            }}
                            onDragStart={(event) => {
                                setDraggedTabId(tab.id);
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData('text/plain', tab.id);
                            }}
                            onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = 'move';
                                if (dragOverTabId !== tab.id) {
                                    setDragOverTabId(tab.id);
                                }
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                const droppedTabId = draggedTabId || event.dataTransfer.getData('text/plain');
                                if (droppedTabId && droppedTabId !== tab.id) {
                                    onReorderTabs?.(droppedTabId, tab.id);
                                }
                                setDraggedTabId('');
                                setDragOverTabId('');
                            }}
                            onDragEnd={() => {
                                setDraggedTabId('');
                                setDragOverTabId('');
                            }}
                            className={`group flex min-w-[196px] max-w-[252px] items-center gap-[10px] rounded-[18px] border px-[12px] py-[10px] text-left transition ${
                                isActive
                                    ? 'border-primary/20 bg-primary/10 text-foreground shadow-sm'
                                    : isPinned
                                      ? 'border-secondary/20 bg-secondary/10 text-default-700'
                                      : 'border-default-100 bg-default-50/60 text-default-600 hover:bg-default-100/80'
                            } ${isDragTarget ? 'ring-2 ring-primary/25' : ''} ${
                                draggedTabId === tab.id ? 'opacity-75' : ''
                            }`}
                        >
                            <AiOutlineFilePdf
                                className={`shrink-0 text-[16px] ${
                                    isActive ? 'text-primary' : isPinned ? 'text-secondary-500' : 'text-default-400'
                                }`}
                            />
                            <div className='min-w-0 flex-1'>
                                <div className='flex items-center gap-[6px]'>
                                    <div className='truncate text-sm font-medium'>
                                        {tab.documentState?.documentName || tab.source?.name || t('pdf.tab_untitled')}
                                    </div>
                                    {isPinned ? (
                                        <Tooltip content={t('pdf.tab_pinned')}>
                                            <span className='shrink-0 text-secondary-500'>
                                                <LuPin className='text-[13px]' />
                                            </span>
                                        </Tooltip>
                                    ) : null}
                                </div>
                                <div className='mt-[3px] flex items-center gap-[6px] text-[11px] text-default-400'>
                                    {tab.documentState?.dirty ? (
                                        <>
                                            <span className='h-[7px] w-[7px] rounded-full bg-warning-400' />
                                            {t('pdf.saved_state_dirty')}
                                        </>
                                    ) : (
                                        t('pdf.saved_state_clean')
                                    )}
                                </div>
                            </div>

                            <Dropdown placement='bottom-end'>
                                <DropdownTrigger>
                                    <div>
                                        <Tooltip content={t('pdf.tab_actions')}>
                                            <Button
                                                isIconOnly
                                                aria-label={t('pdf.tab_actions')}
                                                radius='full'
                                                size='sm'
                                                variant='light'
                                                className='shrink-0'
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                <LuMoreHorizontal className='text-[14px]' />
                                            </Button>
                                        </Tooltip>
                                    </div>
                                </DropdownTrigger>
                                <DropdownMenu
                                    aria-label={t('pdf.tab_actions')}
                                    onAction={(key) => {
                                        if (key === 'pin') {
                                            onTogglePinTab?.(tab.id, !isPinned);
                                            return;
                                        }
                                        if (key === 'close-others') {
                                            onCloseOtherTabs?.(tab.id);
                                            return;
                                        }
                                        if (key === 'close-right') {
                                            onCloseTabsToRight?.(tab.id);
                                            return;
                                        }
                                        if (key === 'close') {
                                            onCloseTab?.(tab.id);
                                        }
                                    }}
                                >
                                    <DropdownItem key='pin'>
                                        {isPinned ? t('pdf.tab_unpin') : t('pdf.tab_pin')}
                                    </DropdownItem>
                                    <DropdownItem key='close-others'>{t('pdf.tab_close_others')}</DropdownItem>
                                    <DropdownItem
                                        key='close-right'
                                        isDisabled={!hasTabsToRight}
                                    >
                                        {t('pdf.tab_close_to_right')}
                                    </DropdownItem>
                                    <DropdownItem
                                        key='close'
                                        className='text-danger'
                                        color='danger'
                                    >
                                        {t('pdf.close_tab')}
                                    </DropdownItem>
                                </DropdownMenu>
                            </Dropdown>

                            {!isPinned ? (
                                <Tooltip content={t('pdf.close_tab')}>
                                    <Button
                                        isIconOnly
                                        aria-label={t('pdf.close_tab')}
                                        radius='full'
                                        size='sm'
                                        variant='light'
                                        className='shrink-0'
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onCloseTab?.(tab.id);
                                        }}
                                    >
                                        <LuX className='text-[14px]' />
                                    </Button>
                                </Tooltip>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            <Dropdown placement='bottom-end'>
                <DropdownTrigger>
                    <div>
                        <Tooltip content={t('pdf.restore_closed_tab')}>
                            <Button
                                isIconOnly
                                aria-label={t('pdf.restore_closed_tab')}
                                radius='full'
                                variant='light'
                                isDisabled={!hasRecentlyClosed}
                            >
                                <LuHistory className='text-[16px]' />
                            </Button>
                        </Tooltip>
                    </div>
                </DropdownTrigger>
                <DropdownMenu
                    aria-label={t('pdf.restore_closed_tab')}
                    disabledKeys={hasRecentlyClosed ? [] : ['empty']}
                    onAction={(key) => {
                        onRestoreClosedTab?.(String(key));
                    }}
                >
                    {hasRecentlyClosed
                        ? recentlyClosedTabs.map((tab) => (
                              <DropdownItem
                                  key={tab.id}
                                  textValue={`${tab.documentName} ${tab.path}`}
                                  description={tab.path}
                              >
                                  {tab.documentName || t('pdf.tab_untitled')}
                              </DropdownItem>
                          ))
                        : (
                              <DropdownItem key='empty'>{t('pdf.restore_closed_empty')}</DropdownItem>
                          )}
                </DropdownMenu>
            </Dropdown>

            <Tooltip content={t('pdf.new_tab')}>
                <Button
                    isIconOnly
                    aria-label={t('pdf.new_tab')}
                    radius='full'
                    variant='flat'
                    color='primary'
                    onPress={onOpenDocument}
                >
                    <LuPlus className='text-[16px]' />
                </Button>
            </Tooltip>
        </div>
    );
}
