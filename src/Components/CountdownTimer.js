import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../Css/components/countdown-timer.css';

/**
 * CountdownTimer - Calculates time remaining locally (no API polling)
 * Updates every second using local state
 */
const CountdownTimer = ({ deadline, hoursRemaining: initialHoursRemaining }) => {
  const { t, i18n } = useTranslation(['common']);
  const [timeRemaining, setTimeRemaining] = useState(() => {
    if (!deadline) return null;
    return calculateTimeRemaining(deadline);
  });

  useEffect(() => {
    if (!deadline) return;

    // Update every second locally (no API call)
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(deadline);
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (!timeRemaining || !deadline) {
    return null;
  }

  const { hours, minutes, seconds, isOverdue } = timeRemaining;

  if (isOverdue) {
    return (
      <div className="countdown-timer overdue">
        <i className="fas fa-exclamation-triangle"></i>
        <span>{t('dashboard.wire_receipt.overdue', { defaultValue: 'Deadline Passed' })}</span>
      </div>
    );
  }

  return (
    <div className={`countdown-timer ${hours < 6 ? 'urgent' : hours < 24 ? 'warning' : ''}`}>
      <i className="fas fa-clock"></i>
      <span className="time-value">
        {hours > 0 && (
          <span className="time-unit">
            {hours} {t('dashboard.wire_receipt.hours', { defaultValue: 'hours' })}
          </span>
        )}
        {minutes > 0 && (
          <span className="time-unit">
            {minutes} {t('dashboard.wire_receipt.minutes', { defaultValue: 'min' })}
          </span>
        )}
        {hours === 0 && (
          <span className="time-unit">
            {seconds} {t('dashboard.wire_receipt.seconds', { defaultValue: 'sec' })}
          </span>
        )}
      </span>
      <span className="time-label">
        {t('dashboard.wire_receipt.remaining', { defaultValue: 'remaining' })}
      </span>
    </div>
  );
};

/**
 * Calculate time remaining from deadline
 * Returns null if deadline is invalid
 */
function calculateTimeRemaining(deadline) {
  if (!deadline) return null;

  try {
    const now = Date.now();
    const deadlineMs = new Date(deadline).getTime();
    const diff = deadlineMs - now;

    if (isNaN(diff)) return null;

    const isOverdue = diff < 0;
    const absDiff = Math.abs(diff);

    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

    return {
      total: absDiff,
      hours,
      minutes,
      seconds,
      isOverdue
    };
  } catch (error) {
    console.error('Error calculating time remaining:', error);
    return null;
  }
}

export default CountdownTimer;
