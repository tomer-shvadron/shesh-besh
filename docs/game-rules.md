# Backgammon Rules (as implemented)

## Setup
- 24 narrow triangles (points) numbered 1-24
- Each player starts with 15 checkers in standard position:
  - White: 2 on point 24, 5 on point 13, 3 on point 8, 5 on point 6
  - Black: 2 on point 1, 5 on point 12, 3 on point 17, 5 on point 19

## Direction of Play
- White moves from point 24 toward point 1 (bearing off past point 1)
- Black moves from point 1 toward point 24 (bearing off past point 24)

## Opening Roll
- Each player rolls one die
- The player with the higher number goes first, using both dice as their roll
- If tied, both re-roll until different

## Rolling and Moving
- Player rolls two dice at start of turn
- Each die represents a separate move (can be applied to same or different checkers)
- **Doubles**: Rolling the same number on both dice = 4 moves with that value
- A checker can only land on a point that is: open (empty), occupied by own checkers, or occupied by exactly 1 opponent checker (a "blot")

## Hitting and the Bar
- Landing on a blot (single opponent checker) "hits" it — the opponent's checker goes to the bar
- A player with checkers on the bar must re-enter them before making any other move
- Re-entry: roll dice and enter into opponent's home board on the point matching the die value
- If all entry points are blocked (2+ opponent checkers), the player loses their turn

## Must-Use Rules
- A player must use both dice if legally possible
- If only one die can be played, the player must play the higher die if possible
- If neither die can be played, the turn is forfeited (auto-skip with message)

## Bearing Off
- A player may only bear off when ALL 15 of their checkers are in their home board
  (points 1-6 for white, points 19-24 for black)
- To bear off: use a die that matches the point number of a checker (relative to bearing off edge)
- If no checker is on the point indicated by the die, the player may bear off from the highest occupied point
  (only if the die is higher than the highest occupied point)
- A player is not required to bear off if another legal move exists

## Winning
- The first player to bear off all 15 checkers wins

## Not Implemented (v1)
- Doubling cube
- Gammon / backgammon scoring (double/triple stakes)
- Crawford rule
- Match play
