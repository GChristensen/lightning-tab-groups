set windows-shell := ["sh", "-cu"]

python := if os_family() == "windows" { "python" } else { "python3" }

test:
    cd addon; cmd //c start web-ext run -p "$FIREFOX_PROFILES/debug" --keep-profile-changes

test-nightly:
    cd addon; cmd //c start web-ext run -p "$FIREFOX_PROFILES/debug.nightly" --firefox=nightly --keep-profile-changes

set-version version:
    echo {{version}} > ./addon/version.txt

get-version:
    @cat ./addon/version.txt

sign: firefox-mv2
    cd addon; web-ext sign --channel unlisted -a ../build -i .web-extension-id _metadata version.txt `cat $HOME/.amo/creds`

build: && firefox-mv2
    cd addon; {{python}} ../scripts/mkmanifest.py manifest.json.mv2 manifest.json `cat version.txt` --public
    cd addon; web-ext build -a ../build -i web-ext-artifacts .web-extension-id *.mv2* *.mv3* version.txt

firefox-mv2:
    cd addon; {{python}} ../scripts/mkmanifest.py manifest.json.mv2 manifest.json `cat version.txt`

firefox-mv3:
    cd addon; {{python}} ../scripts/mkmanifest.py manifest.json.mv3 manifest.json `cat version.txt`

landing:
    cd landing; npm run build