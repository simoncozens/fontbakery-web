#!/bin/sh
rm -rf web/*whl

echo "Fetching fontbakery"
git submodule init python/fontbakery
git submodule update python/fontbakery

echo "Building fontbakery"
cd python/fontbakery && python3 -m build && cd ../.. && cp python/fontbakery/dist/*whl web/
FONTBAKERY_VERSION=`ls web/fontbakery*whl | sed 's/web\///'`
if [ "$FONTBAKERY_VERSION" = "" ]
then
	echo "Could not find fontbakery wheel!"
	exit 1
fi

echo "Building fbwebapi"
cd python/fbwebapi && python3 -m build && cd ../.. && cp python/fbwebapi/dist/*whl web/
FBWEBAPI_VERSION=`ls web/fbwebapi*whl | sed 's/web\///'`
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

perl -pi -e "s/const FBVERSION = .*/const FBVERSION = '$FONTBAKERY_VERSION'/" web/fb-webworker.js
perl -pi -e "s/const FBWEBAPIVERSION = .*/const FBWEBAPIVERSION = '$FBWEBAPI_VERSION'/" web/fb-webworker.js



