import React from 'react';

const NoteEditor = ({
    popover,
    content,
    reference,
    onContentChange,
    onClose,
    onSave,
    onDelete
}) => {
    if (!popover) return null;

    return (
        <>
            {/* Backdrop - transparent for positioned, dimmed for modal */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: popover.x ? 'transparent' : 'rgba(0,0,0,0.4)',
                    zIndex: 10998,
                    backdropFilter: popover.x ? 'none' : 'blur(2px)',
                }}
            />

            {/* Popover */}
            <div
                style={{
                    position: 'fixed',
                    ...(popover.x ? {
                        top: Math.min(popover.y, window.innerHeight - 300), // Prevent going off bottom
                        left: Math.min(Math.max(popover.x, 190), window.innerWidth - 190), // Prevent going off sides
                        transform: 'translate(-50%, 0)',
                        width: '320px',
                    } : {
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '380px',
                    }),
                    backgroundColor: 'var(--bs-body-bg, #1a1a2e)',
                    borderRadius: '16px',
                    padding: '0',
                    maxWidth: '90vw',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
                    zIndex: 10999,
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                {/* Header */}
                <div
                    style={{
                        padding: '12px 20px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'linear-gradient(135deg, rgba(141, 158, 255, 0.2), rgba(141, 158, 255, 0.05))',
                    }}
                >
                    <div className="d-flex align-items-center">
                        <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>📝</span>
                        <div className="d-flex flex-column">
                            <strong style={{ fontSize: '0.9rem', lineHeight: 1.2 }}>Note</strong>
                            {reference && <small className="text-primary fw-bold" style={{ fontSize: '0.75rem' }}>{reference}</small>}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: 'var(--bs-body-color, #fff)',
                            opacity: 0.7,
                            lineHeight: 1,
                            padding: '0 4px',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Content - Always show textarea */}
                <div style={{ padding: '20px', maxHeight: '50vh', overflowY: 'auto' }}>
                    <textarea
                        value={content}
                        onChange={(e) => onContentChange(e.target.value)}
                        className="form-control"
                        rows={5}
                        autoFocus
                        style={{
                            borderRadius: '10px',
                            resize: 'vertical',
                            minHeight: '120px',
                        }}
                        placeholder="Write your note here..."
                    />
                </div>

                {/* Footer with Cancel, Delete, Save buttons */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                    }}
                >
                    <button
                        onClick={onClose}
                        className="btn btn-outline-secondary btn-sm"
                        style={{ borderRadius: '8px' }}
                    >
                        Cancel
                    </button>

                    {/* Only show Delete for existing notes */}
                    {!popover.isNew && (
                        <button
                            onClick={onDelete}
                            className="btn btn-outline-danger btn-sm"
                            style={{ borderRadius: '8px' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '4px' }}>
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                            </svg>
                            Delete
                        </button>
                    )}

                    <button
                        onClick={onSave}
                        className="btn btn-sm"
                        style={{
                            borderRadius: '8px',
                            flex: 1,
                            backgroundColor: 'rgb(141, 158, 255)',
                            borderColor: 'rgb(141, 158, 255)',
                            color: '#fff',
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </>
    );
};

export default NoteEditor;
