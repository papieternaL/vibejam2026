Original prompt: You are building a browser-based third-person hero shooter prototype in Three.js. This is not a full game and not a multiplayer implementation yet. This is a tightly scoped local gameplay vertical slice focused on movement feel, camera feel, melee combat readability, ability flow, and a graybox combat sandbox.

Current focus: scaffold the project and implement the first playable slice:
- Vite + TypeScript + Three.js setup
- app bootstrap and render loop
- graybox arena
- third-person player controller
- stable third-person follow/orbit camera

Notes:
- Workspace started empty.
- Using the develop-web-game skill, so the app will expose `window.render_game_to_text` and `window.advanceTime(ms)` early for deterministic testing.
- Replaced the Vite starter with a modular source tree under `src/core`, `src/game`, `src/player`, `src/ui`, `src/config`, plus placeholder `src/abilities` and `src/entities`.
- Implemented a fixed-step loop, pointer-lock mouse input, camera-relative movement, jump support, low-wall collision, simple ramp/platform ground sampling, and a primitive hero placeholder with a spear.
- Browser validation caught a real HUD layering bug where the reticle blocked canvas clicks; fixed by making the reticle ignore pointer events.
- Browser validation also drove camera tuning: moved the boom height onto the camera position instead of the look target, increased follow distance, and set a slight downward default pitch for more readable arena framing.
- `window.render_game_to_text` and `window.advanceTime(ms)` are live for deterministic test tooling.
- `npm run build` passes. Vite emits a chunk-size warning because the current build is essentially one Three.js-heavy bundle; acceptable for this local prototype slice.
- Playwright browser check passed after the HUD/camera fixes using the shared `web_game_playwright_client.js`.
- Started a focused control/feel pass from the real codebase rather than inventing parallel systems.
- Swapped `A` and `D` movement directions as requested while leaving arrow keys conventional.
- Added a config-driven combat foundation so feel work can be tuned instead of hardcoded: ability timings, assist angles, movement, camera, burn, healing, and feedback values now live in `src/config/combatConfig.ts`.
- Added practice dummies, hit flash/status handling, burn zones, a dragon wave projectile, lightweight hit pulses, and readable HUD cooldown/charge state so combat feel can actually be evaluated in-browser.
- Tightened locomotion responsiveness using new acceleration/deceleration/turn-speed tuning and separated external ability motion from stick movement for cleaner attacks and bursts.
- Camera now has distinct normal/combat follow behavior, forward look bias, tunable shoulder offset/distance, and subtle shake hooks for heavier hits.
- Browser validation confirmed: movement still works, mouse-driven attacks work, HUD updates correctly, and at least one scripted dummy hit landed and reduced target health.
- Refactored the player visual into a proper procedural weapon rig with `bodyRoot -> torsoRoot -> weaponAnchor -> spearPivot -> spear meshes`.
- Added config-driven weapon pose definitions in `src/config/weaponPoseConfig.ts` for idle, run, swing, thrust charge, thrust release, burst, vault, wheel, and ultimate cast.
- Player combat presentation now exposes visual state, phase, and phase progress so the avatar can drive readable startup/active/recovery poses without touching gameplay rules.
- The spear now has locomotion blending, idle sway, run bob, and state-based pose overlays so it no longer feels like a dead static child mesh.

TODO:
- Further tune side-lane/ramp camera readability; the current camera is stable, but some ramp angles can still obscure the hero more than ideal.
- Add direct keyboard/browser validation for `Shift`, `Q`, `E`, and `R`; the shared Playwright client used here only exercised movement plus mouse-driven attacks.
- If this slice continues, the next most useful feel work is refining action-specific camera offsets, improving target-side hit reactions, and deciding whether the current melee assist is enough or needs a slightly stronger snap on startup.
- Visual follow-up: tune the exact anchor/pivot offsets for each pose by feel in-browser now that the hierarchy is stable; the system is ready for rapid iteration.

Edit mode pass:
- Added a dev-only in-game edit mode under src/dev with F1 toggle, Unity-style fly camera, selection manager, TransformControls integration, and JSON transform export.
- Added edit tuning in src/config/editModeConfig.ts and a small edit overlay for mode/status/help text.
- Added window.edit_mode_debug hooks for dev inspection/export during this pass.
- Build passes after the edit mode integration.
- Browser validation confirmed: F1 toggle works, gameplay pause/HUD hide works, wheel-based fly-speed adjustment works, RMB freelook + Shift+W fly movement updates camera state, 1/2/3 gizmo mode switching works, and Ctrl+S emits editable transform JSON.
- Remaining validation gap: headless click-selection behaved inconsistently during automation on this machine, so the click-to-select path should get one quick manual browser sanity check before treating the editor flow as fully signed off.

Weapon rig follow-up:
- Fixed the spear mesh orientation so it now builds along the weapon forward axis instead of being immediately rotated back into an almost-vertical world pose.
- Added a dedicated weapon socket on the torso and re-based the pose config around that socket so the spear stays attached to the hero instead of floating away from the body.
- Retuned idle/run/swing/thrust pose values and increased weapon pose blend sharpness for snappier response.
- Added phase-progress procedural motion for swing and thrust-release so the spear travels across startup/active/recovery instead of only blending between static key poses.
- Build passes after the weapon-rig fix. Browser screenshots clearly show the idle spear hold is corrected; headless pointer-lock capture was still inconsistent for proving the exact swing frame visually, but HUD/state inspection confirmed swing state entry during automated input.

