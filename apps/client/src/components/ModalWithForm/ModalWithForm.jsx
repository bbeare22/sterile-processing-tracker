import React from 'react';
import './ModalWithForm.css';

export default function ModalWithForm({ title, children, onClose }) {
  return (
    <div className="modal-form">
      <div className="modal-form__backdrop" onClick={onClose} />
      <div className="modal-form__panel" role="dialog" aria-modal="true">
        <div className="modal-form__header">
          <h2 className="modal-form__title">{title}</h2>
          <button type="button" className="modal-form__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-form__body">{children}</div>
      </div>
    </div>
  );
}
