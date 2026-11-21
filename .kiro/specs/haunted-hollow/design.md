# Haunted Hollow design

The front page is a caretaker's field guide: a room list to the left, a large illustrated room with numbered brass markers in the center, and the Journal to the right. Below the expedition are two festival tools, usable even before the first room is solved. Narrow screens stack the same controls in reading order.

`game.js` defines the room records and progress rules. Each record couples a scene, three landmarks (clue, keepsake, puzzle), answer choices, and a reward. The foyer uses time, the library uses a name, and the conservatory uses a moon phase. Evidence and keepsakes are recorded by room ID. The Journal displays collected clues and items across rooms, not just the active room.

State is versioned and lives under `haunted-hollow-v1`. A clue is worth 10 points, a keepsake 15, and a seal 25, for 150 possible points. The third seal is the narrative ending. Sound remains session-only and opt-in; a single synthesizer and master gain provide the ambience without audio downloads.

`app.js` binds native buttons and forms to the model, renders room and Journal state, and uses status regions for updates. Native modal dialogs handle puzzles and confirmation. In-scene controls are mirrored by plainly labeled buttons below the artwork.