Procedural animation refactor:
- Replaced the old inline PlayerAvatar pose logic with a dedicated animation module under src/player/animation.
- Added AnimationStateTypes.ts for visual state/phase contracts, HeroPoseConfig.ts for all pose and motion tuning data, WeaponAnimationController.ts for weapon-anchor/spear-pivot presentation, and ProceduralAnimationController.ts for locomotion + attack-state blending.
- Refactored PlayerAvatar into a clean visual rig builder with visualRoot -> bodyRoot -> torsoRoot -> weaponAnchor -> spearPivot and delegated all motion to the procedural controller.
- PlayerCombatController still owns gameplay/combat timing and now maps those gameplay states into HeroVisualState names like fireBurst, fireVault, fireWheel, and dragonFireCast.
- PlayerController now passes local movement axes, charge, hit-confirm, visual phase/state, and other gameplay-derived presentation data into the procedural controller without changing combat logic.
- Debug HUD now shows the current visual animation state/phase for quick iteration.
- Build passes after the refactor.
- Browser validation confirmed: idle visual state reads idle:loop, movement reads fastMove:loop at full speed, thrust charge reads thrustCharge:active, and thrust release reads thrustRelease:recovery. Swing state entry was confirmed through HUD/debug state as swing:* during automation, though the headless screenshot happened to catch late recovery rather than the clearest active frame.

Focused feel polish pass:
- Tightened core locomotion response in `src/config/combatConfig.ts` and `src/player/PlayerController.ts` by switching planar movement toward a vector-based accelerate/decelerate model with extra braking on hard reversals, lower jump float, stronger ground stopping, and slightly faster turning.
- Reworked ability-driven movement in `src/player/PlayerCombatController.ts` so burst/vault/thrust/swing/wheel use driven forward velocity instead of mushier additive stacking; this makes dash/engage motion read more intentionally and reduces lingering slide.
- Hooked the existing melee assist values into real contact bias by shifting melee hit origin forward using `snapDistance` / `thrustSnapDistance`, and made target-facing assist use the dedicated assist sharpness when a valid target is found.
- Added ability-specific hit colors/pulse sizing plus directional dummy hit reactions using `hitDirection` and `hitFlashColor`, so contact feedback is easier to read without adding new gameplay systems.
- Reduced locomotion sway/bob dominance during attacks in `ProceduralAnimationController.ts`, then sharpened pose blending and locomotion lean values in `HeroPoseConfig.ts` so weapon/body silhouettes stay clearer during fast movement and attacks.
- `npm run build` passes after this feel pass.
- Browser validation used the shared web-game client plus a direct Playwright event-dispatch pass. Confirmed: run reaches the tuned `9.2 m/s` top speed cleanly in HUD/state, fast-move posture is visible, and Burning Thrust charge/release presentation is clearer. Remaining automation gap: headless input was inconsistent for capturing clean `swing` active-frame and non-mouse ability screenshots, so `Q/E/R` still want a quick manual in-browser sanity check.

Hybrid combat-animation refactor:
- Split the old single procedural controller into a hybrid stack under `src/player/animation`: `LocomotionAnimationLayer.ts` for base idle/run/fast locomotion, `CombatPresentationController.ts` for gameplay-state-driven sword/torso/body startup-active-recovery motion, `WeaponAnimationController.ts` for weapon-anchor/sword-pivot smoothing, and `ClipBodyAnimationLayer.ts` as the future `AnimationMixer` hook for imported GLB body clips.
- Added `AnimationPoseUtils.ts` so pose resolution, blending, and mirrored swing handling are shared helpers rather than being buried in one monolith.
- `PlayerAvatar.ts` now drives `HybridAnimationController.ts`, which composes locomotion + combat presentation + future clip-body hook while keeping gameplay state as the single source of truth.
- Combat logic in `PlayerCombatController.ts` was not rewritten; it still owns timings and phases, and the hybrid visual stack simply consumes `visualState`, `visualPhase`, `phaseProgress`, `attackSide`, `chargeRatio`, and hit-confirm data.
- Browser validation on the hybrid stack confirmed distinct sword phase snapshots for swing startup/active/recovery, thrust charge/release, and vault after the refactor. Visual tuning is still needed by hand, but the architecture is now cleanly separated so combat readability can be tuned without reworking locomotion or future clip integration.

