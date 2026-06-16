// Scenario 02 states A & D, premium version. The whole app window (nav + the
// planner) is wrapped so it can scale/push in toward the Tuesday column — the
// nav is part of the camera move, not pinned. The zoom is driven by the CSS var
// --cam (0 = full week, 1 = zoomed to the day), set by StickyScene from scroll.

import AppWindow from "../AppWindow";
import Planner from "./Planner";

export default function PlannerZoom({ mode }: { mode: "off" | "applied" }) {
  return (
    <div className="plz">
      <AppWindow>
        <Planner mode={mode} />
      </AppWindow>
    </div>
  );
}
