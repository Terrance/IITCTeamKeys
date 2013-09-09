// ==UserScript==
// @id             iitc-plugin-team-keys@OllieTerrance
// @name           IITC plugin: Team Keys
// @category       Keys
// @version        0.0.1.0
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @description    Allows teams to collaborate with keys, showing all keys owned by each member of the team.
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper() {
    // in case IITC is not available yet, define the base plugin object
    if (typeof window.plugin !== "function") {
        window.plugin = function() {};
    }
    // if the Keys plugin is not available, quit now
    if (!window.plugin.keys) {
        return console.warn("[Team Keys] This plugin is dependent on the Keys plugin being present.");
    }
    // truncate a string to a given number of characters
    function trunc(str, len) {
        if (str.length > len) {
            return str.substr(0, len - 3) + "...";
        }
        return str;
    }
    // fetch a portal name from a cached list if available
    function getPortalName(portal) {
        // try plugin cache
        if (window.plugin.teamKeys.portalCache[portal]) {
            return window.plugin.teamKeys.portalCache[portal];
        // if currently on-screen
        } else if (window.portals[portal]) {
            var name = window.portals[portal].options.details.portalV2.descriptiveText.TITLE;
            // cache for later
            window.plugin.teamKeys.portalCache[portal] = name;
            window.localStorage["plugin-teamKeys-portalCache"] = JSON.stringify(window.plugin.teamKeys.portalCache);
            return name;
        // portal name not available
        } else {
            return "{" + portal + "}";
        }
    }
    // base context for plugin
    window.plugin.teamKeys = function() {};
    // empty cache to hold portal names
    window.plugin.teamKeys.portalCache = {};
    // server script to sync with
    window.plugin.teamKeys.server = "http://terrance.uk.to/labs/teamkeys.php";
    // current user's team
    window.plugin.teamKeys.team = null;
    // sync all keys with the server
    window.plugin.teamKeys.sync = function() {
        // hide current key count for displayed portal
        $("#teamKeys").html("Refreshing team keys...");
        console.log("[Team Keys] Refreshing team keys...");
        $.ajax({
            url: window.plugin.teamKeys.server,
            method: "POST",
            data: {
                action: "sync",
                user: window.PLAYER.guid,
                team: window.plugin.teamKeys.team.team,
                keys: window.plugin.keys.keys
            },
            success: function(resp, status, obj) {
                console.log("[Team Keys] Response received.");
                var data = JSON.parse(resp);
                // if user is authenticated
                if (data.auth) {
                    window.plugin.teamKeys.keysByEntry = {};
                    window.plugin.teamKeys.keysByPortal = {};
                    window.plugin.teamKeys.keysByUser = {};
                    /*
                    byEntry = [
                        {count, portal, user},
                        ...
                    ]
                    byPortal = {
                        portal: [user, ...],
                        ...
                    }
                    byUser = {
                        user: [portal, ...],
                        ...
                    }
                    */
                    if (data.count) {
                        window.plugin.teamKeys.keysByEntry = data.keys;
                        for (var x in window.plugin.teamKeys.keysByEntry) {
                            var entry = window.plugin.teamKeys.keysByEntry[x];
                            // try to cache names
                            getPortalName(entry.portal);
                            window.getPlayerName(entry.user);
                            // if no byPortal entries for portal, start list
                            if (!window.plugin.teamKeys.keysByPortal[entry.portal]) {
                                window.plugin.teamKeys.keysByPortal[entry.portal] = [];
                            }
                            // append user once for each key
                            for (var i = 0; i < entry.count; i++) {
                                window.plugin.teamKeys.keysByPortal[entry.portal].push(entry.user);
                            }
                            // if no byUser entries for user, start list
                            if (!window.plugin.teamKeys.keysByUser[entry.user]) {
                                window.plugin.teamKeys.keysByUser[entry.user] = [];
                            }
                            // append portal once for each key
                            for (var i = 0; i < entry.count; i++) {
                                window.plugin.teamKeys.keysByUser[entry.user].push(entry.portal);
                            }
                        }
                    }
                    // re-show info on selected portal
                    window.plugin.teamKeys.addInfo();
                } else {
                    window.plugin.teamKeys.authFail();
                }
            },
            error: function(obj, status, err) {
                console.warn("[Team Keys] Failed to sync: " + status);
                setTimeout(function() {
                    window.plugin.teamKeys.sync();
                }, 3000);
            }
        });
    };
    // show list of all portals with keys
    window.plugin.teamKeys.showByPortal = function() {
        var out = [];
        $.each(window.plugin.teamKeys.keysByPortal, function(portal, users) {
        	var portalName = getPortalName(portal);
            out.push("<a onclick=\"window.plugin.teamKeys.keysForPortal('" + portal + "');\">" + portalName + "</a>");
            if (users.length > 1) {
                out[out.length - 1] += " (" + users.length + ")";
            }
        });
        dialog({
            title: "Team keys: all portals",
            html: out.join("<br/>")
        });
    };
    // show list of all users with keys to a single portal
    window.plugin.teamKeys.keysForPortal = function(portal) {
        var keys = window.plugin.teamKeys.keysByPortal[portal];
        var keysByUser = {};
        /* {
            user: count,
            ...
        } */
        for (var x in keys) {
            if (!keysByUser[keys[x]]) {
                keysByUser[keys[x]] = 0;
            }
            keysByUser[keys[x]]++;
        }
        var out = [];
        for (var x in keysByUser) {
            out.push("<a onclick=\"window.chat.addNickname('@" + getPlayerName(x) + "');\">" + getPlayerName(x) + "</a>");
            if (keysByUser[x] > 1) {
                out[out.length - 1] += " (" + keysByUser[x] + ")";
            }
        }
        var portalName = getPortalName(portal);
        dialog({
            title: "Team keys: " + trunc(portalName, 20),
            html: out.join("<br/>")
        });
    };
    // show list of all users with keys
    window.plugin.teamKeys.showByUser = function() {
        var out = [];
        $.each(window.plugin.teamKeys.keysByUser, function(user, portals) {
        	var userName = window.getPlayerName(user);
            out.push("<a onclick=\"window.plugin.teamKeys.keysForUser('" + user + "');\">" + userName + "</a>");
            // show count if greater than 1
            if (portals.length > 1) {
                out[out.length - 1] += " (" + portals.length + ")";
            }
        });
        dialog({
            title: "Team keys: all members",
            html: out.join("<br/>")
        });
    };
    // show list of all portals with keys owned by a single user
    window.plugin.teamKeys.keysForUser = function(user) {
        var keys = window.plugin.teamKeys.keysByUser[user];
        var keysByPortal = {};
        /* {
            portal: count,
            ...
        } */
        for (var x in keys) {
            if (!keysByPortal[keys[x]]) {
                keysByPortal[keys[x]] = 0;
            }
            keysByPortal[keys[x]]++;
        }
        var out = [];
        for (var x in keysByPortal) {
            out.push(getPortalName(x));
            // show count if greater than 1
            if (keysByPortal[x] > 1) {
                out[out.length - 1] += " (" + keysByPortal[x] + ")";
            }
        }
        var userName = window.getPlayerName(user);
        dialog({
            title: "Team keys: " + trunc(userName, 20),
            html: out.join("<br/>")
        });
    };
    // add info text under key controls
    window.plugin.teamKeys.addInfo = function() {
        $("#teamKeys").remove();
        if (window.plugin.teamKeys.keysByPortal[window.selectedPortal]) {
            var count = window.plugin.teamKeys.keysByPortal[window.selectedPortal].length;
            var div = $("<div id='teamKeys'></div>").html(count + " key" + (count > 1 ? "s" : "") + " total amongst your team (<a onclick='window.plugin.teamKeys.keysForPortal(window.selectedPortal);'>who</a>).");
            div.prop("style").textAlign = "center";
            div.prop("style").fontSize = "smaller";
            $("#portaldetails > .mods").before(div);
        }
    };
    // mods only: moderator window for managing team
    window.plugin.teamKeys.showMod = function() {
        if (window.plugin.teamKeys.team.role >= 1) {
            var modDialog = dialog({
                title: "Team keys: team moderation",
                html: "Loading team members..."
            });
            // hide OK button
            var dialogButtons = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix", modDialog.parent());
            dialogButtons.prop("style").display = "none";
            console.log("[Team Keys] Refreshing team members...");
            $.ajax({
                url: window.plugin.teamKeys.server,
                method: "POST",
                data: {
                    action: "members",
                    user: window.PLAYER.guid,
                    team: window.plugin.teamKeys.team.team
                },
                success: function(resp, status, obj) {
                    console.log("[Team Keys] Response received.");
                    var data = JSON.parse(resp);
                    // if user is authenticated
                    if (data.auth) {
                        // fetch player names
                        var members = [];
                        $.each(data.members, function(index, item) {
                            members.push(getPlayerName(item));
                        });
                        var mods = [];
                        $.each(data.mods, function(index, item) {
                            if (item !== window.PLAYER.guid) {
                                mods.push(getPlayerName(item));
                            }
                        });
                        var oldHeight = modDialog.height();
                        modDialog.html("<strong>Team: " + window.plugin.teamKeys.team.team + "</strong><br/><br/>Enter the usernames of people you wish to add to the team, one per line.<br/><br/>Note: you don't need to include yourself in the moderator list.  You also cannot remove yourself from the moderators list; you must first assign another moderator and ask them to remove you.<br/><br/>");
                        var membersField = $("<textarea rows='10' style='width: 100%;'/>").val(members.sort().join("\n"));
                        modDialog.append("<strong>Members</strong> (");
                        var link = $("<a>sort</a>");
                        link.on("click", function(e) {
                            membersField.val(membersField.val().split("\n").sort().join("\n"));
                        });
                        modDialog.append(link);
                        modDialog.append(")<br/>");
                        modDialog.append(membersField);
                        var modsField = $("<textarea rows='5' style='width: 100%;'/>").val(mods.sort().join("\n"));
                        modDialog.append("<strong>Moderators</strong> (");
                        var link = $("<a>sort</a>");
                        link.on("click", function(e) {
                            modsField.val(modsField.val().split("\n").sort().join("\n"));
                        });
                        modDialog.append(link);
                        modDialog.append(")<br/>");
                        modDialog.append(modsField);
                        // replace OK button
                        var oldButton = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix button", modDialog.parent());
                        var okButton = oldButton.clone();
                        oldButton.remove();
                        okButton.on("click", function(e) {
                            window.plugin.teamKeys.setMod(membersField.val(), modsField.val(), modDialog);
                        });
                        // re-position dialog to centre
                        $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix .ui-dialog-buttonset", modDialog.parent()).append(okButton);
                        dialogButtons.prop("style").display = "block";
                        modDialog.parent().prop("style").top = parseInt(modDialog.parent().prop("style").top) - ((modDialog.height() - oldHeight) / 2) + "px";
                    } else {
                        window.plugin.teamKeys.authFail(modDialog);
                    }
                },
                error: function(obj, status, err) {
                    console.warn("[Team Keys] Failed to sync: " + status);
                    setTimeout(function() {
                        window.plugin.teamKeys.sync();
                    }, 5000);
                }
            });
        }
    };
    // mods only: update the list of members in the team
    window.plugin.teamKeys.setMod = function(members, mods, modDialog) {
        var data = {
            action: "members",
            user: window.PLAYER.guid,
            team: window.plugin.teamKeys.team.team,
            members: [],
            mods: []
        };
        members = (members ? members.split("\n") : []);
        mods = (mods ? mods.split("\n") : []);
        var noLookup = [];
        $.each(mods, function(index, item) {
            // unmatched username in braces, use exact value
            if (item.match(/^{[0-9a-f]{32}\.c}$/)) {
                var mod = item.substr(1, 34);
            // reverse lookup name
            } else {
                var mod = window.playerNameToGuid(item);
                if (mod) {
                    // add if not current user and not already in mod list
                    if (mod !== window.PLAYER.guid && mods.indexOf(mod) === -1) {
                        data.mods.push(mod);
                    }
                // username not cached
                } else {
                    noLookup.push(item);
                }
            }
        });
        $.each(members, function(index, item) {
            // unmatched username in braces, use exact value
            if (item.match(/^{[0-9a-f]{32}\.c}$/)) {
                var member = item.substr(1, 34);
            // reverse lookup name
            } else {
                var member = window.playerNameToGuid(item);
                if (member) {
                    // add if not current user and not already in either list
                    if (member !== window.PLAYER.guid && members.indexOf(member) === -1 && mods.indexOf(member) === -1) {
                        data.members.push(member);
                    }
                // username not cached
                } else {
                    noLookup.push(item);
                }
            }
        });
        var oldHeight = modDialog.height();
        var dialogButtons = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix", modDialog.parent());
        dialogButtons.prop("style").display = "none";
        modDialog.html("Updating members...");
        modDialog.parent().prop("style").top = parseInt(modDialog.parent().prop("style").top) - ((modDialog.height() - oldHeight) / 2) + "px";
        console.log("[Team Keys] Updating team members...");
        $.ajax({
            url: window.plugin.teamKeys.server,
            method: "POST",
            data: data,
            success: function(resp, status, obj) {
                console.log("[Team Keys] Response received.");
                var data = JSON.parse(resp);
                if (data.auth) {
                    modDialog.html("Team members have been saved.");
                    // list non-cached usernames
                    if (noLookup.length) {
                        modDialog.append("<br/><br/>However, the following usernames did not resolve.  This happens if the user has not visited recently, and has no activity on the map.<br/><br/>");
                        modDialog.append(noLookup.join("<br/>"));
                    }
                    // restore default OK button
                    var oldButton = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix button", modDialog.parent());
                    var okButton = oldButton.clone();
                    oldButton.remove();
                    okButton.on("click", function(e) {
                        modDialog.parent().dialog().dialog("close");
                    });
                    // re-position dialog to centre
                    $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix .ui-dialog-buttonset", modDialog.parent()).append(okButton);
                    dialogButtons.prop("style").display = "block";
                } else {
                    window.plugin.teamKeys.authFail(modDialog);
                }
            },
            error: function(obj, status, err) {
                console.warn("[Team Keys] Failed to set mods: " + status);
                modDialog.html("Failed to update team members.  Retrying in 3 seconds...");
                setTimeout(function() {
                    window.plugin.teamKeys.setMod(members, mods, modDialog);
                }, 3000);
            }
        });
    };
    // list of teams available to the user
    window.plugin.teamKeys.selectTeam = function(teamDialog) {
        if (teamDialog) {
            teamDialog.html("Loading available teams...");
        } else {
            teamDialog = dialog({
                title: "Team keys: select team",
                html: "Loading available teams..."
            });
        }
        // hide OK button
        var dialogButtons = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix", teamDialog.parent());
        dialogButtons.prop("style").display = "none";
        console.log("[Team Keys] Refreshing available teams...");
        $.ajax({
            url: window.plugin.teamKeys.server,
            method: "POST",
            data: {
                action: "teams",
                user: window.PLAYER.guid
            },
            success: function(resp, status, obj) {
                console.log("[Team Keys] Response received.");
                var data = JSON.parse(resp);
                // teams available
                if (data.count) {
                    teamDialog.html("You are a member of " + data.count + " team" + (data.count > 1 ? "s" : "") + " (");
                    var link = $("<a>refresh</a>");
                    link.on("click", function(e) {
                        window.plugin.teamKeys.selectTeam(teamDialog);
                    });
                    teamDialog.append(link);
                    teamDialog.append(").  Select one below to start collaborating keys.<br/><br/>");
                    $.each(data.teams, function(index, item) {
                        var link = $("<a>" + item.team + " (" + ["member", "moderator"][item.role] + ")</a>");
                        link.on("click", function(e) {
                            window.plugin.teamKeys.checkTeam(item, teamDialog);
                        });
                        teamDialog.append(link);
                        teamDialog.append("<br/>");
                    });
                // user is not registered to any teams
                } else {
                    teamDialog.html("You don't appear to be a member of any teams at the moment (");
                    var link = $("<a>refresh</a>");
                    link.on("click", function(e) {
                        window.plugin.teamKeys.selectTeam(teamDialog);
                    });
                    teamDialog.append(link);
                    teamDialog.append(").  Get in touch with a team leader to request access.");
                    dialogButtons.prop("style").display = "block";
                }
            },
            error: function(obj, status, err) {
                console.warn("[Team Keys] Failed to fetch teams: " + status);
                teamDialog.html("Failed to fetch a list of teams.  Retrying in 3 seconds...");
                setTimeout(function() {
                    window.plugin.teamKeys.selectTeam(teamDialog);
                }, 3000);
            }
        });
    };
    // check permissions on a team, and join it
    window.plugin.teamKeys.checkTeam = function(team, teamDialog) {
        // recycle dialog
        if (teamDialog) {
            teamDialog.html("Checking permissions...");
            var dialogButtons = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix", teamDialog.parent());
        }
        console.log("[Team Keys] Refreshing available teams...");
        $.ajax({
            url: window.plugin.teamKeys.server,
            method: "POST",
            data: {
                action: "teams",
                user: window.PLAYER.guid
            },
            success: function(resp, status, obj) {
                console.log("[Team Keys] Response received.");
                var data = JSON.parse(resp);
                var joined = false;
                if (data.count) {
                    // check team to search exists
                    $.each(data.teams, function(index, item) {
                        if (item.team === team.team) {
                            joined = true;
                            // re-assign to store role status
                            team = item;
                            return;
                        }
                    });
                }
                // successfully checked
                if (joined) {
                    window.plugin.teamKeys.team = team;
                    window.localStorage["plugin-teamKeys-team"] = team.team;
                    window.plugin.teamKeys.setup();
                    window.plugin.teamKeys.sync();
                    if (teamDialog) {
                        teamDialog.html("All done, you can now collaborate keys with members of " + team.team + "!");
                        dialogButtons.prop("style").display = "block";
                    }
                // no permissions since check
                } else {
                    if (teamDialog) {
                        teamDialog.html("You don't seem to have permission to join that team.  Try ");
                        var link = $("<a>refreshing the team list</a>");
                        link.on("click", function(e) {
                            window.plugin.teamKeys.selectTeam(teamDialog);
                        });
                        teamDialog.append(link);
                        teamDialog.append(".");
                    } else {
                        // remove key if already exists
                        delete window.localStorage["plugin-teamKeys-team"];
                        window.plugin.teamKeys.selectTeam();
                    }
                }
            },
            error: function(obj, status, err) {
                console.warn("[Team Keys] Failed to check team: " + status);
                teamDialog.html("Failed to check your team membership.  Retrying in 3 seconds...");
                setTimeout(function() {
                    window.plugin.teamKeys.checkTeam(team, teamDialog);
                }, 3000);
            }
        });
    };
    // lost permissions whilst logged in
    window.plugin.teamKeys.authFail = function(authDialog) {
        // recycle dialog
        if (authDialog) {
            authDialog.html("Your team membership doesn't seem to be valid.  Click OK to refresh and login again.");
            var dialogButtons = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix", authDialog.parent());
            dialogButtons.prop("style").display = "block";
        } else {
            authDialog = dialog({
                title: "Team keys: authentication",
                html: "Your team membership doesn't seem to be valid.  Click OK to refresh and login again."
            });
        }
        // replace OK button
        var oldButton = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix button", authDialog.parent());
        var okButton = oldButton.clone();
        oldButton.remove();
        okButton.on("click", function(e) {
            window.plugin.teamKeys.logout();
        });
        $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix .ui-dialog-buttonset", authDialog.parent()).append(okButton);
    };
    // clear team key and refresh
    window.plugin.teamKeys.logout = function() {
        delete window.localStorage["plugin-teamKeys-team"];
        window.location.reload();
    };
    // initial setup hook
    window.plugin.teamKeys.setup = function() {
        // fake local storage if not provided by browser
        if (!window.localStorage) {
            window.localStorage = {};
        }
        // if logged in to a team
        if (window.plugin.teamKeys.team) {
            // if an existing portal cache, load it
            if (window.localStorage["plugin-teamKeys-portalCache"]) {
                window.plugin.teamKeys.portalCache = JSON.parse(window.localStorage["plugin-teamKeys-portalCache"]);
            // make a new cache
            } else {
                window.localStorage["plugin-teamKeys-portalCache"] = "{}";
            }
            // resync on start, when the map moves, or when key numbers change
            $.each(["iitcLoaded", "mapDataRefreshEnd", "pluginKeysUpdateKey", "pluginKeysRefreshAll"], function(index, item) {
                window.addHook(item, function() {
                    window.plugin.teamKeys.sync();
                });
            });
            // show current cached status, but still refresh
            window.addHook("portalDetailsUpdated", function() {
                window.plugin.teamKeys.addInfo();
                window.plugin.teamKeys.sync();
            });
            // add controls to toolbox
            var block = $("<a style='text-decoration: none;'>Team keys: </a>");
            var links = [];
            links.push("<a onclick=\"window.plugin.teamKeys.showByPortal();\" title=\"Display a list of portals, and all known keys held by team members.\">portals</a>");
            links.push("<a onclick=\"window.plugin.teamKeys.showByUser();\" title=\"Display a list of team members, and all their keys.\">users</a>");
            // show moderator link
            if (window.plugin.teamKeys.team.role === 1) {
                links.push("<a onclick=\"window.plugin.teamKeys.showMod();\" title=\"Display the moderator window to manage users in the team.\">mod</a>");
            }
            links.push("<a onclick=\"window.plugin.teamKeys.logout();\" title=\"Logout from your current team, in case you want to switch to another.\">logout</a>");
            block.append(links.join(" | "));
            $("#toolbox").append(block);
            // delete self to ensure setup can't be run again
            delete window.plugin.teamKeys.setup;
        // not logged in, but team name cached
        } else if (window.localStorage["plugin-teamKeys-team"]) {
            // check permissions on team before logging in
            window.plugin.teamKeys.checkTeam({team: window.localStorage["plugin-teamKeys-team"]});
        // never logged in
        } else {
            // show team selector
            window.plugin.teamKeys.selectTeam();
        }
    };
    // IITC plugin setup
    if (window.iitcLoaded && typeof window.plugin.teamKeys.setup === "function") {
        window.plugin.teamKeys.setup();
    } else if (window.bootPlugins) {
        window.bootPlugins.push(window.plugin.teamKeys.setup);
    } else {
        window.bootPlugins = [window.plugin.teamKeys.setup];
    }
}
// inject plugin into page
var script = document.createElement("script");
script.appendChild(document.createTextNode("(" + wrapper + ")();"));
(document.body || document.head || document.documentElement).appendChild(script);