Q/E combat-presentation polish:
- Retuned `fireVault` in `src/player/animation/HeroPoseConfig.ts` to read as a real overhead engage: stronger crouch/windup, lifted travel posture, more forceful downward slam, and a clearer settle in recovery.
- Replaced the old duel-sized arena config with a larger 4v4 aerial blockout: 2 central boost pads, 4 side boost pads, 6 tall grapple-ready pillars, a west broken walkway route, and an east staggered ledge chain.
- `src/game/GrayboxArena.ts` now supports `z`-axis ramps, floating mid-platforms with underpasses/support blockers, pillar top surfaces, and runtime grapple-anchor tracking that follows editable roots in dev mode.
- `src/game/GameWorld.ts` debug output now reports `grappleAnchors` alongside `boostPads`, and the practice dummy placements were moved onto the new arena routes/heights.
- `npm run build` passes after the arena replacement. Next validation step is an in-browser pass to confirm readability, boost routing, and the new debug state shape.
- Browser validation against `http://127.0.0.1:4173` using the shared `web_game_playwright_client.js` produced center, west-lane, and east-lane screenshots plus `render_game_to_text` snapshots.
- Validation confirmed: `render_game_to_text()` reports 6 boost pads and 13 grapple anchors with stable ids/kinds; the center reads as an open teamfight pocket; the west lane exposes the broken walkway + pillar route; the east lane shows the staggered ledge chain and side-pad routing.
- Edit-mode sanity check passed through `window.edit_mode_debug`: `F1` enables edit mode, 68 editable roots are registered/exported, and the export includes representative new objects such as `pillar-west-south`, `west-walkway-south`, and `east-high-pad`.
- Retuned `fireWheel` in `src/player/animation/HeroPoseConfig.ts` and `src/player/animation/CombatPresentationController.ts` to use a broader mirrored sweep with more torso twist, blade roll, and follow-through so it reads differently from the basic swing.
- `src/player/animation/CombatPresentationController.ts` now mirrors `fireWheel` off `attackSide` the same way `swing` does, so repeated sweep usage no longer feels stuck to one generic side.
- Added light body-spin presentation hooks in `src/player/PlayerCombatController.ts` for `vault` travel and `wheel` active so the torso/body carry the move instead of only the weapon moving.
- Reduced `vault.visualLift` in `src/config/combatConfig.ts` from `1.45` to `1.15` so the leap stays more readable in the normal combat camera and is less likely to jump partially out of frame.
- Validation: `npm run build` passes. Browser checks on `Q` and `E` were run against a temporary Vite server at `http://127.0.0.1:4176`. Automated screenshots clearly showed the improved `vault` startup/readiness pose and the updated `wheel` recovery silhouette, but headless capture timing still drifted on the fastest active frames, so one quick manual in-browser feel pass for `Q` impact and `E` active sweep is still recommended.

Right-hand weapon attachment fix:
- Added a dedicated `rightHandAnchor` and visible `rightHand` mesh in `src/player/PlayerAvatar.ts`, then parented the weapon under that hand instead of leaving the sword visually suspended under the torso.
- Updated `src/player/animation/WeaponAnimationController.ts` so the existing `weaponAnchor` pose data now drives the `rightHandAnchor`, while the sword itself stays at a fixed local grip offset in the hand.
- This specifically improves `thrustCharge` readability because fully charged RMB now pulls the hand and sword backward together instead of making the weapon look detached from the player.
- `npm run build` passes after the hand-anchor rig change.

LMB swing heaviness pass:
- Retuned `src/config/combatConfig.ts` so `swing` is slightly slower and more deliberate: longer startup/active/recovery, slightly longer cooldown, a wider assist arc, and a little more reach/radius so the broader visual swing still connects cleanly.
- Retuned `src/player/animation/HeroPoseConfig.ts` so `swing` now has a bigger draw-back, wider cross-body sweep, stronger torso twist, and a more pronounced follow-through.
- Validation: `npm run build` passes. Browser checks on a temporary Vite server confirmed the slower timing in HUD/state and captured active swing frames showing a broader, more committed slash silhouette than the previous quick chop.

LMB arm-attachment cleanup:
- Added a simple procedural `rightForearm` connector in `src/player/PlayerAvatar.ts` that stretches from the shoulder socket to the animated hand anchor each frame, so weapon swings read as arm-driven instead of a detached hand/weapon path.
- Pulled the `swing` hand path back closer to the torso in `src/player/animation/HeroPoseConfig.ts` by reducing the startup/active/recovery hand travel and toning down the swing action-curve reach/yaw/roll values.
- Validation: `npm run build` passes. Browser capture of the active swing now shows the weapon path staying much closer to the body with a visible arm bridge instead of a gap.

Vault impact VFX pass:
- Added `src/entities/VaultImpactEffect.ts` as a dedicated graybox slam effect for `Q`, using a fast expanding ground shock ring, a brighter impact disc, and short vertical burst columns.
- Extended `WorldSpawnApi` plus `src/game/GameWorld.ts` to spawn/update/dispose vault impact effects cleanly alongside existing hit pulses and burn/dragon effects.
- `src/player/PlayerCombatController.ts` now spawns the dedicated effect at `vault` impact before damage resolution, so the move has a distinct visual read even before hit feedback on targets.
- Validation: `npm run build` passes. Browser capture on a temporary Vite server showed the new vault slam ring and burst columns clearly visible during the impact window/recovery overlap, making `Q` read much more like a real engage slam than a generic floor hit.

