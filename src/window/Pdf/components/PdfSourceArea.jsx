import { Button, Card, CardBody, CardFooter, ButtonGroup, Chip, Tooltip } from '@nextui-org/react';
import React, { useEffect, useRef } from 'react';
import { writeText } from '@tauri-apps/api/clipboard';
import { HiOutlineVolumeUp, HiTranslate } from 'react-icons/hi';
import { MdContentCopy, MdSmartButton } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { LuDelete } from 'react-icons/lu';
import { useAtom } from 'jotai';

import { detectLanguageAtom, sourceTextAtom } from '../../Translate/state';
import { useConfig, useSyncAtom, useVoice } from '../../../hooks';
import detect from '../../../utils/lang_detect';

export default function PdfSourceArea({ selectionText, autoTranslateSelection, sessionKey = 'default' }) {
    const [appFontSize] = useConfig('app_font_size', 16);
    const [dynamicTranslate] = useConfig('dynamic_translate', false);
    const [sourceText, setSourceText, syncSourceText] = useSyncAtom(sourceTextAtom);
    const [detectLanguage, setDetectLanguage] = useAtom(detectLanguageAtom);
    const { t } = useTranslation();
    const textAreaRef = useRef(null);
    const sourceTextChangeTimerRef = useRef(null);
    const speak = useVoice();

    useEffect(() => {
        if (
            typeof selectionText === 'string' &&
            selectionText.trim() !== '' &&
            selectionText.trim() !== sourceText.trim()
        ) {
            const nextText = selectionText.trim();
            setSourceText(nextText);
            detect(nextText).then((language) => {
                setDetectLanguage(language);
                if (autoTranslateSelection) {
                    syncSourceText();
                }
            });
        }
    }, [selectionText, sourceText, autoTranslateSelection, setSourceText, setDetectLanguage, syncSourceText]);

    useEffect(() => {
        const nextText = String(selectionText || '').trim();
        setSourceText(nextText);
        if (!nextText) {
            setDetectLanguage('');
            syncSourceText();
        }
    }, [sessionKey, selectionText, setDetectLanguage, setSourceText, syncSourceText]);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = '50px';
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }, [sourceText]);

    useEffect(
        () => () => {
            if (sourceTextChangeTimerRef.current) {
                clearTimeout(sourceTextChangeTimerRef.current);
            }
        },
        []
    );

    const detectLanguageAndSync = async (text) => {
        setDetectLanguage(await detect(text));
        syncSourceText();
    };

    const changeSourceText = async (text) => {
        setDetectLanguage('');
        setSourceText(text);
        if (dynamicTranslate) {
            if (sourceTextChangeTimerRef.current) {
                clearTimeout(sourceTextChangeTimerRef.current);
            }
            sourceTextChangeTimerRef.current = setTimeout(() => {
                detectLanguageAndSync(text);
            }, 1000);
        }
    };

    const clearSourceText = () => {
        setSourceText('');
        setDetectLanguage('');
        syncSourceText();
    };

    return (
        <Card
            shadow='none'
            className='bg-content1 border-1 border-default-100 rounded-[20px] pb-0'
        >
            <CardBody className='bg-content1 p-[14px] pb-0 max-h-[25vh] overflow-y-auto'>
                <textarea
                    ref={textAreaRef}
                    data-testid='pdf-source-text'
                    className={`text-[${appFontSize}px] bg-content1 h-full resize-none outline-none w-full leading-[1.6]`}
                    placeholder={t('pdf.selected_text_placeholder')}
                    value={sourceText}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            detectLanguageAndSync(sourceText);
                        }
                    }}
                    onChange={(event) => {
                        changeSourceText(event.target.value);
                    }}
                />
            </CardBody>
            <CardFooter className='bg-content1 rounded-none rounded-b-[20px] flex justify-between gap-[12px] px-[12px] py-[8px]'>
                <div className='flex items-center gap-[8px] overflow-hidden'>
                    <ButtonGroup className='mr-[2px]'>
                        <Tooltip content={t('translate.speak')}>
                            <Button
                                isIconOnly
                                variant='light'
                                size='sm'
                                radius='full'
                                onPress={() => speak(sourceText)}
                                isDisabled={!sourceText.trim()}
                            >
                                <HiOutlineVolumeUp className='text-[16px]' />
                            </Button>
                        </Tooltip>
                        <Tooltip content={t('translate.copy')}>
                            <Button
                                isIconOnly
                                variant='light'
                                size='sm'
                                radius='full'
                                onPress={() => writeText(sourceText)}
                                isDisabled={!sourceText.trim()}
                            >
                                <MdContentCopy className='text-[16px]' />
                            </Button>
                        </Tooltip>
                        <Tooltip content={t('translate.delete_newline')}>
                            <Button
                                isIconOnly
                                variant='light'
                                size='sm'
                                radius='full'
                                onPress={() => {
                                    const newText = sourceText.replace(/\-\s+/g, '').replace(/\s+/g, ' ');
                                    setSourceText(newText);
                                    detectLanguageAndSync(newText);
                                }}
                                isDisabled={!sourceText.trim()}
                            >
                                <MdSmartButton className='text-[16px]' />
                            </Button>
                        </Tooltip>
                        <Tooltip content={t('common.clear')}>
                            <Button
                                variant='light'
                                size='sm'
                                radius='full'
                                isIconOnly
                                isDisabled={sourceText === ''}
                                onPress={clearSourceText}
                            >
                                <LuDelete className='text-[16px]' />
                            </Button>
                        </Tooltip>
                    </ButtonGroup>
                    {detectLanguage !== '' && (
                        <Chip
                            size='sm'
                            color='secondary'
                            variant='flat'
                            radius='full'
                            className='my-auto shrink-0'
                        >
                            {t(`languages.${detectLanguage}`)}
                        </Chip>
                    )}
                </div>
                <Tooltip content={t('translate.translate')}>
                    <Button
                        size='sm'
                        color='primary'
                        radius='full'
                        variant='flat'
                        isIconOnly
                        className='text-[14px] font-bold shrink-0'
                        startContent={<HiTranslate className='text-[16px]' />}
                        onPress={() => detectLanguageAndSync(sourceText)}
                        isDisabled={!sourceText.trim()}
                    />
                </Tooltip>
            </CardFooter>
        </Card>
    );
}
