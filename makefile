set-version:
	echo $(filter-out $@,$(MAKECMDGOALS)) > ./addon/version.txt

get-version:
	@cat ./addon/version.txt

test:
	cd addon; start web-ext run -p "${FIREFOX_PROFILES}/debug.ishell" --keep-profile-changes

test-nightly:
	cd addon; start web-ext run -p "${FIREFOX_PROFILES}/debug.nightly" --firefox=nightly --keep-profile-changes

build:
	cd addon; python ../scripts/mkmanifest.py manifest.json.mv2 manifest.json `cat version.txt` --public
	cd addon; web-ext build -a ../build -i .web-extension-id

sign:
	make firefox-mv2
	cd addon; web-ext sign -a ../build -i .web-extension-id _metadata version.txt `cat $(HOME)/.amo/creds`

firefox-mv2:
	cd addon; python ../scripts/mkmanifest.py manifest.json.mv2 manifest.json `cat version.txt`

firefox-mv3:
	cd addon; python ../scripts/mkmanifest.py manifest.json.mv3 manifest.json `cat version.txt`

%:
	@: