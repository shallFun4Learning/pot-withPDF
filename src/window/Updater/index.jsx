import { Card, CardBody, Button, Link } from '@nextui-org/react';
import React, { useEffect } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { open } from '@tauri-apps/api/shell';

import { useConfig } from '../../hooks';
import { osType } from '../../utils/env';

const releaseUrl = 'https://github.com/shallFun4Learning/pot-withPDF/releases';
const issueUrl = 'https://github.com/shallFun4Learning/pot-withPDF/issues';

export default function Updater() {
    const [transparent] = useConfig('transparent', true);
    const { t } = useTranslation();

    useEffect(() => {
        if (appWindow.label === 'updater') {
            appWindow.show();
        }
    }, []);

    const body = t('updater.disabled');

    return (
        <div
            className={`${transparent ? 'bg-background/90' : 'bg-background'} h-screen ${
                osType === 'Linux' && 'rounded-[10px] border-1 border-default-100'
            }`}
        >
            <div className='p-[5px] h-[35px] w-full select-none cursor-default'>
                <div
                    data-tauri-drag-region='true'
                    className={`h-full w-full flex ${osType === 'Darwin' ? 'justify-end' : 'justify-start'}`}
                >
                    <img
                        src='icon.png'
                        className='h-[25px] w-[25px] mr-[10px]'
                        draggable={false}
                    />
                    <h2>{t('updater.title')}</h2>
                </div>
            </div>
            <Card className='mx-[80px] mt-[10px] overscroll-auto h-[calc(100vh-150px)]'>
                <CardBody>
                    <ReactMarkdown
                        className='markdown-body select-text'
                        components={{
                            h2: ({ node, ...props }) => (
                                <b>
                                    <h2
                                        className='text-[24px]'
                                        {...props}
                                    />
                                    <hr />
                                    <br />
                                </b>
                            ),
                            li: ({ node, ...props }) => {
                                const { children } = props;
                                return (
                                    <li
                                        className='list-disc list-inside'
                                        children={children}
                                    />
                                );
                            },
                            a: ({ node, href, ...props }) => (
                                <Link
                                    href={href}
                                    isExternal
                                    {...props}
                                />
                            ),
                        }}
                    >
                        {body}
                    </ReactMarkdown>
                </CardBody>
            </Card>
            <div className='grid gap-4 grid-cols-2 h-[50px] my-[10px] mx-[80px]'>
                <Button
                    variant='flat'
                    color='primary'
                    onPress={() => open(releaseUrl)}
                >
                    {t('updater.open_releases')}
                </Button>
                <Button
                    variant='flat'
                    color='secondary'
                    onPress={() => open(issueUrl)}
                >
                    {t('updater.open_issues')}
                </Button>
            </div>
            <div className='grid gap-4 grid-cols-1 h-[50px] mb-[10px] mx-[80px]'>
                <Button
                    variant='flat'
                    color='danger'
                    onPress={() => {
                        appWindow.close();
                    }}
                >
                    {t('updater.close')}
                </Button>
            </div>
        </div>
    );
}