Right-hand + Q/E ability pass:
- Reverted `burst.distance` in `src/config/combatConfig.ts` from `8.4` back to the earlier `5.6`, matching the original dash feel the user preferred.
- Added a global `weaponMountOffset` in `src/player/animation/HeroPoseConfig.ts` and applied it in `src/player/animation/WeaponAnimationController.ts`, pushing the sword mount farther onto the hero's right side across all states.
- Retuned `vault` in `src/config/combatConfig.ts` and `src/player/PlayerCombatController.ts` to use a bigger visual launch arc: startup lift, higher travel lift, and a sharper visual slam-down on impact.
- Converted `wheel`/`E` from a sweep-driven attack into a roar-style area burst: `src/player/PlayerCombatController.ts` now resolves it as a radial hit that applies burn + slow, and `src/entities/RoarBurstEffect.ts` plus `src/game/GameWorld.ts` add the expanding roar shell/ground ring effect.
- Retuned `fireWheel` presentation in `src/player/animation/HeroPoseConfig.ts` and `src/player/animation/CombatPresentationController.ts` so it reads like a chest-up roar/flare posture rather than a spin slash.
- Validation: `npm run build` passes. Browser checks confirmed the sword is held farther on the right side and the new `E` roar burst effect is visible. Headless capture for the peak airborne `Q` frame still drifted late, so the higher launch is code-complete but still wants a quick manual in-browser eyeball test at normal speed.

Q/E readability follow-up:
- Increased `vault` readability in `src/config/combatConfig.ts`, `src/player/PlayerCombatController.ts`, and `src/player/animation/HeroPoseConfig.ts` by giving it a longer startup/travel/impact window, larger startup lift, much higher travel lift, slower spin, and a more exaggerated aerial/travel pose so the leap reads better before the slam.
- Reworked `src/entities/RoarBurstEffect.ts` so the roar effect is now centered around the chest/shoulders with a rising chest wave, chest ring, and shoulder halo, while the ground ring is reduced to a lower-opacity support element.
- Boosted `fireWheel` chest-up posture in `src/player/animation/HeroPoseConfig.ts` so the body/sword presentation supports the raised roar effect better.

Poly Pizza + LMB readability follow-up:
- Downloaded and integrated the Poly Pizza sword asset at `src/assets/models/poly-pizza-sword.glb`, then wired it into `src/player/PlayerAvatar.ts` with `GLTFLoader` plus a primitive fallback if loading fails.
- Retuned the hero idle/run poses in `src/player/animation/HeroPoseConfig.ts` so the sword sits in a clearer right-side ready stance instead of hanging low and flat across the body.
- Reworked `swing` startup/active/recovery pose data and active action-curve motion in `src/player/animation/HeroPoseConfig.ts` and `src/player/animation/CombatPresentationController.ts` so LMB transitions out of idle more cleanly and sweeps across the front at chest height.
- Added a lightweight crescent slash trail in `src/player/PlayerAvatar.ts` that appears only during `swing`, making the half-moon read from the gameplay camera without touching combat logic.
- Increased the Poly Pizza sword display scale and grip offset in `src/player/PlayerAvatar.ts` so the asset reads more clearly in third person.
- Validation: `npm run build` passes. Browser screenshot passes on the temporary Vite server at `http://127.0.0.1:4182` confirmed the improved idle hold plus a visible crescent slash during `swing:active`.

Front half-moon swing correction:
- Continued iterating on `src/player/animation/HeroPoseConfig.ts` and `src/player/animation/CombatPresentationController.ts` to move the `swing` active/recovery weapon path farther forward and higher, reducing the side-drift that made LMB look like a low shove instead of a forward slash.
- Reworked the slash helper in `src/player/PlayerAvatar.ts` from a torus-style volume into a flatter `RingGeometry` crescent, then re-parented/positioned it in torso space so it reads in front of the hero rather than stuck to the sword's side path.
- Final active-frame validation on `output/swing-mid-pass-6/shot-0.png` shows the sword and slash cue reading as a front half-moon at upper-body height from the normal gameplay camera.

Movement / locomotion tuning pass:
- Reworked `src/player/PlayerController.ts` so movement uses separate forward and strafe speed targets instead of a single normalized move-speed path.
- Added config-level movement tuning in `src/config/combatConfig.ts` for `forwardMoveSpeed`, `strafeMoveSpeed`, `strafeAccelerationMultiplier`, faster acceleration/deceleration, higher turn sharpness, and a dedicated `movementSmoothing` sharpness for faster direction response.
- Changed planar movement response to axis-based `moveTowards` handling, which makes left/right direction swaps much snappier and keeps strafing from feeling mushy.
- Tuned `src/player/animation/HeroPoseConfig.ts` locomotion settings to calm idle sway, reduce run bob amplitude/frequency, lower lean amounts, and reduce the exaggerated “tiny legs moving too much” feel.
- Added `locomotion.stride` tuning in `src/player/animation/HeroPoseConfig.ts` and used it in `src/player/animation/LocomotionAnimationLayer.ts` so visual stride rate scales more reasonably with actual travel distance, especially while strafing.
- Validation: `npm run build` passes. Browser checks on temporary Vite servers showed noticeably more forward travel over the same input burst and a calmer locomotion silhouette during movement screenshots.
- Validation: `npm run build` passes. Browser capture clearly showed `Q` higher and easier to read in the air during `vault:travel`. `E`'s chest-centered burst is implemented, but headless capture remained timing-sensitive and still deserves a quick manual in-browser look for the cleanest active frame.

