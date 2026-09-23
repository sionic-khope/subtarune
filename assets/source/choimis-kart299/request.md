# BUILD299 kart rider assets

Request: replace standing Dao/Bazzi in Choimis pink kart attacks with actual riders seated inside full cars. New assets only; runtime integration belongs to the pink-mode worker.

References: assets/enemies/dao-battle.png and assets/enemies/bazzi-battle.png, inspected with view_image. Role: character identity and pixel-cluster style. No assets/references directory exists in this game worktree.

Output: one static left/down three-quarter rider+kart per variant, center pivot, genuine alpha after magenta removal, nearest-neighbor scale. Proposed 48×40 final cells, subject fully contained; exact bbox and rendering contract follow generation QC. No animation or baked boost FX.

Provider: built-in image_gen only. Backend model, quality setting, usage and monetary cost are unknown because this tool does not expose them. Planned two calls, one per variant, with targeted retry only if QC fails.
