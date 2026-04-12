import { useEffect } from 'react';

const FEEDBACK_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfYqu7VFCN540e_on4B5istgHmFdR2Y_SMPDLVF_Hs6_7YSww/viewform';

export default function FeedbackModal({ onClose, onToast }) {
  useEffect(() => {
    window.open(FEEDBACK_FORM_URL, '_blank', 'noopener');
    onToast?.('Feedback form opened in a new tab', 'success');
    onClose();
  }, []);

  return null;
}