Sword attack ownership fix:
- Removed the old extra `weaponAnchor` scene node from the live player rig path so the active weapon chain is now `visualRoot -> bodyRoot -> torsoRoot -> rightHandAnchor -> swordPivot -> swordVisualRoot`.
- Updated `src/player/animation/WeaponAnimationController.ts` so attack-time sword pivot transforms resolve with much higher sharpness than the hand anchor, which keeps the blade from lagging behind short startup/active/recovery windows.
- Retuned idle, `swing`, `thrustCharge`, and `thrustRelease` in `src/player/animation/HeroPoseConfig.ts` so the sword starts from a cleaner ready hold, pulls back during startup/charge, and finishes attacks with visible follow-through.
- Reworked `src/player/animation/CombatPresentationController.ts` so `LMB` is driven mainly by `swordPivot` sweeping from side A to side B across the body, with the hand only supporting the motion, and `RMB` now uses a pulled-back charge into a heavy diagonal slash instead of a hand-thrust presentation.
- Added dev-only sword rig logging in `src/player/PlayerAvatar.ts` that reports the active sword parent chain and JSON-formatted `swordPivot` local position/rotation samples during `swing`, `thrustCharge`, and `thrustRelease`.
- Validation: `npm run build` passes. Direct Playwright capture on `http://127.0.0.1:4173` confirmed visible `LMB` slash traversal in `output/direct-sword-check-2/lmb-active-1.png` and `output/direct-sword-check-2/lmb-active-2.png`, plus `RMB` charge/release ownership in `output/direct-rmb-check/charge-2.png` and `output/direct-rmb-check/release-1.png`.

Camera + sword cleanup pass:
- Added yaw wrapping in `src/player/ThirdPersonCameraRig.ts` so sustained mouse-right input no longer risks drifting into a bad accumulated yaw state.
- Shifted the camera into a stronger over-the-right-shoulder composition by increasing `combatConfig.camera.shoulderOffset` and adding `combatConfig.camera.targetShoulderOffset`, which biases the look target as well as the camera position.
- Flattened the `LMB` sword path in `src/player/animation/HeroPoseConfig.ts` and `src/player/animation/CombatPresentationController.ts` by removing the giant roll flip that was turning the sword upside down during the slash.
- Raised the supporting right-arm bend in `src/player/PlayerAvatar.ts` during `swing` startup/active so the hand/elbow line better supports a guarded windup and follow-through instead of a low detached-looking cut.
- Validation: `npm run build` passes. Manual Playwright probe at `http://127.0.0.1:4177` confirmed camera yaw reaches `-2.8` after repeated rightward mouse deltas in `output/direct-camera-yaw-check` and the latest `LMB` active frame in `output/direct-sword-manual-check/shot.png` no longer shows the upside-down flip.

LMB / RMB melee readability polish:
- Reduced melee body-drive in `src/config/combatConfig.ts` by cutting `swing` / `thrust` moveScale and lunge speed so the weapon leads the attack instead of the whole capsule shoving forward.
- Suppressed non-attack presentation harder in `src/player/animation/HeroPoseConfig.ts` and `src/player/animation/LocomotionAnimationLayer.ts` by lowering attack locomotion/idle bleed and fading ready-bias much more aggressively while attacking.
- Rebuilt `swing` and `thrust` action curves in `src/player/animation/CombatPresentationController.ts` so the hand stays closer to the body while `swordPivot` carries the pullback, active slash arc, and recovery settle.
- Added a tiny melee hit-stop plus stronger camera shake / hit-confirm timing in `src/player/PlayerCombatController.ts`, and increased hit-confirm recoil in `src/player/animation/CombatPresentationController.ts` so landed sword hits feel less soft.
- Strengthened slash readability in `src/player/PlayerAvatar.ts` by making the `LMB` crescent trail brighter, larger, and more clearly front-facing, and by reusing the trail for `RMB` release.
- Validation: `npm run build` passes. Fresh captures on `http://127.0.0.1:4173` show the improved `LMB` arc in `output/direct-sword-check-3/lmb-active-1.png` and `output/direct-sword-check-3/lmb-active-2.png`, plus the stronger `RMB` charge silhouette in `output/direct-sword-check-3/rmb-charge-2.png`.

