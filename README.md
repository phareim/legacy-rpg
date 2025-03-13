# Legacy RPG

A Legacy game changes as the player interacts with it.

The core data unit of Legacy is written text.

The core interaction unit of Legacy is a text-based command line interface.

The game is structured in locations, items and characters. 

Locations are the primary way to navigate the game. Each location has a name, description and a list of items and characters that are present in the location. The location has coordinates, which are used to navigate the player through the game. Coordinates are written on the form `x,y`. The player starts at `0,0`, and can move around using the commands `move north`, `move south`, `move east` and `move west`. Locations mentioned in the description of the location are written in the form `***location name***`.

Items have names, descriptions and are used to interact with the player. Items can be picked up and dropped, and can be used to interact with characters. Items can be written in the description of the location, with the item name surrounded by `*` (i.e. `*sword*`).

Characters have names, descriptions and are used to interact with the player. Characters can be interacted with, and can carry items. Characters can be written in the description of the location, with the character name surrounded by `**` (i.e. `**John**`).

The player can interact with the game by typing commands at the command line.

The game will then respond with a text-based description of the result of the command.

IMPORTANT: when the user performs an action that changes the environment, the description of the environment should be updated to reflect the changes. I.e.: the game changes as the player interacts with it.
