# Team Keys

Team Keys is a plugin for [Ingress Intel Total Conversion](http://github.com/jonatkins/ingress-intel-total-conversion), that builds on the [Keys plugin](http://iitc.jonatkins.com/?page=desktop#plugin-keys) to allow teams to collaborate with their lists of keys.

Teams are run by moderators, who can add new members to their teams.  These members are able to see any keys anyone declares in their inventory.  Neither this plugin nor the Keys plugin can actually read your Ingress inventory - you have to manually enter your keys.

## Requirements

* [Medoo](http://medoo.in)

## Installation

* Install IITC and the Keys plugin, in Chrome/Tampermonkey, Firefox/Greasemonkey, or otherwise.
* Install Team Keys, making sure it loads after both IITC and Keys.
* Reload the [Intel page](http://www.ingress.com/intel).

## Basic usage

If you have a team to join, it will be shown in a prompt when the page loads.  Selecting a team links your key inventory to that team - all your keys are synced, and keys of all team members become available.

Specify what keys you have by selecting a portal, and setting the Keys value under the picture.  As you change this value, the text underneath updates to show keys are available in your team's inventory.

Clicking the "who" link shows a list of all users with keys to that portal.  You can select their names to mention them in the chat.

A number of links are added to the toolbox, allowing you to get a list of all team keys arranged by portal or by user.  If you are a moderator, you can also open the moderator window to manage users in your team.

## Database schema

```sql
CREATE TABLE "teams" (
  "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  "user" text NOT NULL,
  "team" text NOT NULL,
  "role" integer NOT NULL DEFAULT '0'
);
CREATE TABLE "keys" (
  "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  "user" text NOT NULL,
  "team" text NOT NULL,
  "portal" text NOT NULL,
  "count" integer NOT NULL
);
CREATE TABLE "cache" (
  "key" text NOT NULL,
  "value" text NOT NULL,
  PRIMARY KEY ("key")
);
```

## Running your own

Upload the **teamkeys.php** file to your server, set the database connection details, and update the value of `window.plugin.teamKeys.server` in **teamkeys.user.js**.

Note that you will need to create your teams manually:

```sql
INSERT INTO `teamkeys__teams` (`user`, `team`, `role`)
  VALUES ("<your Ingress agent name>", "<team name>", 1);
```

Also, the server hosting the PHP script must provide it using HTTPS, otherwise browsers will reject requests to it from the Intel page.