Ranged prototype pivot:
- Restored standard `A` / `D` strafing in `src/config/inputConfig.ts` and pivoted the current prototype toward a simple ranged slice instead of melee.
- Reworked movement tuning in `src/config/combatConfig.ts` for faster top speed, much snappier strafing, stronger braking, cleaner reversals, higher turn sharpness, faster dash timing, and explicit ranged projectile tuning (`forwardMoveSpeed`, `strafeMoveSpeed`, `acceleration`, `deceleration`, `jumpSpeed`, `dash`, `projectile`).
- Replaced the melee-heavy `src/player/PlayerCombatController.ts` with a lightweight ranged controller that only handles `LMB` arrow fire, `Shift` ground dash, cooldowns, subtle hit confirm, and small screen shake.
- Updated `src/player/PlayerController.ts` to compute a logical projectile spawn point near the character's right side and to use the new ranged combat controller while keeping movement camera-relative and grounded.
- Added `src/entities/ArrowProjectile.ts` as the new visible ranged shot: readable shaft/tip mesh, light trail, straightforward forward travel, dummy collision, and destroy-on-hit/expire behavior.
- Extended `src/game/combatTypes.ts` and `src/game/GameWorld.ts` so the world can spawn/update arrows, report active arrows in `render_game_to_text`, and spawn hit pulses on impact.
- Reworked `src/game/GameWorld.ts` aiming so arrows use a player-origin aim ray with softened camera pitch plus a small dummy acquisition cone. This removed the bad over-the-shoulder parallax miss and made center shots reliably hit the forward dummy.
- Updated `src/ui/DebugHud.ts` for the ranged slice (`Ranged Prototype`, arrow cooldown text, arrow count in debug).
- Hid the sword visual root in `src/player/PlayerAvatar.ts` so the old melee presentation does not distract from the ranged prototype pass.
- Added a tiny input press buffer plus default-browser-key suppression in `src/core/InputManager.ts`, and added a jump hold-latch in `src/player/PlayerController.ts` so single-tap actions are less likely to get lost between frames.
- Validation: `npm run build` passes. Browser checks on `http://127.0.0.1:4179` confirmed:
  - forward movement reaches `14.6 m/s` in `output/ranged-check-final/move-forward.json`
  - strafing reaches `13.8 m/s` in `output/ranged-check-final/strafe-right.json`
  - dash moves the player sharply from `z -11.5` to `z -4.93` in `output/ranged-check-final/dash-end.json`
  - arrow hit chain is working: the forward dummy drops to `87%` health in `output/ranged-arrow-debug/after-fire-7.json` and `output/ranged-check-final/fire-hit.json`
- Remaining gap: automated `Space`/jump validation is still flaky in headless Playwright on this machine even after the input buffer/latch pass, so jump is implemented in code but still wants one quick manual in-browser sanity check.

Aerial archery arena pass:
- Re-tuned movement in `src/config/combatConfig.ts` for the faster aerial prototype: `forwardMoveSpeed 16.8`, `strafeMoveSpeed 15.8`, higher accel/decel/reverse accel, stronger air control, and `jumpSpeed 8.8`.
- Reworked `src/player/PlayerCombatController.ts` into a minimal aerial-ranged ability loop:
  - `LMB` fires arrows instantly
  - `Shift` is now a directional ground/air dash that adds momentum instead of replacing it
  - `Q` adds forward impulse plus vertical launch speed
  - `E` activates a visible single-hit wind shield with cooldown/duration
- Extended `src/game/combatTypes.ts` with projectile-specific hit results and target-owned projectile hit resolution.
- Updated `src/entities/DummyTarget.ts` with explicit projectile head/body zones:
  - headshot = `100`
  - body shot = `50`
  - dummy max health now `100`, so one headshot kills and two body shots kill.
- Updated `src/player/PlayerController.ts` so the player now also implements projectile hit zones plus shield interception logic, making the shield block path ready for future enemy arrows without adding multiplayer.
- Updated `src/entities/ArrowProjectile.ts` so arrows ask each target to resolve head/body/shield hits instead of relying on a generic sphere collision.
- Updated `src/game/GameWorld.ts` to pass arrows against `[player, ...dummies]`, use per-hit feedback colors/sizes, and aim arrows using a player-origin target acquisition cone so the off-center camera does not cause ugly over-shoulder misses.
- Added a visible wind shield shell to `src/player/PlayerAvatar.ts` and threaded `shieldActive` / `shieldFlash` through `src/player/animation/AnimationStateTypes.ts`.
- Extended `src/ui/DebugHud.ts` to show `launch cd` and `shield cd` in the debug panel.
- Validation: `npm run build` passes. Browser checks on `http://127.0.0.1:4179` confirmed:
  - forward movement reaches `16.8 m/s` in `output/aerial-archery-check/move-forward.json`
  - strafing reaches `15.8 m/s` in `output/aerial-archery-check/strafe-right.json`
  - dash snaps the player from `z -11.5` to `z -7.59` in `output/aerial-archery-check/dash.json`
  - body-shot arrow damage works cleanly: `dummy-3` drops to `0.5` health ratio in `output/aerial-archery-check/arrow-hit.json`
  - `Q` wind launch is visually airborne in `output/aerial-archery-check/wind-launch.png` with action label `Wind Launch`
  - `E` shield is visibly active in `output/aerial-archery-check/wind-shield.png` and reports `shield cd` plus `playerStatuses:["shield"]`
- Remaining gaps:
  - automated `render_game_to_text` sampling still lags the screenshot by a frame or two in some Playwright captures, so the launch screenshot is more trustworthy than the paired JSON for vertical state
  - headshot logic is implemented but still wants one quick manual in-browser aim test because the current automation path is centered on the body-height reticle
  - shield absorb logic is implemented for incoming enemy arrows, but there is still no live enemy archer in the prototype to exercise it naturally yet

Aim + input swap follow-up:
- Swapped `A` and `D` again in `src/config/inputConfig.ts` so `A` now moves right and `D` moves left, matching the latest control request.
- Replaced the helper aim-target approximation in `src/game/GameWorld.ts` with a real center-screen `Raycaster` against arena and dummy geometry, then use that raycast hit point as the projectile target.
- Validation: `npm run build` passes. Browser check on `http://127.0.0.1:4179` confirms `KeyA` now drives right strafe in `output/aim-fix-check/move-right-via-a.json`, and the arrow now spawns along the center-screen aim line in `output/aim-fix-check/arrow-fired.png` instead of using the old nearby-target helper.

