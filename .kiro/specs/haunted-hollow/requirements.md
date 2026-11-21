# Haunted Hollow requirements

1. **Explore:** When a guest selects a room, show its distinct illustration, narration, and three usable hotspots. The foyer, library, and conservatory are accessible from the room list.
2. **Investigate:** When a guest opens a clue or collects a keepsake, add it to the Journal and update the score once. Show previously discovered evidence without scoring it again.
3. **Release the house:** Give each room a unique puzzle whose answer is inferable from discovered clues. Require that room's keepsake to seal it. Wrong answers must provide feedback without costing points; the third seal must reveal the ending.
4. **Host a Halloween night:** Generate a short, original story using the player's choices and provide a Halloween party checklist with individually toggleable tasks and a completion count.
5. **Remember progress:** Persist evidence, keepsakes, seals, selected room, and checklist in localStorage. Derive score from those records. Reset only this app's progress after confirmation.
6. **Keep the attraction open:** Run from a static server without installs, network-dependent assets, or accounts. Use keyboard-operable controls, meaningful image descriptions, responsive layout, and reduced-motion support. Sound must be original Web Audio synthesis, off by default, and stoppable.
