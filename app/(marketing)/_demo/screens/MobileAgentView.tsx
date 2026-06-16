// Mobile AI-assistant exchange — same content and chrome as the desktop
// AgentView (bar + thread, no app nav, no sheet handle), sized for 390px width.

export default function MobileAgentView() {
  return (
    <div className="magn">
      <div className="magn-bar">
        <span className="magn-id">
          <span className="magn-dot" />
          Assistant
        </span>
        <span className="magn-conn">Connected to Good Measure · MCP</span>
      </div>

      <div className="magn-thread">
        <div className="magn-msg magn-user">
          <span className="magn-role">You</span>
          <p className="magn-text">
            Lower the sodium in Miso-Glazed Tofu — keep it tasting good.
          </p>
        </div>

        <div className="magn-tool">Read recipe · 7 ingredients</div>

        <div className="magn-msg magn-bot">
          <span className="magn-role">Assistant</span>
          <p className="magn-text">Two swaps do it without losing the savoriness:</p>
          <div className="magn-swaps">
            <div className="magn-swap">
              <span className="magn-swap-n">White miso paste</span>
              <span className="magn-swap-d">4 tsp → 2 tsp</span>
            </div>
            <div className="magn-swap">
              <span className="magn-swap-n">Soy sauce</span>
              <span className="magn-swap-d">→ low-sodium</span>
            </div>
          </div>
          <div className="magn-result">
            <span className="magn-result-l">Sodium</span>
            <span className="magn-result-v">
              1,858 → <em>950 mg</em>
            </span>
          </div>
        </div>

        <div className="magn-tool magn-tool-done">Updated recipe ✓</div>
      </div>
    </div>
  );
}
