import { listen } from '@tauri-apps/api/event';
import { Button, Spacer, Switch, Tooltip } from '@nextui-org/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { writeText } from '@tauri-apps/api/clipboard';
import { HiTranslate } from 'react-icons/hi';
import { MdContentCopy, MdFormatQuote, MdHighlightAlt } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';
import { useAtom, useAtomValue } from 'jotai';
import toast from 'react-hot-toast';

import LanguageArea from '../../Translate/components/LanguageArea';
import TargetArea from '../../Translate/components/TargetArea';
import { detectLanguageAtom, sourceTextAtom } from '../../Translate/state';
import PdfSourceArea from './PdfSourceArea';
import PdfTermShelf from './PdfTermShelf';
import { splitPrimaryTranslationServices } from '../utils/translationLayout';
import {
    addPdfDocumentTerm,
    findPdfTermByText,
    getPdfDocumentTerms,
    normalizePdfTermBankMap,
    removePdfDocumentTerm,
    updatePdfDocumentTerm,
} from '../utils/terms';
import { loadPluginList, loadServiceInstanceConfigMap } from '../../shared/serviceRegistry';
import { useConfig } from '../../../hooks';
import { store } from '../../../utils/store';
import detect from '../../../utils/lang_detect';
import { createPdfCitationCopyText } from '../utils/quotes';
import { flattenTranslationResult } from '../utils/translationCompare';
import * as builtinServices from '../../../services/translate';
import { getDisplayInstanceName, getServiceName, whetherPluginService, INSTANCE_NAME_CONFIG_KEY } from '../../../utils/service_instance';

let unlisten = null;

