import React from 'react'
import classes from './TestingBanner.module.css'

// ECRAAT: Set to true to display the testing/training banner across all pages
const displayTestingBanner = true

const TestingBanner = () => {
    if (!displayTestingBanner) return null

    return (
        <div className={classes.banner}>
            <span className={classes.bannerIcon}>⚠️</span>
            <span>{/training/i.test(window.location.hostname) ? 'FOR TRAINING PURPOSE ONLY' : 'FOR TESTING PURPOSE ONLY'}</span>
        </div>
    )
}

export default TestingBanner
