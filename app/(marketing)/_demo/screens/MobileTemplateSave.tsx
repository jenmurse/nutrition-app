// Mobile bottom sheet for saving a day template.

export default function MobileTemplateSave() {
  return (
    <div className="mts">
      <div className="mts-handle" />
      <div className="mts-nav">‹ Day actions</div>
      <div className="mts-rule" />

      <div className="mts-eyebrow">SAVE AS TEMPLATE</div>

      <div className="mts-field">
        <span className="mts-label">TEMPLATE NAME</span>
        <div className="mts-input">
          <span className="mts-placeholder">e.g. Workout day, Travel day...</span>
        </div>
      </div>

      <div className="mts-or">…OR UPDATE AN EXISTING TEMPLATE</div>
      <div className="mts-select">
        <span className="mts-select-val">— New template —</span>
        <span className="mts-select-arrow">▾</span>
      </div>

      <div className="mts-save">SAVE TEMPLATE</div>
    </div>
  );
}
