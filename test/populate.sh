#!/bin/bash

echo \
"This script will populate the local mongodb instance with DISTRO test data.
---------------------------------------------------------------------------"
read -p "Database [Distro]: " database;
read -p "ALL EXISTING DATA IN THE FOLLOWING COLLECTIONS WILL BE ERASED:

	networks, networkRequests, sessions, tracks, users

ARE YOU SURE YOU WANT TO DO THIS? [yN]: " proceed;
[[ $proceed != [yY] ]] && exit;

mongoimport -d "${database:-Distro}" -c "networks" --drop <<'EOF'
{ "_id" : { "$oid" : "000000000000000000000000" }, "name" : "network_1" }
{ "_id" : { "$oid" : "000000000000000000000001" }, "name" : "bklyn", "fullName" : "BKLYN Lounge" }
EOF

mongoimport -d "${database:-Distro}" -c "networkRequests" --drop <<'EOF'
EOF

mongoimport -d "${database:-Distro}" -c "sessions" --drop <<'EOF'
EOF

mongoimport -d "${database:-Distro}" -c "tracks" --drop <<'EOF'
{ "_id" : { "$oid" : "4d22380a704f8f211756ca31" }, "name" : "Released before subscription (FAIL)", "release" : { "$date" : 1259625600000 }, "onDeck" : [], "network" : { "$oid" : "000000000000000000000000" } }
{ "_id" : { "$oid" : "4d22380a704f8f211756ca32" }, "name" : "On deck (PASS)", "release" : { "$date" : 1259625600000 }, "onDeck" : [ { "start" : { "$date" : 1259625600000 } } ], "network" : { "$oid" : "000000000000000000000000" } }
{ "_id" : { "$oid" : "4d22380a704f8f211756ca33" }, "name" : "On deck in the past (FAIL)", "release" : { "$date" : 1259625600000 }, "onDeck" : [ { "start" : { "$date" : 1259625600000 }, "end" : { "$date" : 1259971200000 } } ], "network" : { "$oid" : "000000000000000000000000" } }
{ "_id" : { "$oid" : "4d22380a704f8f211756ca34" }, "name" : "Released in the future (FAIL)", "release" : { "$date" : 32532537600000 }, "onDeck" : [], "network" : { "$oid" : "000000000000000000000000" } }
{ "_id" : { "$oid" : "4d22380a704f8f211756ca35" }, "name" : "Released during first subscription (PASS)", "release" : { "$date" : 1264982400000 }, "onDeck" : [], "network" : { "$oid" : "000000000000000000000000" } }
{ "_id" : { "$oid" : "4d22380a704f8f211756ca36" }, "name" : "Released between subscriptions (FAIL)", "release" : { "$date" : 1277942400000 }, "onDeck" : [], "network" : { "$oid" : "000000000000000000000000" } }
{ "_id" : { "$oid" : "4d22380a704f8f211756ca37" }, "name" : "Released during second subscription (PASS)", "release" : { "$date" : 1285891200000 }, "onDeck" : [], "network" : { "$oid" : "000000000000000000000000" } }
EOF

mongoimport -d "${database:-Distro}" -c "users" --drop <<'EOF'
{ "_id" : { "$oid" : "4d0b831f9f5bfc2687000001" }, "email" : "test@distro.fm", "hash" : "b379af0f1e4242ab55967a8d61a2c1c63eb61aab", "salt" : "197d0806", "subscriptions" : [ { "network" : { "$oid" : "000000000000000000000000" }, "start" : { "$date" : 1260316800000 }, "end" : { "$date" : 1276041600000 } }, { "network" : { "$oid" : "000000000000000000000000" }, "start" : { "$date" : 1278633600000 }, "end" : { "$date" : 1310169600000 } } ] }
EOF
