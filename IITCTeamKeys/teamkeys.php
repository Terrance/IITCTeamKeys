<?php
// connect to database
require_once getenv("PHPLIB") . "keystore.php";
$conn = mysqli_connect(keystore("mysql", "db"), keystore("mysql", "user"), keystore("mysql", "pass"));
mysqli_select_db($conn, "terrance_labs");
header('Access-Control-Allow-Origin: https://www.ingress.com');
// only accept requests directly from the Intel page
if ($_SERVER["HTTP_REFERER"] === "https://www.ingress.com/intel") {
    switch ($_POST["action"]) {
        // download an entire list of keys (optionally submit a new set of keys to upload)
        case "sync":
            // check auth
            if ($_POST["user"] && $_POST["team"]) {
                $user = $_POST["user"];
                $team = $_POST["team"];
                if (mysqli_num_rows(mysqli_query($conn, 'SELECT `id` FROM `teamkeys__teams` WHERE `user` = "' . mysqli_real_escape_string($conn, $user) .
                                                        '" AND `team` = "' . mysqli_real_escape_string($conn, $team) . '";')) === 1) {
                    // submitted new keys to upload
                    if (isset($_POST["keys"])) {
                        // remove existing keys
                        mysqli_query($conn, 'DELETE FROM `teamkeys__keys` WHERE `user` = "' . mysqli_real_escape_string($conn, $user) .
                                            '" AND `team` = "' . mysqli_real_escape_string($conn, $team) . '";');
                        // add new keys
                        foreach ($_POST["keys"] as $portal => $count) {
                            mysqli_query($conn, 'INSERT INTO `teamkeys__keys` (`user`, `team`, `portal`, `count`) VALUES ("' . mysqli_real_escape_string($conn, $user) . '", "' .
                                                mysqli_real_escape_string($conn, $team) . '", "' . mysqli_real_escape_string($conn, $portal) . '", ' . mysqli_real_escape_string($conn, $count) . ');');
                        }
                    }
                    // fetch all team keys
                    $result = mysqli_query($conn, 'SELECT * FROM `teamkeys__keys` WHERE `team` = "' . mysqli_real_escape_string($conn, $team) . '";');
                    $count = mysqli_num_rows($result);
                    $out = '{"auth": true, "count": ' . $count;
                    if ($count) {
                        $out .= ', "keys": [';
                        $i = 0;
                        while ($i < $count) {
                            $row = mysqli_fetch_assoc($result);
                            $out .= '{"user": "' . $row["user"] . '", "portal": "' . $row["portal"] . '", "count": ' . $row["count"] . '}';
                            $i++;
                            if ($i < $count) {
                                $out .= ', ';
                            }
                        }
                        $out .= ']';
                    }
                    $out .= '}';
                    /* {
                        auth,
                        count,
                        keys: [
                            {user, portal, count},
                            ...
                        ]
                    } */
                    print($out);
                    mysqli_free_result($result);
                } else {
                    print('{"auth": false}');
                }
            } else {
                print('{"auth": false}');
            }
            break;
        // upload a cache of portals and users, add to team's global cache
        case "cache":
            // if a new cache is included
            if ($_POST["cache"]) {
                $cache = explode("\n", $_POST["cache"]);
                /* [
                    key|value,
                    ...
                ] */
                foreach ($cache as $i => $str) {
                    list($key, $value) = explode("|", $str);
                    // if not in cache already, or different value, add/update it
                    $result = mysqli_query($conn, 'SELECT `value` FROM `teamkeys__cache` WHERE `key` = "' . mysqli_real_escape_string($conn, $key) . '";');
                    if (mysqli_num_rows($result) === 0) {
                        print("New: " . $key . "\n");
                        mysqli_query($conn, 'INSERT INTO `teamkeys__cache` (`key`, `value`) VALUES ("' . mysqli_real_escape_string($conn, $key) . '", "' .
                                            mysqli_real_escape_string($conn, $value) . '");');
                    } else {
                        $row = mysqli_fetch_assoc($result);
                        if ($value !== $row["value"]) {
                            print("Update: " . $key . "\n");
                            mysqli_query($conn, 'UPDATE `teamkeys__cache` SET `value` = "' . mysqli_real_escape_string($conn, $value) .
                                                '" WHERE `key` = "' . mysqli_real_escape_string($conn, $key) . '";');
                        }
                    }
                }
                // return new cache
                $result = mysqli_query($conn, 'SELECT * FROM `teamkeys__cache`;');
                $count = mysqli_num_rows($result);
                $out = '{"count": ' . $count;
                if ($count) {
                    $out .= ', "cache": {';
                    $i = 0;
                    while ($i < $count) {
                        $row = mysqli_fetch_assoc($result);
                        $out .= '"' . $row["key"] . '": "' . addcslashes($row["value"], '"\\/') . '"';
                        $i++;
                        if ($i < $count) {
                            $out .= ', ';
                        }
                    }
                    $out .= '}';
                }
                $out .= '}';
                /* {
                    count,
                    cache: {
                        key: value,
                        ...
                    }
                } */
                print($out);
                mysqli_free_result($result);
            } else {
                print('{"auth": false}');
            }
            break;
        // return a list of available teams to join
        case "teams":
            // check auth
            if ($_POST["user"]) {
                $user = $_POST["user"];
                // fetch all teams
                $result = mysqli_query($conn, 'SELECT * FROM `teamkeys__teams` WHERE `user` = "' . mysqli_real_escape_string($conn, $user) . '";');
                $count = mysqli_num_rows($result);
                $out = '{"auth": true, "count": ' . $count;
                if ($count) {
                    $out .= ', "teams": [';
                    $i = 0;
                    while ($i < $count) {
                        $row = mysqli_fetch_assoc($result);
                        $out .= '{"team": "' . $row["team"] . '", "role": ' . $row["role"] . '}';
                        $i++;
                        if ($i < $count) {
                            $out .= ', ';
                        }
                    }
                    $out .= ']';
                }
                $out .= '}';
                /* {
                    count,
                    teams: [
                        {team, role},
                        ...
                    ]
                } */
                print($out);
                mysqli_free_result($result);
            } else {
                print('{"auth": false}');
            }
            break;
        // mods only: fetch a list of all members of the team (optionally submit a new list)
        case "members":
            // check auth
            if ($_POST["user"] && $_POST["team"]) {
                $user = $_POST["user"];
                $team = $_POST["team"];
                // requires `role` = 1 (i.e. a moderator)
                if (mysqli_num_rows(mysqli_query($conn, 'SELECT `id` FROM `teamkeys__teams` WHERE `user` = "' . mysqli_real_escape_string($conn, $user) .
                                                        '" AND `team` = "' . mysqli_real_escape_string($conn, $team) . '" AND `role` = 1;')) === 1) {
                    // submitted new list of members
                    if (isset($_POST["members"]) || isset($_POST["mods"])) {
                        // remove existing members, except self (cannot be changed)
                        mysqli_query($conn, 'DELETE FROM `teamkeys__teams` WHERE `team` = "' . mysqli_real_escape_string($conn, $team) .
                                            '" AND `user` <> "' . mysqli_real_escape_string($conn, $user) . '";');
                        // if a list of members
                        if ($_POST["members"]) {
                            // add all members (`role` = 0)
                            foreach ($_POST["members"] as $i => $member) {
                                mysqli_query($conn, 'INSERT INTO `teamkeys__teams` (`user`, `team`, `role`) VALUES ("' . mysqli_real_escape_string($conn, $member) .
                                                    '", "' . mysqli_real_escape_string($conn, $team) . '", 0);');
                            }
                        }
                        // if a list of mods
                        if ($_POST["mods"]) {
                            // add all mods (`role` = 1)
                            foreach ($_POST["mods"] as $i => $mod) {
                                mysqli_query($conn, 'INSERT INTO `teamkeys__teams` (`user`, `team`, `role`) VALUES ("' . mysqli_real_escape_string($conn, $mod) .
                                                    '", "' . mysqli_real_escape_string($conn, $team) . '", 1);');
                            }
                        }
                    }
                    // fetch all members
                    $result = mysqli_query($conn, 'SELECT * FROM `teamkeys__teams` WHERE `team` = "' . mysqli_real_escape_string($conn, $team) . '";');
                    $count = mysqli_num_rows($result);
                    $members = array();
                    $mods = array();
                    $i = 0;
                    // loop through members, assign to role list
                    while ($i < $count) {
                        $row = mysqli_fetch_assoc($result);
                        switch ($row["role"]) {
                            case 0:
                                $members[] = $row["user"];
                                break;
                            case 1:
                                $mods[] = $row["user"];
                                break;
                        }
                        $i++;
                    }
                    $out = '{"auth": true, "count": ' . $count;
                    if ($count) {
                        $out .= ', "members": [';
                        foreach ($members as $i => $user) {
                            $out .= '"' . $user . '"';
                            if ($i + 1 < count($members)) {
                                $out .= ', ';
                            }
                        }
                        $out .= '], "mods": [';
                        foreach ($mods as $i => $user) {
                            $out .= '"' . $user . '"';
                            if ($i + 1 < count($mods)) {
                                $out .= ', ';
                            }
                        }
                        $out .= ']';
                    }
                    $out .= '}';
                    /* {
                        auth,
                        count,
                        members: [user, ...],
                        mods: [user, ...]
                    } */
                    print($out);
                    mysqli_free_result($result);
                } else {
                    print('{"auth": false}');
                }
            } else {
                print('{"auth": false}');
            }
            break;
    }
// redirect to Intel page if request does not originate from there
} else {
    header("Location: https://www.ingress.com/intel");
}
mysqli_close($conn);

