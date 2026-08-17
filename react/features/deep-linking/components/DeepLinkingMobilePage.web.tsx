/* eslint-disable lines-around-comment */
import React, { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { createDeepLinkingPageEvent } from '../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../analytics/functions';
import Button from '../../base/ui/components/web/Button';
import { openWebApp } from '../actions';


const PADDINGS = {
    topBottom: 24,
    leftRight: 40
};

const useStyles = makeStyles()(() => {
    return {
        container: {
            background: '#1E1E1E',
            width: '100vw',
            height: '100dvh',
            overflowX: 'hidden',
            overflowY: 'auto',
            justifyContent: 'center',
            display: 'flex',
            '& a': {
                textDecoration: 'none'
            }
        },
        contentPane: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            padding: `${PADDINGS.topBottom}px ${PADDINGS.leftRight}px`,
            maxWidth: 410,
            width: '100%'
        },
        joinMeetWrapper: {
            width: '100%'
        }
    };
});

const DeepLinkingMobilePage: React.FC = () => {
    const dispatch = useDispatch();
    const { classes: styles } = useStyles();

    const onLaunchWeb = useCallback(() => {
        sendAnalytics(
            createDeepLinkingPageEvent(
                'clicked', 'launchWebButton', { isMobileBrowser: true }));
        dispatch(openWebApp());
    }, []);

    useEffect(() => {
        sendAnalytics(
            createDeepLinkingPageEvent(
                'displayed', 'DeepLinkingMobile', { isMobileBrowser: true }));
    }, []);


    return (
        <div className = { styles.container }>
            <div className = { styles.contentPane }>
                <div className = { styles.joinMeetWrapper }>
                    <Button
                        accessibilityLabel = 'Continue with browser'
                        fullWidth = { true }
                        label = 'Continue with browser'
                        onClick = { onLaunchWeb } />
                </div>
            </div>
        </div>
    );
};

export default DeepLinkingMobilePage;
