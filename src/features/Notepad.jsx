import { useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

const NOTES_STORAGE_KEY = 'userSimpleNotes';

function Notes({ onNotesOpen, onNotesClose }) {
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    const savedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
    if (savedNotes) {
      setNoteText(savedNotes);
    }
  }, []);

  const handleOpenNotes = () => {
    // First close the settings modal completely
    if (onNotesOpen) {
      // onNotesOpen();
    }
    
    // Force this to run after the current JS execution cycle completes
    // This ensures the settings modal closing operations finish first
    Promise.resolve().then(() => {
      // Use requestAnimationFrame to wait for the browser to process DOM updates
      requestAnimationFrame(() => {
        setShowNotesModal(true);
      });
    });
  };
  
  const handleCloseNotes = () => {
    setShowNotesModal(false);
    
    // Wait for the notes modal to finish closing before potentially reopening settings
    setTimeout(() => {
      if (onNotesClose) {
        onNotesClose();
      }
    }, 100);
  };

  const handleNoteChange = (event) => {
    const newValue = event.target.value;
    setNoteText(newValue);
    localStorage.setItem(NOTES_STORAGE_KEY, newValue);
  };
  
  const handleClearNotes = () => { 
    setNoteText(""); 
    localStorage.removeItem(NOTES_STORAGE_KEY);
  };

  return (
    <>
      <Button 
        variant="secondary" 
        onClick={handleOpenNotes} 
        size="sm" 
        className="" 
        title="Open Notes"
      >
        📝 Notes
      </Button>

      {/* Render Notes modal directly in the DOM to avoid nesting issues */}
      <Modal
        show={showNotesModal}
        onHide={handleCloseNotes}
        size='md'
        id="notesModal"
      >
        <Modal.Header>
          <Modal.Title>Simple Notes</Modal.Title>
          <small 
            className="text-primary mt-1 ms-auto" 
            onClick={handleClearNotes} 
            title="clear all notes" 
            style={{ cursor: 'pointer' }}
          >
            🗑️
          </small>
          <button
            type="button"
            className="btn-close ms-2"
            onClick={handleCloseNotes}
            aria-label="Close"
          ></button>
        </Modal.Header>
        <Modal.Body>
          <textarea
            className="form-control"
            value={noteText}
            onChange={handleNoteChange}
            placeholder="Type your notes here..."
            rows="12"
            style={{ width: '100%', minHeight: '200px' }}
          />
        </Modal.Body>
      </Modal>
    </>
  );
}

export default Notes;