Wind-burst + charge-shot identity pass:
- Reworked `src/player/PlayerCombatController.ts` so `LMB` is now a real charge-release shot instead of a fixed-speed click fire:
  - hold starts charge immediately
  - release samples arrow speed from a real `tap -> medium -> full` curve using the existing `mediumSpeed` config
  - charge now also influences projectile gravity/spread for a more obvious tap-vs-precision split without changing damage
  - movement slowdown while charging now ramps up with actual charge amount instead of applying one flat slowdown from frame one
  - HUD/action labels now distinguish `Charging Shot`, `Full Draw`, `Quick Shot`, and `Precision Shot`
- Extended `src/entities/ArrowProjectile.ts` and `src/game/combatTypes.ts` so each arrow can carry `chargeRatio` visual data; charged arrows now get brighter tips and longer, clearer trails for readability.
- Added lightweight on-player readability cues in `src/player/PlayerAvatar.ts`:
  - a right-hand charge ring / ghost-arrow cue while charging
  - full-draw pulse amplification at max charge
  - a wind-burst ring / halo during the `Q` launch window
- Retuned `src/config/combatConfig.ts` for the new identity:
  - stronger tap vs full shot split (`tapSpeed 20`, `mediumSpeed 36`, `fullSpeed 62`, `tapGravity 15`, `fullGravity 2.4`, tighter full-charge spread)
  - slightly longer arrow life for readable long shots
  - more committed charge movement slowdown (`movementSlowScale 0.72`)
  - `Q` now uses a stronger upward burst, slightly less forward shove, and a softer slow-fall profile to better suggest `burst -> hang -> drop`
- Updated `src/ui/DebugHud.ts` so full charge now clearly reads `Full draw ready` and uses a brighter charge-bar treatment.
- Validation:
  - `npm run build` passes.
  - Ran the shared `web_game_playwright_client.js` successfully against `http://127.0.0.1:4179` with scripted hold/release input.
  - Ran the dedicated `wind-charge-check.mjs` again after the retune and inspected screenshots:
    - `output/wind-charge-check/full-charge-hold.json` now reports `action: "Full Draw"` and `charge: 1`
    - `output/wind-charge-check/wind-burst-rise.png` clearly shows the new burst ring and airborne launch
    - `output/wind-charge-check/wind-burst-hang.png` shows the player still airborne later in the sequence
- Remaining honest gap:
  - the automated capture timing on this machine still drifts enough that the screenshot HUD and the paired text dump occasionally disagree by a phase or two, so the exact best-feeling `Q` hang length still wants one quick live browser sanity check even though the code path and visuals are in.

Directional dash / air-control pass:
- Updated `src/config/combatConfig.ts` so dash tuning now explicitly exposes `speed`, `distance`, `duration`, `airDashCount`, `downwardDashMultiplier`, and `cooldown`.
- Reworked `src/player/PlayerCombatController.ts` so `Shift` now:
  - resolves dash direction from current movement input relative to the camera
  - defaults to forward dash when no movement input is held
  - adds a downward component when the camera is intentionally angled down
  - works on the ground and in the air
  - allows only one airborne dash before landing resets the count
  - adds impulse on top of existing motion instead of hard-resetting velocity
- Updated `src/player/PlayerController.ts` so combat `extraVelocity.y` now actually contributes to movement, which was required for downward-biased dashes to affect descent.
- Also changed ground snap / movement readout to use the effective vertical velocity, so fast downward dashes land cleanly instead of being blocked by the old jump-only vertical check.
- Tuned downward dash influence to ignore the camera's mild default downward pitch and only kick in more strongly when the player is deliberately looking downward. This keeps mid-air repositioning usable while still allowing faster descents on demand.
- Validation:
  - `npm run build` passes.
  - Dedicated directional checks in `output/dash-direction-check` confirm:
    - forward dash moves player from `z -11.5` to `z -7.19`
    - strafe dash on current `A` mapping moves player from `x 0` to `x 4.69`
  - Ran the shared `web_game_playwright_client.js` again after the dash pass with no new console/runtime errors.
- Direct airborne probe in `output/dash-air-direct-check` shows the dash visually working while airborne, but the existing screenshot/JSON phase drift still affects the paired state dumps, so the one-air-dash rule is strongest in code review plus live browser feel right now rather than perfectly represented by headless text output.

Bow projectile tuning pass:
- Replaced the old flat projectile tuning block in `src/config/combatConfig.ts` with a dedicated `bow` config shaped around the requested tiers:
  - `damage.head = 100`
  - `damage.body = 50`
  - `charge.minReleaseTime = 0.1`
  - `charge.fullChargeTime = 0.85`
  - `arrow.tap.speed = 60`, `gravityMultiplier = 1.0`, `lifetime = 1.15`
  - `arrow.mid.speed = 88`, `gravityMultiplier = 0.8`, `lifetime = 1.4`
  - `arrow.full.speed = 125`, `gravityMultiplier = 0.65`, `lifetime = 1.7`
