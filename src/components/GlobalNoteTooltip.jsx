import React from 'react';

const GlobalNoteTooltip = ({
    tooltip,
    reference,
    onMouseEnter,
    onMouseLeave,
    onClose,
    onEdit,
    onDelete,
    theme
}) => {
    if (!tooltip) return null;

    // Calculate safe position to prevent cut-off
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const tooltipHalfW = 150; // Approximate half width
    const tooltipH = 180; // Reset estimated height

    let safeX = tooltip.x;

    // Clamp X position
    if (safeX < tooltipHalfW + 10) safeX = tooltipHalfW + 10;
    else if (safeX > screenW - tooltipHalfW - 10) safeX = screenW - tooltipHalfW - 10;

    const arrowOffset = tooltip.x - safeX;

    // Check if there's enough space above
    // If rect is provided, use its top. Otherwise use tooltip.y
    const targetY = tooltip.rect ? tooltip.rect.top : tooltip.y;
    const targetBottom = tooltip.rect ? tooltip.rect.bottom : targetY + 20;
    const showBelow = targetY < tooltipH + 20;

    return (
        <>
            <div
                className="tooltip-mobile-backdrop"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            />

            <div
                className={`global-note-tooltip ${showBelow ? 'show-below' : ''}`}
                data-theme={theme}
                style={{
                    '--tooltip-x': `${safeX}px`,
                    '--tooltip-y': `${showBelow ? targetBottom : targetY}px`,
                }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(); // Edit on main click
                }}
            >
                {reference && (
                    <div className="tooltip-verse-context" style={{ fontWeight: 'bold', color: 'rgb(141, 158, 255)' }}>
                        {reference}
                    </div>
                )}
                <div className="tooltip-content">
                    {(tooltip.note.n || '').length > 150
                        ? (tooltip.note.n || '').substring(0, 150) + '...'
                        : (tooltip.note.n || '')}
                </div>

                <div className="tooltip-actions">
                    <button
                        className="action-btn delete-btn"
                        title="Delete Note"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <span style={{ marginRight: '4px' }}>🗑️</span> Delete
                    </button>
                    <button
                        className="action-btn edit-btn"
                        title="Edit Note"
                        onClick={(e) => {
                            // Propagate to container click which calls onEdit
                        }}
                    >
                        <span style={{ marginRight: '4px' }}>✏️</span> Edit
                    </button>
                </div>

                <div
                    className="tooltip-arrow"
                    style={{ transform: `translateX(calc(-50% + ${arrowOffset}px))` }}
                />
            </div>
        </>
    );
};

export default GlobalNoteTooltip;
