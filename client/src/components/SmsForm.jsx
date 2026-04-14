import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { isLikelyPhoneNumber } from '../utils/format';
import { useAppData } from '../context/AppDataContext';

export function SmsForm() {
  const MAX_MESSAGE_LENGTH = 160;
  const { sendMessage } = useAppData();
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [phoneInput, setPhoneInput] = useState('');
  const [message, setMessage] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const characterCount = message.length;
  const segments = Math.ceil(characterCount / 160) || 1;
  const isOverLimit = characterCount > 1600; // soft max limit just to prevent abuse
  const canSubmit = useMemo(() => phoneNumbers.length > 0 && message.trim().length > 0 && !isSubmitting && !isOverLimit, [phoneNumbers.length, message, isSubmitting, isOverLimit]);

  const addPhoneNumber = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    if (!isLikelyPhoneNumber(trimmed)) {
      toast.error('Enter a valid phone number');
      return;
    }

    setPhoneNumbers((current) => (current.includes(trimmed) ? current : [...current, trimmed]));
    setPhoneInput('');
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await sendMessage({
        phoneNumbers,
        message,
        scheduleAt: scheduleAt || undefined,
      });
      setPhoneNumbers([]);
      setPhoneInput('');
      setMessage('');
      setScheduleAt('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="panel form-panel" onSubmit={submitForm}>
      <div className="panel-header">
        <div>
          <div className="panel-kicker">Compose</div>
          <h2>Compose message</h2>
        </div>
        <div className="muted">{characterCount} chars | {segments} segment{segments > 1 ? 's' : ''}</div>
      </div>

      <label className="field">
        <span>Recipients</span>
        <div className="chip-input">
          {phoneNumbers.map((number) => (
            <button type="button" key={number} className="chip" onClick={() => setPhoneNumbers((current) => current.filter((item) => item !== number))}>
              {number}
              <X size={12} />
            </button>
          ))}
          <input
            value={phoneInput}
            onChange={(event) => setPhoneInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                addPhoneNumber(phoneInput);
              }
            }}
            onBlur={() => addPhoneNumber(phoneInput)}
            placeholder="Enter a phone number and press Enter"
          />
          <button type="button" className="chip-add" onClick={() => addPhoneNumber(phoneInput)}>
            <Plus size={12} />
          </button>
        </div>
      </label>

      <label className="field">
        <span>Message</span>
        <div className="textarea-wrap">
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={8} placeholder="Type the SMS content here" />
          <div className={`char-counter ${isOverLimit ? 'over' : ''}`}>
            {characterCount} chars | {segments} segment(s)
          </div>
        </div>
      </label>

      <label className="field">
        <span>Schedule for later</span>
        <input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} />
      </label>

      <div className="form-actions">
        <div className="muted">Phone numbers must be in E.164-style format.</div>
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {isSubmitting ? <span className="spinner" aria-label="Sending" /> : scheduleAt ? 'Queue message' : 'Send now'}
        </button>
      </div>
    </form>
  );
}
