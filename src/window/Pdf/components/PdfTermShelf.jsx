import { Button, Chip, Input, Textarea, Tooltip } from '@nextui-org/react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiTranslate } from 'react-icons/hi';
import { LuBookMarked, LuSearch, LuTrash2 } from 'react-icons/lu';

export default function PdfTermShelf({
    selectionText = '',
    terms = [],
    selectionTerm = null,
    onAddSelection,
    onUseTerm,
    onUpdateTerm,
    onDeleteTerm,
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [activeTermId, setActiveTermId] = useState('');

    const filteredTerms = useMemo(() => {
        const normalizedQuery = String(query || '').trim().toLocaleLowerCase();
        if (!normalizedQuery) {
            return terms;
        }

        return terms.filter((term) =>
            [term.sourceText, term.preferredTranslation, term.note]
                .filter(Boolean)
                .some((value) => String(value).toLocaleLowerCase().includes(normalizedQuery))
        );
    }, [query, terms]);

    useEffect(() => {
        if (selectionTerm?.id) {
            setActiveTermId(selectionTerm.id);
            return;
        }

        const availableTerms = filteredTerms.length > 0 ? filteredTerms : terms;
        if (!availableTerms.some((term) => term.id === activeTermId)) {
            setActiveTermId(availableTerms[0]?.id || '');
        }
    }, [activeTermId, filteredTerms, selectionTerm?.id, terms]);

    const activeTerm =
        filteredTerms.find((term) => term.id === activeTermId) ||
        terms.find((term) => term.id === activeTermId) ||
        filteredTerms[0] ||
        terms[0] ||
        null;

    return (
        <div className='mt-[14px] rounded-[22px] border border-default-100 bg-default-50/65 px-[14px] py-[14px]'>
            <div className='flex items-start justify-between gap-[10px]'>
                <div>
                    <div className='text-[11px] uppercase tracking-[0.18em] text-default-400'>
                        {t('pdf.term_bank_eyebrow')}
                    </div>
                    <div className='mt-[4px] text-sm font-semibold text-foreground'>{t('pdf.term_bank_title')}</div>
                    <div className='mt-[3px] text-xs leading-[1.55] text-default-500 max-w-[32ch]'>
                        {t('pdf.term_bank_description')}
                    </div>
                </div>
                <Chip
                    size='sm'
                    radius='full'
                    variant='flat'
                >
                    {t('pdf.term_bank_count', { count: terms.length })}
                </Chip>
            </div>

            <div className='mt-[12px] flex items-center gap-[8px]'>
                <Tooltip
                    content={
                        selectionTerm ? t('pdf.term_bank_selection_saved') : t('pdf.term_bank_add_selection')
                    }
                >
                    <div>
                        <Button
                            size='sm'
                            radius='full'
                            variant={selectionTerm ? 'flat' : 'solid'}
                            color={selectionTerm ? 'success' : 'primary'}
                            startContent={<LuBookMarked className='text-[15px]' />}
                            onPress={onAddSelection}
                            isDisabled={!selectionText.trim() || Boolean(selectionTerm)}
                            data-testid='pdf-add-selection-to-terms'
                        >
                            {selectionTerm ? t('pdf.term_bank_saved_short') : t('pdf.term_bank_add_short')}
                        </Button>
                    </div>
                </Tooltip>

                {selectionTerm ? (
                    <div className='text-xs text-success-600 dark:text-success-400'>
                        {t('pdf.term_bank_selection_saved_hint')}
                    </div>
                ) : (
                    <div className='text-xs text-default-500'>{t('pdf.term_bank_add_hint')}</div>
                )}
            </div>

            {terms.length > 0 ? (
                <div className='mt-[12px]'>
                    <Input
                        aria-label={t('pdf.term_bank_search_placeholder')}
                        placeholder={t('pdf.term_bank_search_placeholder')}
                        size='sm'
                        radius='full'
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        startContent={<LuSearch className='text-[15px] text-default-400' />}
                        classNames={{
                            inputWrapper: 'bg-content1 shadow-none',
                        }}
                    />
                </div>
            ) : null}

            {terms.length === 0 ? (
                <div className='mt-[12px] rounded-[18px] border border-dashed border-default-200 px-[12px] py-[14px] text-sm text-default-500'>
                    <div className='font-medium text-foreground'>{t('pdf.term_bank_empty_title')}</div>
                    <p className='mt-[4px] leading-[1.55]'>{t('pdf.term_bank_empty_description')}</p>
                </div>
            ) : filteredTerms.length === 0 ? (
                <div className='mt-[12px] rounded-[18px] border border-dashed border-default-200 px-[12px] py-[14px] text-sm text-default-500'>
                    <div className='font-medium text-foreground'>{t('pdf.term_bank_empty_filter_title')}</div>
                    <p className='mt-[4px] leading-[1.55]'>{t('pdf.term_bank_empty_filter_description')}</p>
                </div>
            ) : (
                <>
                    <div className='mt-[12px] max-h-[190px] overflow-y-auto pr-[4px] space-y-[8px]'>
                        {filteredTerms.map((term) => {
                            const isActive = term.id === activeTerm?.id;
                            const isCurrentSelection = selectionTerm?.id === term.id;

                            return (
                                <button
                                    key={term.id}
                                    type='button'
                                    onClick={() => setActiveTermId(term.id)}
                                    className={`w-full rounded-[18px] border px-[12px] py-[10px] text-left transition ${
                                        isActive
                                            ? 'border-primary/20 bg-primary/10'
                                            : 'border-default-100 bg-content1/75 hover:bg-default-100/70'
                                    }`}
                                >
                                    <div className='flex items-start justify-between gap-[10px]'>
                                        <div className='min-w-0'>
                                            <div className='text-sm font-medium leading-[1.45] text-foreground line-clamp-2'>
                                                {term.sourceText}
                                            </div>
                                            <div className='mt-[4px] text-xs leading-[1.5] text-default-500 line-clamp-2'>
                                                {term.preferredTranslation ||
                                                    term.note ||
                                                    t('pdf.term_bank_item_placeholder')}
                                            </div>
                                        </div>
                                        {isCurrentSelection ? (
                                            <Chip
                                                size='sm'
                                                radius='full'
                                                color='success'
                                                variant='flat'
                                            >
                                                {t('pdf.term_bank_current_selection')}
                                            </Chip>
                                        ) : null}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {activeTerm ? (
                        <div className='mt-[12px] rounded-[18px] border border-default-100 bg-content1/80 px-[12px] py-[12px]'>
                            <div className='text-sm font-semibold text-foreground line-clamp-2'>{activeTerm.sourceText}</div>
                            <div className='mt-[10px] space-y-[10px]'>
                                <Input
                                    aria-label={t('pdf.term_bank_translation_label')}
                                    label={t('pdf.term_bank_translation_label')}
                                    labelPlacement='outside'
                                    placeholder={t('pdf.term_bank_translation_placeholder')}
                                    radius='lg'
                                    value={activeTerm.preferredTranslation || ''}
                                    onValueChange={(value) =>
                                        onUpdateTerm?.(activeTerm, {
                                            preferredTranslation: value,
                                        })
                                    }
                                    classNames={{
                                        inputWrapper: 'bg-default-50/80 shadow-none',
                                    }}
                                />
                                <Textarea
                                    aria-label={t('pdf.term_bank_note_label')}
                                    label={t('pdf.term_bank_note_label')}
                                    labelPlacement='outside'
                                    minRows={3}
                                    radius='lg'
                                    placeholder={t('pdf.term_bank_note_placeholder')}
                                    value={activeTerm.note || ''}
                                    onValueChange={(value) =>
                                        onUpdateTerm?.(activeTerm, {
                                            note: value,
                                        })
                                    }
                                    classNames={{
                                        inputWrapper: 'bg-default-50/80 shadow-none',
                                    }}
                                />
                            </div>

                            <div className='mt-[12px] flex items-center justify-between gap-[8px]'>
                                <Button
                                    size='sm'
                                    radius='full'
                                    color='primary'
                                    variant='flat'
                                    startContent={<HiTranslate className='text-[15px]' />}
                                    onPress={() => onUseTerm?.(activeTerm)}
                                >
                                    {t('pdf.term_bank_use')}
                                </Button>
                                <Button
                                    size='sm'
                                    radius='full'
                                    color='danger'
                                    variant='light'
                                    startContent={<LuTrash2 className='text-[15px]' />}
                                    onPress={() => onDeleteTerm?.(activeTerm)}
                                >
                                    {t('pdf.term_bank_delete')}
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
