#!/bin/sh
rm -rf docs/*whl

echo "Fetching fontbakery"
git submodule init python/fontbakery
git submodule update python/fontbakery

echo "Building fontbakery"
cd python/fontbakery && python3 -m build && cd ../.. && cp python/fontbakery/dist/*whl docs/
FONTBAKERY_VERSION=`ls docs/fontbakery*whl | sed 's/docs\///'`
if [ "$FONTBAKERY_VERSION" = "" ]
then
	echo "Could not find fontbakery wheel!"
	exit 1
fi

echo "Building fbwebapi"
cd python/fbwebapi && python3 -m build && cd ../.. && cp python/fbwebapi/dist/*whl docs/
FBWEBAPI_VERSION=`ls docs/fbwebapi*whl | sed 's/docs\///'`
if [ "$FBWEBAPI_VERSION" = "" ]
then
	echo "Could not find fbwebapi wheel!"
	exit 1
fi

echo "New wheels:"
echo "$FBWEBAPI_VERSION"
echo "$FONTBAKERY_VERSION"
echo

echo "Updating webworker"

perl -pi -e "s/const FBVERSION = .*/const FBVERSION = '$FONTBAKERY_VERSION'/" docs/fb-webworker.js
perl -pi -e "s/const FBWEBAPIVERSION = .*/const FBWEBAPIVERSION = '$FBWEBAPI_VERSION'/" docs/fb-webworker.js



