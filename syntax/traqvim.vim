syntax match VtraQStatus "^\s*\S\+ @.\+ \d\+\/\d\+\/\d\+ \d\+:\d\+\:\d\+" contains=VtraQUserName,VtraQScreenName,VtraQTime
syntax match VtraQUserName "@[a-zA-Z0-9]\+" contained
syntax match VtraQScreenName "^\s*\S\+" contained
syntax match VtraQTime "\d\+\/\d\+\/\d\+ \d\+:\d\+\:\d\+" contained
syntax region VtraQQuote start="^>$" end="^<$" concealends