- Added `bow.arrow.gravityBase`, `radius`, `fireInterval`, `movementSlowScale`, and spread tuning so the tiered shot behavior stays easy to iterate without scattering numbers through gameplay logic.
- Updated `src/player/PlayerCombatController.ts` so charge now samples speed, gravity, and lifetime from `tap -> mid -> full` tiers rather than just lerping between two endpoints.
- Updated `src/entities/ArrowProjectile.ts` defaults to use the new bow config and keep charged arrow visuals readable.
- Updated `src/entities/DummyTarget.ts` and `src/player/PlayerController.ts` head/body projectile damage references to use `combatConfig.bow.damage`.
- Validation:
  - `npm run build` passes.
  - Re-ran `wind-charge-check.mjs` and the shared `web_game_playwright_client.js`.
  - `output/wind-charge-check/full-charge-hold.json` shows `action: "Full Draw"` with `charge: 1`.
  - The tap-shot screenshot still shows obvious projectile travel close to the player, while the charged-release dump in `output/wind-charge-check/full-charge-release.json` shows the much longer/faster travel profile expected from the new full-charge values.
- Remaining feel note:
  - these values are intentionally aggressive for a fast aerial arena bow. If live play makes full charge feel too close to hitscan, the first follow-up should be to lower `bow.arrow.full.speed` slightly and/or raise `bow.arrow.gravityBase` slightly rather than changing damage or adding new mechanics.

Momentum tech pass:
- Added a new `momentumTech` config block in `src/config/combatConfig.ts` for:
  - `retentionPercent`
  - `jumpWindowDuration`
  - `boostedJumpHorizontalMultiplier`
  - `boostedJumpVerticalBonus`
  - `maxCarrySpeedCap`
  - `momentumDecayRate`
  - `minimumCarrySpeed`
- Updated `src/player/PlayerController.ts` so a recent air dash now records its planar burst velocity, opens a short landing window on touchdown, and lets the next jump preserve capped horizontal carry if it happens during that window.
- The preserved carry is horizontal-first, uses only a small vertical bonus, decays naturally after the jump, and clears cleanly after the window or after use so it cannot stack into runaway speed.
- Added subtle readability through the existing avatar/action tint path plus a temporary `momentum:<time>` player debug status while the timing window is live.
- Validation:
  - `npm run build` passes.
  - Ran the shared `web_game_playwright_client.js` after the change.
  - Added `momentum-tech-check.mjs` for a direct browser probe, then verified the mechanic in open space:
    - boosted timing-window jump (`45ms` after landing) carried `0.45` world units after jump input
    - late jump (`260ms` after landing) carried `0.16` world units after jump input
    - boosted jump also held higher post-jump move speed (`0.49` vs `0.20`) in `output/momentum-tech-check/summary.json`
- Remaining caveat:
  - the deterministic headless captures on this machine still compress some in-air motion into a narrow window, so the numbers are more trustworthy than the screenshots for the exact carry amount. The mechanic is implemented and measurably stronger when timed correctly, but it still deserves one quick live browser feel check.

Sunlit forest ruins arena pass:
- Replaced the old flat graybox arena config in `src/config/arenaConfig.ts` with a larger mirrored forest-ruins layout built around:
  - north/south spawn courts
  - one central courtyard
  - left/right outer terraces with ramps
  - 4 small raised perches
  - broken-wall / pillar / slab cover
  - ruined arch fragments
  - restrained shrubs and perimeter trees
  - 3 authored boost pads
- Rebuilt `src/game/GrayboxArena.ts` so the arena is generated from the new named config sections and exposes `sampleBoostPad()` plus animated boost pad debug state.
- Added authored boost pad launches:
  - central pad = higher mostly vertical contest launch
  - west/east route pads = stronger forward arc re-entry lines
  - trigger logic is environment-side, fixed-vector, and requires leaving pad overlap before retriggering
- Kept major arena roots editable via `editableRoot`, including cover, ruins, terraces, perches, trees, greenery clusters, spawn pads, and boost pads.
- Updated `src/player/PlayerController.ts` so boost pad launches feed movement directly without touching combat abilities, while still coexisting with jump, dash, and momentum tech.
- Updated `src/game/GameWorld.ts` to:
  - remove healing station logic for this arena
  - animate the arena every frame
  - reposition dummies into central / side-lane / perch / route test spots
  - expose boost pad positions in `render_game_to_text`
  - retune sky/fog/lighting for brighter sunlit ruins readability
- Validation:
  - `npm run build` passes after the arena pass.
  - Ran the shared `web_game_playwright_client.js` and inspected `output/forest-ruins-shared-client/shot-0.png`, which shows the new theme, side terraces, side pads, and chunkier cover from the gameplay camera.
  - Ran direct browser captures in `output/forest-ruins-direct-check`; `center-launch.png` / `center-air.png` show the central boost pad route reading clearly on screen.
- Remaining caveat:
  - the central boost route is visually validated, but the side-pad launch still wants one quick manual browser feel pass. The pad is in a good readable lane position, but the headless movement route I used did not hit it cleanly enough to treat that launch as fully screenshot-verified.

