// ==UserScript==
// @id             iitc-plugin-team-keys@OllieTerrance
// @name           IITC plugin: Team Keys
// @category       Keys
// @version        0.0.1.5
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
    // base context for plugin
    window.plugin.teamKeys = function() {};
    var self = window.plugin.teamKeys;
    // user configurable options
    self.options = {};
    // empty cache to hold portal and user names
    self.cache = {};
    // server script to sync with
    self.server = "http://terrance.uk.to/labs/teamkeys.php";
    // fetch a portal name from a cached list if available
    self.getPortalName = function getPortalName(portal) {
        // try plugin cache
        if (self.cache[portal]) {
            return self.cache[portal];
        // if currently on-screen
        } else if (window.portals[portal]) {
            var name = window.portals[portal].options.details.portalV2.descriptiveText.TITLE;
            // cache for later
            self.cache[portal] = name;
            return name;
        // portal name not available
        } else {
            return "{" + portal + "}";
        }
    }
    // fetch a user name from a cached list if available
    self.getUserName = function getUserName(user) {
        // try plugin cache
        if (self.cache[user]) {
            return self.cache[user];
        // if cached by IITC
        } else if (window.getPlayerName(user) !== "{" + user + "}" && window.getPlayerName(user) !== "unknown") {
            var name = window.getPlayerName(user);
            // cache for later
            self.cache[user] = name;
        // if in local storage
        } else if (window.localStorage[user]) {
            var name = window.localStorage[user];
            // cache for later
            self.cache[portal] = name;
            return name;
        // user name not available
        } else {
            return "{" + user + "}";
        }
    }
    // custom dialog wrapper with more flexibility
    self.dialog = function dialog(options) {
        // create missing fields
        if (!options) {
            options = {};
        }
        if (!options.callbacks) {
            options.callbacks = {};
        }
        var obj = {
            // dialog function returns $-wrapped content, so call parent on it, hide by default, and unwrap
            dialog: window.dialog({
                title: options.title,
                // body must be wrapped in an outer tag (e.g. <div>content</div>)
                html: $(options.body).children()
            }).parent().css("display", "none").get(0),
            // cache callbacks for later
            callbacks: options.callbacks,
            // set to true if moved from default position
            moved: false,
            // reposition the dialog to the centre of the screen
            centre: function centre(force) {
                if (!this.moved || force) {
                	$(this.dialog).css("top", ($(window).height() - $(this.dialog).height()) / 2);
                	$(this.dialog).css("left", ($(window).width() - $(this.dialog).width()) / 2);
                }
                return this;
            },
            // replace the title of the dialog
            setTitle: function setTitle(title) {
                $(".ui-dialog-title", this.dialog).html(title);
                return this;
            },
            // replace the body of the dialog
            setBody: function setBody(body) {
                $(".ui-dialog-content", this.dialog).html($(body).children());
                return this;
            },
            // replace the bottom controls
            setControls: function setControls(controls) {
                /* controls = [
                    {text, callback},
                    ...
                ] */
                // remove existing buttons
                $(".ui-dialog-buttonset", this.dialog).html("");
                // add new buttons
                $.each(controls, function(index, item) {
                    var button = $("<button type='button' role='button' aria-disabled='false'>").addClass("ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
                    button.append("<span class='ui-button-text'>" + item.text + "</span>");
                    button.on("click", item.callback);
                    $(".ui-dialog-buttonset", this.dialog).append(button);
                });
                return this;
            },
            // show or hide the bottom controls
            showControls: function showControls(show) {
                var showing = $(".ui-dialog-buttonpane", this.dialog).css("visibility") === "visible";
                if (typeof show === "undefined") {
                    $(".ui-dialog-buttonpane", this.dialog).css("visibility", showing ? "hidden" : "visible")
                                                           .css("padding", showing ? "0" : "6px").css("height", showing ? "0" : "auto");
                } else if (show !== showing) {
                    $(".ui-dialog-buttonpane", this.dialog).css("visibility", show ? "visible" : "hidden")
                                                           .css("padding", show ? "6px" : "0").css("height", show ? "auto" : "0");
                } else {
                    // no change, return now
                    return this;
                }
                return this;
            },
            // shorthand to remove controls
            noControls: function noControls() {
                return this.setControls([]).showControls(false);
            },
            // show or hide the whole dialog, default to toggling
            show: function show(show) {
                if (typeof show === "undefined") {
                    $(this.dialog).css("display", $(this.dialog).css("display") === "none" ? "block" : "none");
                } else {
                	$(this.dialog).css("display", show ? "block" : "none");
                }
                return this;
            },
            // bring this window to the front
            focus: function focus() {
                $(this.dialog).detach();
                $(".ui-dialog").after($(this.dialog));
                $(".ui-dialog-title").removeClass("ui-dialog-title-active").addClass("ui-dialog-title-inactive");
                $(".ui-dialog-title", this.dialog).removeClass("ui-dialog-title-inactive").addClass("ui-dialog-title-active");
                return this;
            },
            // refresh the data in the dialog if a method is provided
            refresh: function refresh() {
                if (this.callbacks.refresh) {
                    var props = this.callbacks.refresh();
                    if (props.title) {
                        this.setTitle(props.title);
                    }
                    if (props.body) {
                        this.setBody(props.body);
                        this.centre();
                    }
                }
                return this;
            },
            // close the dialog
            close: function close(noCallback) {
                $(this.dialog).dialog().dialog("close");
                // run callback if defined and not suppressed
                if (!noCallback && this.callbacks.close) {
                    this.callbacks.close();
                }
                return this;
            }
        };
        // add callback to ok button
        if (obj.callbacks.ok) {
            $(".ui-dialog-buttonset button", obj.dialog).on("click", function(e) {
                obj.callbacks.ok();
            });
        }
        // add callback to close button
        if (obj.callbacks.close) {
            $(".ui-dialog-titlebar-button-close", obj.dialog).on("click", function(e) {
                obj.callbacks.close();
            });
        }
        // mark dialog as moved when dragging titlebar
        $(".ui-dialog-titlebar", obj.dialog).on("mousedown", function(e) {
            var pos = [e.pageX, e.pageY];
            $(".ui-dialog-titlebar", obj.dialog).on("mouseup", function(e) {
                // moved whilst the mouse was down
                if (pos[0] !== e.pageX || pos[1] !== e.pageY) {
                    obj.moved = true;
                    // stop monitoring now
                    $(".ui-dialog-titlebar", obj.dialog).off("mousedown");
                    $(".ui-dialog-titlebar", obj.dialog).off("mouseup");
                }
            });
        });
        // return the dialog
        return obj;
    };
    // sync all keys with the server
    self.syncKeys = function syncKeys() {
        // hide current key count for displayed portal
        $("#teamKeys").html("Refreshing team keys...");
        console.log("[Team Keys] Refreshing team keys...");
        $.ajax({
            url: self.server,
            method: "POST",
            data: {
                action: "sync",
                user: window.PLAYER.guid,
                team: self.config.team.team,
                keys: window.plugin.keys.keys
            },
            success: function(resp, status, obj) {
                console.log("[Team Keys] Response received.");
                var data = JSON.parse(resp);
                // if user is authenticated
                if (data.auth) {
                    self.keysByEntry = {};
                    self.keysByPortal = {};
                    self.keysByUser = {};
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
                        self.keysByEntry = data.keys;
                        for (var x in self.keysByEntry) {
                            var entry = self.keysByEntry[x];
                            // try to cache names
                            self.getPortalName(entry.portal);
                            self.getUserName(entry.user);
                            // if no byPortal entries for portal, start list
                            if (!self.keysByPortal[entry.portal]) {
                                self.keysByPortal[entry.portal] = [];
                            }
                            // append user once for each key
                            for (var i = 0; i < entry.count; i++) {
                                self.keysByPortal[entry.portal].push(entry.user);
                            }
                            // if no byUser entries for user, start list
                            if (!self.keysByUser[entry.user]) {
                                self.keysByUser[entry.user] = [];
                            }
                            // append portal once for each key
                            for (var i = 0; i < entry.count; i++) {
                                self.keysByUser[entry.user].push(entry.portal);
                            }
                        }
                    }
                    // re-show info on selected portal
                    self.addInfo();
                } else {
                    self.authFail();
                }
            },
            error: function(obj, status, err) {
                console.warn("[Team Keys] Failed to sync: " + status);
                setTimeout(function() {
                    self.syncKeys();
                }, 3000);
            }
        });
    };
    // cache known users and portals for later displaying
    self.syncCache = function syncCache() {
        console.log("[Team Keys] Refreshing cache...");
        var cache = [];
        // cache users
        for (var x in window.localStorage) {
            if (x.match(/^[0-9a-f]{32}\.c$/) && !self.cache[x]) {
                self.cache[x] = window.localStorage[x];
            }
        }
        // convert cache for sending (POSTing as an object throws header errors)
        for (var x in self.cache) {
            cache.push(x + "|" + self.cache[x]);
        }
        /* {
            guid: string,
            ...
        } */
        $.ajax({
            url: self.server,
            method: "POST",
            data: {
                action: "cache",
                cache: cache.join("\n")
            },
            success: function(resp, status, obj) {
                console.log("[Team Keys] Response received.");
                var data = JSON.parse(resp);
                // replace cache
                if (data.count) {
                    self.cache = data.cache;
                    window.localStorage["plugin-teamKeys-cache"] = JSON.stringify(data.cache);
                    setTimeout(function() {
                        self.syncCache();
                    }, 60000);
                }
            },
            error: function(obj, status, err) {
                console.warn("[Team Keys] Failed to sync cache: " + status);
                setTimeout(function() {
                    self.syncCache();
                }, 5000);
            }
        });
    };
    // show list of all portals with keys
    self.showByPortal = function showByPortal() {
        self.dialog({
            title: "Team Keys: all portals",
            callbacks: {
                refresh: function() {
                    var props = {
                        body: $("<div/>")
                    };
                    $.each(self.keysByPortal, function(portal, users) {
                        var portalName = self.getPortalName(portal);
                        var link = $("<a>" + portalName + "</a>");
                        link.on("click", function(e) {
                            self.keysForPortal(portal);
                        });
                        props.body.append(link);
                        if (users.length > 1) {
                            props.body.append("<span> (" + users.length + ")</span>");
                        }
                        props.body.append("<br/>");
                    });
                    return props;
                }
            }
        }).setControls([]).showControls().refresh().show();
    };
    // show list of all users with keys to a single portal
    self.keysForPortal = function keysForPortal(portal) {
        self.dialog({
            title: "Team Keys:" + trunc(self.getPortalName(portal), 20),
            callbacks: {
                refresh: function() {
                    var props = {
                        body: $("<div/>")
                    };
                    var keys = self.keysByPortal[portal];
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
                    for (var x in keysByUser) {
                        var link = $("<a>" + self.getUserName(x) + "</a>");
                        link.on("click", function(e) {
                            window.chat.addNickname("@" + self.getUserName(x));
                        });
                        props.body.append(link);
                        if (keysByUser[x] > 1) {
                            props.body.append("<span> (" + keysByUser[x] + ")</span>");
                        }
                        props.body.append("<br/>");
                    }
                    return props;
                }
            }
        }).setControls([]).showControls().refresh().show();
    };
    // show list of all users with keys
    self.showByUser = function showByUser() {
        self.dialog({
            title: "Team Keys: all members",
            callbacks: {
                refresh: function() {
                    var props = {
                        body: $("<div/>")
                    };
                    $.each(self.keysByUser, function(user, portals) {
                        var userName = self.getUserName(user);
                        var link = $("<a>" + userName + "</a>");
                        link.on("click", function(e) {
                            self.keysForUser(user);
                        });
                        props.body.append(link);
                        if (portals.length > 1) {
                            props.body.append("<span> (" + portals.length + ")</span>");
                        }
                        props.body.append("<br/>");
                    });
                    return props;
                }
            }
        }).setControls([]).showControls().refresh().show();
    };
    // show list of all portals with keys owned by a single user
    self.keysForUser = function keysForUser(user) {
        self.dialog({
            title: "Team Keys:" + trunc(self.getUserName(user), 20),
            callbacks: {
                refresh: function() {
                    var props = {
                        body: $("<div/>")
                    };
                    var keys = self.keysByUser[user];
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
                    for (var x in keysByPortal) {
                        props.body.append("<span>" + self.getPortalName(x) + "</span>");
                        if (keysByPortal[x] > 1) {
                            props.body.append("<span> (" + keysByPortal[x] + ")</span>");
                        }
                        props.body.append("<br/>");
                    }
                    return props;
                }
            }
        }).setControls([]).showControls().refresh().show();
    };
    // add info text under key controls
    self.addInfo = function addInfo() {
        $("#teamKeys").remove();
        if (self.keysByPortal[window.selectedPortal]) {
            var count = self.keysByPortal[window.selectedPortal].length;
            var div = $("<div id='teamKeys'></div>").html(count + " key" + (count > 1 ? "s" : "") + " total amongst your team (<a onclick='window.plugin.teamKeys.keysForPortal(window.selectedPortal);'>who</a>).");
            div.prop("style").textAlign = "center";
            div.prop("style").fontSize = "smaller";
            $("#portaldetails > .mods").before(div);
        }
    };
    // about window for help and information
    self.showAbout = function showAbout() {
        var body = $("<div/>");
        body.append("<strong><a href=\"http://github.com/OllieTerrance/IITCTeamKeys\">Team Keys</a></strong>");
        body.append("<span> by </span><a href=\"http://terrance.uk.to\">Ollie Terrance</a><br/><br/>");
        body.append("<span>Having issues?  Try logging out of your team and back in again.  You can also </span>");
        var link = $("<a>purge all plugin data</a>");
        link.on("click", function(e) {
            self.purgeConfig();
        });
        body.append(link);
        body.append("<span> from the browser.  This will not affect your keys, as they are stored independently to this plugin.</span>");
        self.dialog({
            title: "Team Keys: about",
            body: body
        }).show();
    };
    // mods only: moderator window for managing team
    self.showMod = function showMod() {
        if (self.config.team.role === 1) {
            var modDialog = dialog({
                title: "Team Keys: team moderation",
                html: "Loading team members..."
            });
            // hide OK button
            var dialogButtons = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix", modDialog.parent());
            dialogButtons.prop("style").display = "none";
            console.log("[Team Keys] Refreshing team members...");
            $.ajax({
                url: self.server,
                method: "POST",
                data: {
                    action: "members",
                    user: window.PLAYER.guid,
                    team: self.config.team.team
                },
                success: function(resp, status, obj) {
                    console.log("[Team Keys] Response received.");
                    var data = JSON.parse(resp);
                    // if user is authenticated
                    if (data.auth) {
                        // fetch player names
                        var members = [];
                        $.each(data.members, function(index, item) {
                            members.push(self.getUserName(item));
                        });
                        var mods = [];
                        $.each(data.mods, function(index, item) {
                            if (item !== window.PLAYER.guid) {
                                mods.push(self.getUserName(item));
                            }
                        });
                        var oldHeight = modDialog.height();
                        modDialog.html("<strong>Team: " + self.config.team.team + "</strong><br/><br/>Enter the usernames of people you wish to add to the team, one per line.<br/><br/>Note: you don't need to include yourself in the moderator list.  You also cannot remove yourself from the moderators list; you must first assign another moderator and ask them to remove you.<br/><br/>");
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
                            self.setMod(membersField.val(), modsField.val(), modDialog);
                        });
                        // re-position dialog to centre
                        $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix .ui-dialog-buttonset", modDialog.parent()).append(okButton);
                        dialogButtons.prop("style").display = "block";
                        modDialog.parent().prop("style").top = parseInt(modDialog.parent().prop("style").top) - ((modDialog.height() - oldHeight) / 2) + "px";
                    } else {
                        self.authFail(modDialog);
                    }
                },
                error: function(obj, status, err) {
                    console.warn("[Team Keys] Failed to sync: " + status);
                    setTimeout(function() {
                        self.syncKeys();
                    }, 5000);
                }
            });
        }
    };
    // mods only: update the list of members in the team
    self.setMod = function setMod(members, mods, modDialog) {
        var data = {
            action: "members",
            user: window.PLAYER.guid,
            team: self.config.team.team,
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
            url: self.server,
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
                    self.authFail(modDialog);
                }
            },
            error: function(obj, status, err) {
                console.warn("[Team Keys] Failed to set mods: " + status);
                modDialog.html("Failed to update team members.  Retrying in 3 seconds...");
                setTimeout(function() {
                    self.setMod(members, mods, modDialog);
                }, 3000);
            }
        });
    };
    // list of teams available to the user
    self.selectTeam = function selectTeam(teamDialog) {
        if (teamDialog) {
            teamDialog.html("Loading available teams...");
        } else {
            teamDialog = dialog({
                title: "Team Keys: select team",
                html: "Loading available teams..."
            });
        }
        // hide OK button
        var dialogButtons = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix", teamDialog.parent());
        dialogButtons.prop("style").display = "none";
        console.log("[Team Keys] Refreshing available teams...");
        $.ajax({
            url: self.server,
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
                        self.selectTeam(teamDialog);
                    });
                    teamDialog.append(link);
                    teamDialog.append(").  Select one below to start collaborating keys.<br/><br/>");
                    $.each(data.teams, function(index, item) {
                        var link = $("<a>" + item.team + " (" + ["member", "moderator"][item.role] + ")</a>");
                        link.on("click", function(e) {
                            self.checkTeam(item, teamDialog);
                        });
                        teamDialog.append(link);
                        teamDialog.append("<br/>");
                    });
                // user is not registered to any teams
                } else {
                    teamDialog.html("You don't appear to be a member of any teams at the moment (");
                    var link = $("<a>refresh</a>");
                    link.on("click", function(e) {
                        self.selectTeam(teamDialog);
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
                    self.selectTeam(teamDialog);
                }, 3000);
            }
        });
    };
    // check permissions on a team, and join it
    self.checkTeam = function checkTeam(team, teamDialog) {
        // recycle dialog
        if (teamDialog) {
            teamDialog.html("Checking permissions...");
            var dialogButtons = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix", teamDialog.parent());
        }
        console.log("[Team Keys] Refreshing available teams...");
        $.ajax({
            url: self.server,
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
                    self.config.team = team;
                    self.saveConfig();
                    self.init();
                    self.syncKeys();
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
                            self.selectTeam(teamDialog);
                        });
                        teamDialog.append(link);
                        teamDialog.append(".");
                    } else {
                        // remove key if already exists
                        delete window.localStorage["plugin-teamKeys-team"];
                        self.selectTeam();
                    }
                }
            },
            error: function(obj, status, err) {
                console.warn("[Team Keys] Failed to check team: " + status);
                teamDialog.html("Failed to check your team membership.  Retrying in 3 seconds...");
                setTimeout(function() {
                    self.checkTeam(team, teamDialog);
                }, 3000);
            }
        });
    };
    // lost permissions whilst logged in
    self.authFail = function authFail(authDialog) {
        // recycle dialog
        if (authDialog) {
            authDialog.html("Your team membership doesn't seem to be valid.  Click OK to refresh and login again.");
            var dialogButtons = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix", authDialog.parent());
            dialogButtons.prop("style").display = "block";
        } else {
            authDialog = dialog({
                title: "Team Keys: authentication",
                html: "Your team membership doesn't seem to be valid.  Click OK to refresh and login again."
            });
        }
        // replace OK button
        var oldButton = $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix button", authDialog.parent());
        var okButton = oldButton.clone();
        oldButton.remove();
        okButton.on("click", function(e) {
            self.logout();
        });
        $(".ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix .ui-dialog-buttonset", authDialog.parent()).append(okButton);
    };
    // save user options to local storage
    self.saveConfig = function saveConfig() {
        window.localStorage["plugin-teamKeys-config"] = JSON.stringify(self.config);
    };
    // remove any local storage data for the plugin and reload
    self.purgeConfig = function saveConfig() {
        var toDelete = [];
        // don't modify original array whilst in loop, just make a note of keys
        for (var x in window.localStorage) {
            if (x.indexOf("plugin-teamKeys-") === 0) {
                toDelete.push(x);
            }
        }
        // remove all found keys
        for (var x in toDelete) {
            delete window.localStorage[toDelete[x]];
        }
        window.location.reload();
    };
    // clear team key and refresh
    self.logout = function logout() {
        self.config.team = null;
        self.saveConfig();
        window.location.reload();
    };
    // initial setup hook
    self.setup = function setup() {
        // fake local storage if not provided by browser
        if (!window.localStorage) {
            window.localStorage = {};
        }
        // read user options from local storage if available
        if (window.localStorage["plugin-teamKeys-config"]) {
            self.config = JSON.parse(window.localStorage["plugin-teamKeys-config"]);
        } else {
            self.config = {
                team: null
            };
            self.saveConfig();
        }
        // if an existing portal cache, load it
        if (window.localStorage["plugin-teamKeys-cache"]) {
            self.cache = JSON.parse(window.localStorage["plugin-teamKeys-cache"]);
        // make a new cache
        } else {
            window.localStorage["plugin-teamKeys-cache"] = "{}";
        }
        // if a team is set in options
        if (self.config.team) {
            // check permissions on team before logging in
            self.checkTeam(self.config.team);
        // never logged in
        } else {
            // show team selector
            self.selectTeam();
        }
        // delete self to ensure setup can't be run again
        delete self.setup;
    };
    // initialize events and toolbox
    self.init = function init() {
        // resync when the map moves, or when key numbers change
        $.each(["mapDataRefreshEnd", "pluginKeysUpdateKey", "pluginKeysRefreshAll"], function(index, item) {
            window.addHook(item, function() {
                self.syncKeys();
            });
        });
        // show current cached status, but still refresh
        window.addHook("portalDetailsUpdated", function() {
            self.addInfo();
            self.syncKeys();
        });
        // start syncing keys and cache
        self.syncKeys();
        self.syncCache();
        // add controls to toolbox
        var block = $("<a style='text-decoration: none;'></a>");
        var links = [];
        links.push("<a onclick=\"window.plugin.teamKeys.showAbout();\" title=\"Display the about window.\">Team Keys</a>");
        links.push("<a onclick=\"window.plugin.teamKeys.showByPortal();\" title=\"Display a list of portals, and all known keys held by team members.\">portals</a>");
        links.push("<a onclick=\"window.plugin.teamKeys.showByUser();\" title=\"Display a list of team members, and all their keys.\">users</a>");
        // show moderator link
        if (self.config.team.role === 1) {
            links.push("<a onclick=\"window.plugin.teamKeys.showMod();\" title=\"Display the moderation window, to manage members of the team.\">mod</a>");
        }
        links.push("<a onclick=\"window.plugin.teamKeys.logout();\" title=\"Logout from your current team, in case you want to switch to another.\">logout</a>");
        block.append(links.join(" | "));
        $("#toolbox").append(block);
        // delete self to ensure init can't be run again
        delete self.init;
    }
    // IITC plugin setup
    if (window.iitcLoaded && typeof self.setup === "function") {
        self.setup();
    } else if (window.bootPlugins) {
        window.bootPlugins.push(self.setup);
    } else {
        window.bootPlugins = [self.setup];
    }
}
// inject plugin into page
var script = document.createElement("script");
script.appendChild(document.createTextNode("(" + wrapper + ")();"));
(document.body || document.head || document.documentElement).appendChild(script);