export default function PdfTranslateSidebar({
    documentPath = '',
    documentName = '',
    currentPage = 0,
    selectionText,
    autoTranslateSelection,
    onAutoTranslateSelectionChange,
    onRequestHighlightMode,
    onTranslationCompareStateChange,
    sessionKey = 'default',
}) {
    const [translateServiceInstanceList] = useConfig('translate_service_list', [
        'deepl',
        'bing',
        'lingva',
        'yandex',
        'google',
        'ecdict',
    ]);
    const [recognizeServiceInstanceList] = useConfig('recognize_service_list', ['system', 'tesseract']);
    const [ttsServiceInstanceList] = useConfig('tts_service_list', ['lingva_tts']);
    const [collectionServiceInstanceList] = useConfig('collection_service_list', []);
    const [pluginList, setPluginList] = useState(null);
    const [serviceInstanceConfigMap, setServiceInstanceConfigMap] = useState(null);
    const [showMoreServices, setShowMoreServices] = useState(false);
    const [primaryTranslationState, setPrimaryTranslationState] = useState({
        serviceInstanceKey: '',
        result: '',
        error: '',
        isLoading: false,
    });
    const [termBankMap, setTermBankMap, getTermBankMap] = useConfig('pdf_term_bank_map', {});
    const [, setSourceText] = useAtom(sourceTextAtom);
    const sourceText = useAtomValue(sourceTextAtom);
    const [, setDetectLanguage] = useAtom(detectLanguageAtom);
    const { t } = useTranslation();

    const reloadPluginList = async () => {
        setPluginList(await loadPluginList());
    };

    const reloadServiceInstanceConfigMap = async () => {
        setServiceInstanceConfigMap(
            await loadServiceInstanceConfigMap({
                store,
                translateServiceInstanceList,
                recognizeServiceInstanceList,
                ttsServiceInstanceList,
                collectionServiceInstanceList,
            })
        );
    };

    useEffect(() => {
        reloadPluginList();
        if (!unlisten) {
            unlisten = listen('reload_plugin_list', reloadPluginList);
        }
    }, []);

    useEffect(() => {
        if (
            translateServiceInstanceList !== null &&
            recognizeServiceInstanceList !== null &&
            ttsServiceInstanceList !== null &&
            collectionServiceInstanceList !== null
        ) {
            reloadServiceInstanceConfigMap();
        }
    }, [
        translateServiceInstanceList,
        recognizeServiceInstanceList,
        ttsServiceInstanceList,
        collectionServiceInstanceList,
    ]);

    useEffect(() => {
        if ((translateServiceInstanceList?.length || 0) <= 1) {
            setShowMoreServices(false);
        }
    }, [translateServiceInstanceList]);

    const { primaryService, secondaryServices } = useMemo(
        () => splitPrimaryTranslationServices(translateServiceInstanceList),
        [translateServiceInstanceList]
    );
    const activePrimaryServiceInstanceKey = primaryTranslationState?.serviceInstanceKey || primaryService;
    const primaryServiceLabel = useMemo(() => {
        if (!activePrimaryServiceInstanceKey || !pluginList || serviceInstanceConfigMap === null) {
            return '';
        }

        const instanceConfig = serviceInstanceConfigMap?.[activePrimaryServiceInstanceKey] ?? {};
        if (whetherPluginService(activePrimaryServiceInstanceKey)) {
            const serviceName = getServiceName(activePrimaryServiceInstanceKey);
            const pluginInfo = pluginList?.translate?.[serviceName];
            return getDisplayInstanceName(instanceConfig[INSTANCE_NAME_CONFIG_KEY], () => pluginInfo?.display || serviceName);
        }

        const serviceName = getServiceName(activePrimaryServiceInstanceKey);
        const translatedTitle = t(`services.translate.${serviceName}.title`);
        return getDisplayInstanceName(instanceConfig[INSTANCE_NAME_CONFIG_KEY], () =>
            translatedTitle === `services.translate.${serviceName}.title`
                ? builtinServices[serviceName]?.info?.name || serviceName
                : translatedTitle
        );
    }, [activePrimaryServiceInstanceKey, pluginList, serviceInstanceConfigMap, t]);
    const primaryTranslationText = useMemo(
        () => flattenTranslationResult(primaryTranslationState?.result),
        [primaryTranslationState?.result]
    );
    const normalizedTermBankMap = useMemo(() => normalizePdfTermBankMap(termBankMap), [termBankMap]);
    const documentTerms = useMemo(
        () => getPdfDocumentTerms(normalizedTermBankMap, documentPath, documentName),
        [documentName, documentPath, normalizedTermBankMap]
    );
    const selectionTerm = useMemo(
        () => findPdfTermByText(documentTerms, selectionText),
        [documentTerms, selectionText]
    );

    const updateTermBankState = useCallback(
        (nextMap) => {
            setTermBankMap(nextMap, true);
        },
        [setTermBankMap]
    );

    const handleAddSelectionToTerms = useCallback(() => {
        const { termBankMap: nextMap, existed } = addPdfDocumentTerm(getTermBankMap() || termBankMap, {
            path: documentPath,
            documentName,
            sourceText: selectionText,
        });

        updateTermBankState(nextMap);
        toast.success(existed ? t('pdf.term_bank_exists') : t('pdf.term_bank_added'));
    }, [documentName, documentPath, getTermBankMap, selectionText, t, termBankMap, updateTermBankState]);

    const handleDeleteTerm = useCallback(
        (term) => {
            if (!term?.id) {
                return;
            }
            updateTermBankState(
                removePdfDocumentTerm(getTermBankMap() || termBankMap, {
                    path: documentPath,
                    documentName,
                    termId: term.id,
                })
            );
            toast.success(t('pdf.term_bank_deleted'));
        },
        [documentName, documentPath, getTermBankMap, t, termBankMap, updateTermBankState]
    );

    const handleUpdateTerm = useCallback(
        (term, patch) => {
            if (!term?.id) {
                return;
            }

            updateTermBankState(
                updatePdfDocumentTerm(getTermBankMap() || termBankMap, {
                    path: documentPath,
                    documentName,
                    termId: term.id,
                    patch,
                })
            );
        },
        [documentName, documentPath, getTermBankMap, termBankMap, updateTermBankState]
    );

    const handleUseTerm = useCallback(
        async (term) => {
            if (!term?.sourceText) {
                return;
            }
            setSourceText(term.sourceText);
            setDetectLanguage(await detect(term.sourceText));
            toast.success(t('pdf.term_bank_applied'));
        },
        [setDetectLanguage, setSourceText, t]
    );

    const handleCopySelectionWithCitation = useCallback(async () => {
        if (!selectionText.trim()) {
            return;
        }

        await writeText(
            createPdfCitationCopyText(
                {
                    snippet: selectionText,
                    pageNumber: currentPage,
                },
                { documentName, documentPath }
            )
        );
        toast.success(t('pdf.copy_citation_success'));
    }, [currentPage, documentName, documentPath, selectionText, t]);

    useEffect(() => {
        onTranslationCompareStateChange?.({
            sourceText: String(sourceText || '').trim(),
            selectionText: String(selectionText || '').trim(),
            resultText: primaryTranslationText,
            serviceLabel: primaryServiceLabel,
            isLoading: Boolean(primaryTranslationState?.isLoading),
            error: String(primaryTranslationState?.error || '').trim(),
        });
    }, [
        onTranslationCompareStateChange,
        primaryServiceLabel,
        primaryTranslationState?.error,
        primaryTranslationState?.isLoading,
        primaryTranslationText,
        selectionText,
        sourceText,
    ]);

    if (!pluginList || serviceInstanceConfigMap === null || translateServiceInstanceList === null) {
        return null;
    }

    const translateStatusText = !selectionText
        ? t('pdf.selection_empty')
        : autoTranslateSelection
          ? t('pdf.selection_ready')
          : t('pdf.manual_translate_ready');

    return (
        <div className='h-full flex flex-col'>
            <div className='pb-[16px] border-b-1 border-default-100'>
                <p className='text-[11px] uppercase tracking-[0.22em] text-default-400 mb-[8px]'>
                    {t('pdf.translate_panel_eyebrow')}
                </p>
                <div className='flex items-start justify-between gap-[12px]'>
                    <div>
                        <h2 className='text-[24px] font-semibold leading-[1.2] text-foreground'>
                            {t('pdf.translate_panel_title')}
                        </h2>
                        <p className='text-sm text-default-500 mt-[6px] max-w-[28ch]'>
                            {t('pdf.translate_panel_description')}
                        </p>
                    </div>
                </div>

                <div className='mt-[16px] rounded-[20px] border-1 border-default-100 bg-default-50/70 dark:bg-default-100/5 px-[14px] py-[14px]'>
                    <div className='flex items-center justify-between gap-[8px]'>
                        <div className='text-[11px] uppercase tracking-[0.18em] text-default-400'>
                            {t('pdf.selected_text')}
                        </div>
                        <div className='flex items-center gap-[4px]'>
                            <Tooltip content={t('pdf.copy_selection')}>
                                <Button
                                    isIconOnly
                                    size='sm'
                                    radius='full'
                                    variant='light'
                                    onPress={() => writeText(selectionText)}
                                    isDisabled={!selectionText}
                                >
                                    <MdContentCopy className='text-[16px]' />
                                </Button>
                            </Tooltip>
                            <Tooltip content={t('pdf.copy_selection_with_page')}>
                                <Button
                                    isIconOnly
                                    size='sm'
                                    radius='full'
                                    variant='light'
                                    onPress={handleCopySelectionWithCitation}
                                    isDisabled={!selectionText}
                                >
                                    <MdFormatQuote className='text-[16px]' />
                                </Button>
                            </Tooltip>
                            <Tooltip content={t('pdf.enter_highlight_mode')}>
                                <Button
                                    isIconOnly
                                    size='sm'
                                    radius='full'
                                    variant='light'
                                    onPress={onRequestHighlightMode}
                                    isDisabled={!selectionText}
                                >
                                    <MdHighlightAlt className='text-[16px]' />
                                </Button>
                            </Tooltip>
                            <Tooltip
                                content={
                                    selectionTerm ? t('pdf.term_bank_selection_saved') : t('pdf.term_bank_add_selection')
                                }
                            >
                                <Button
                                    size='sm'
                                    radius='full'
                                    variant={selectionTerm ? 'flat' : 'light'}
                                    color={selectionTerm ? 'success' : 'default'}
                                    onPress={handleAddSelectionToTerms}
                                    isDisabled={!selectionText.trim() || Boolean(selectionTerm)}
                                >
                                    {selectionTerm ? t('pdf.term_bank_saved_short') : t('pdf.term_bank_add_short')}
                                </Button>
                            </Tooltip>
                        </div>
                    </div>
                    <p
                        data-testid='selection-text'
                        className='mt-[10px] text-sm leading-[1.65] text-default-700 dark:text-default-500 min-h-[48px] line-clamp-3'
                    >
                        {selectionText || t('pdf.selected_text_placeholder')}
                    </p>
                </div>

                <div className='mt-[12px] flex items-center justify-between gap-[12px] rounded-[18px] bg-content2/80 px-[14px] py-[12px]'>
                    <div>
                        <div className='text-sm font-medium text-foreground'>{t('pdf.auto_translate_selection')}</div>
                        <div className='text-xs text-default-500 mt-[2px]'>
                            {t('pdf.auto_translate_selection_hint')}
                        </div>
                    </div>
                    <Switch
                        isSelected={autoTranslateSelection}
                        onValueChange={onAutoTranslateSelectionChange}
                        size='sm'
                    />
                </div>
            </div>

            <div className='pt-[16px]'>
                <LanguageArea />
            </div>
            <Spacer y={3} />
            <PdfSourceArea
                sessionKey={sessionKey}
                selectionText={selectionText}
                autoTranslateSelection={autoTranslateSelection}
            />
            <Spacer y={3} />
            <PdfTermShelf
                selectionText={selectionText}
                terms={documentTerms}
                selectionTerm={selectionTerm}
                onAddSelection={handleAddSelectionToTerms}
                onUseTerm={handleUseTerm}
                onUpdateTerm={handleUpdateTerm}
                onDeleteTerm={handleDeleteTerm}
            />
            <Spacer y={3} />
            <div className='flex items-center justify-between px-[4px]'>
                <div>
                    <div className='text-sm font-semibold text-foreground'>{t('pdf.translate_primary_title')}</div>
                    <div className='text-xs text-default-500'>{t('pdf.translate_results_description')}</div>
                </div>
                <div className='flex items-center gap-[6px] text-xs text-default-500'>
                    <HiTranslate className='text-[15px]' />
                    {translateStatusText}
                </div>
            </div>
            <div className='flex-1 overflow-y-auto mt-[10px] pr-[2px]'>
                {primaryService ? (
                    <div className='mb-[12px]' data-testid='pdf-primary-translation'>
                        <TargetArea
                            index={0}
                            name={primaryService}
                            translateServiceInstanceList={translateServiceInstanceList}
                            pluginList={pluginList}
                            serviceInstanceConfigMap={serviceInstanceConfigMap}
                            onResultChange={setPrimaryTranslationState}
                        />
                    </div>
                ) : null}

                {secondaryServices.length > 0 ? (
                    <div className='rounded-[20px] border-1 border-default-100 bg-default-50/55 px-[12px] py-[12px]'>
                        <button
                            type='button'
                            className='flex w-full items-center justify-between gap-[12px] text-left'
                            onClick={() => setShowMoreServices((current) => !current)}
                            data-testid='pdf-toggle-more-translations'
                        >
                            <div>
                                <div className='text-sm font-semibold text-foreground'>
                                    {t('pdf.translate_additional_title')}
                                </div>
                                <div className='text-xs text-default-500 mt-[2px]'>
                                    {showMoreServices
                                        ? t('pdf.translate_additional_description_expanded', {
                                              count: secondaryServices.length,
                                          })
                                        : t('pdf.translate_additional_description_collapsed', {
                                              count: secondaryServices.length,
                                          })}
                                </div>
                            </div>
                            <div className='flex items-center gap-[6px] text-xs text-default-500'>
                                {showMoreServices ? (
                                    <LuChevronUp className='text-[16px]' />
                                ) : (
                                    <LuChevronDown className='text-[16px]' />
                                )}
                                {showMoreServices
                                    ? t('pdf.translate_hide_more_services')
                                    : t('pdf.translate_show_more_services')}
                            </div>
                        </button>

                        {showMoreServices ? (
                            <div className='mt-[12px] space-y-[12px]' data-testid='pdf-additional-translations'>
                                {secondaryServices.map(({ instanceKey, index }) => (
                                    <TargetArea
                                        key={instanceKey}
                                        index={index}
                                        name={instanceKey}
                                        translateServiceInstanceList={translateServiceInstanceList}
                                        pluginList={pluginList}
                                        serviceInstanceConfigMap={serviceInstanceConfigMap}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
