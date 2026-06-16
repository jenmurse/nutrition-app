// Scenario 01 beat B — an abstract AI-assistant exchange (not the real app
// chrome; the AI is your own MCP-connected assistant). It reads the recipe,
// proposes the swaps, and writes the change back — with the sodium drop shown
// explicitly, so the edit is unmistakable. Agnostic ("Assistant"), not branded.

export default function AgentView() {
  return (
    <div className="agn">
      <div className="agn-bar">
        <span className="agn-id">
          <span className="agn-dot" />
          Assistant
        </span>
        <span className="agn-conn">Connected to Good Measure · MCP</span>
      </div>

      <div className="agn-body">
        <div className="agn-thread">
          <div className="agn-msg agn-user">
            <span className="agn-role">You</span>
            <p className="agn-text">
              Lower the sodium in Miso-Glazed Tofu — keep it tasting good.
            </p>
          </div>

          <div className="agn-tool">Read recipe · 7 ingredients</div>

          <div className="agn-msg agn-bot">
            <span className="agn-role">Assistant</span>
            <p className="agn-text">Two swaps do it without losing the savoriness:</p>
            <div className="agn-swaps">
              <div className="agn-swap">
                <span className="agn-swap-n">White miso paste</span>
                <span className="agn-swap-d">4 tsp → 2 tsp</span>
              </div>
              <div className="agn-swap">
                <span className="agn-swap-n">Soy sauce</span>
                <span className="agn-swap-d">→ low-sodium</span>
              </div>
            </div>
            <div className="agn-result">
              <span className="agn-result-l">Sodium</span>
              <span className="agn-result-v">
                1,858 → <em>950 mg</em>
              </span>
            </div>
          </div>

          <div className="agn-tool agn-tool-done">Updated recipe ✓</div>
        </div>
      </div>
    </div>
  );
}
