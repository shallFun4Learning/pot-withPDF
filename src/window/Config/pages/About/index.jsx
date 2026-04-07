import { Divider, Button, Card, CardBody } from '@nextui-org/react';
import { appLogDir, appConfigDir } from '@tauri-apps/api/path';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/api/shell';
import { BsGithub } from 'react-icons/bs';
import React from 'react';

import { appVersion } from '../../../../utils/env';

const FORK_REPOSITORY = 'https://github.com/shallFun4Learning/pot-withPDF';
const FORK_ISSUES = 'https://github.com/shallFun4Learning/pot-withPDF/issues';
const UPSTREAM_REPOSITORY = 'https://github.com/pot-app/pot-desktop';

export default function About() {
    const { t } = useTranslation();

    return (
        <div className='h-full w-full py-[48px] px-[80px]'>
            <img
                src='icon.png'
                className='mx-auto h-[100px] mb-[5px]'
                draggable={false}
            />
            <div className='content-center'>
                <h1 className='font-bold text-2xl text-center'>pot-withPDF</h1>
                <p className='text-center text-sm text-gray-500 mb-[5px]'>{appVersion}</p>
                <p className='text-center text-sm text-warning-600 mb-[16px]'>
                    {t('config.about.unofficial_fork_notice')}
                </p>
                <Divider />
            </div>

            <div className='grid grid-cols-2 gap-[16px] my-[20px]'>
                <Card
                    shadow='none'
                    className='bg-content1'
                >
                    <CardBody>
                        <h3 className='font-semibold mb-[8px]'>{t('config.about.fork_project')}</h3>
                        <p className='text-sm text-default-500 mb-[12px]'>{t('config.about.fork_project_desc')}</p>
                        <div className='flex gap-[8px] flex-wrap'>
                            <Button
                                variant='flat'
                                size='sm'
                                startContent={<BsGithub />}
                                onPress={() => open(FORK_REPOSITORY)}
                            >
                                {t('config.about.github')}
                            </Button>
                            <Button
                                variant='flat'
                                size='sm'
                                onPress={() => open(FORK_ISSUES)}
                            >
                                {t('config.about.issue')}
                            </Button>
                        </div>
                    </CardBody>
                </Card>
                <Card
                    shadow='none'
                    className='bg-content1'
                >
                    <CardBody>
                        <h3 className='font-semibold mb-[8px]'>{t('config.about.upstream_project')}</h3>
                        <p className='text-sm text-default-500 mb-[12px]'>{t('config.about.upstream_project_desc')}</p>
                        <Button
                            variant='flat'
                            size='sm'
                            startContent={<BsGithub />}
                            onPress={() => open(UPSTREAM_REPOSITORY)}
                        >
                            {t('config.about.view_upstream')}
                        </Button>
                    </CardBody>
                </Card>
            </div>

            <div className='content-center px-[20px]'>
                <div className='flex justify-between gap-[12px] flex-wrap'>
                    <Button
                        variant='light'
                        className='my-[5px]'
                        size='sm'
                        isDisabled
                    >
                        {t('config.about.fork_update_disabled')}
                    </Button>
                    <Button
                        variant='light'
                        className='my-[5px]'
                        size='sm'
                        onPress={async () => {
                            const dir = await appLogDir();
                            open(dir);
                        }}
                    >
                        {t('config.about.view_log')}
                    </Button>
                    <Button
                        variant='light'
                        className='my-[5px]'
                        size='sm'
                        onPress={async () => {
                            const dir = await appConfigDir();
                            open(dir);
                        }}
                    >
                        {t('config.about.view_config')}
                    </Button>
                </div>
                <Divider />
            </div>
        </div>
    );
}
