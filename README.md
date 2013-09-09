Introduction
------------

Team Keys is a plugin for [Ingress Intel Total Conversion](http://github.com/jonatkins/ingress-intel-total-conversion), that builds on the [Keys plugin](http://iitc.jonatkins.com/?page=desktop#plugin-keys) to allow teams to collaborate with their lists of keys.

Teams are run by moderators, who can add new members to their teams.  These members are able to see any keys anyone declares in their inventory.  This plugin (nor the Keys plugin) can actually read your Ingress inventory - you have to manually enter your keys.


Installation
------------

* Install IITC and the Keys plugin, in Chrome/Tampermonkey, Firefox/Greasemonkey, or otherwise.
* Install Team Keys, making sure it loads after both IITC and Keys.
* Reload the [Intel page](http://www.ingress.com/intel).


Joining a Team
--------------

At the moment, teams on the development are added manually.  If you would like to request a team for your faction and region, get in touch and accounts can be set up.

If you have a team to join, it will be shown in a prompt when the page loads.  Selecting a team links your key inventory to that team - all your keys are synced, and keys of all team members become available.


Using Team Keys
---------------

Specify what keys you have by selecting a portal, and setting the Keys value under the picture.  As you change this value, the text underneath updates to show keys are available in your team's inventory.

Clicking the "who" link shows a list of all users with keys to that portal.  You can select their names to mention them in the chat.

A number of links are added to the toolbox, allowing you to get a list of all team keys arranged by portal or by user.  If you are a moderator, you can also open the moderator window to manage users in your team.


Running Your Own
----------------

Upload the **teamkeys.php** file to your server, and update the value of `window.plugin.teamKeys.server` in **teamkeys.user.js**.

The database for this plugin has two tables:

```sql
CREATE TABLE `teamkeys_keys` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(36) NOT NULL,
  `team` varchar(100) NOT NULL,
  `portal` varchar(36) NOT NULL,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

CREATE TABLE `teamkeys_teams` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(36) NOT NULL,
  `team` varchar(100) NOT NULL,
  `role` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;
```