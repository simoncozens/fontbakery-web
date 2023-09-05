#!/bin/sh
rm -rf docs/fbwebapi*whl

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
echo

echo "Updating webworker"
perl -pi -e "s/const FBWEBAPIVERSION = .*/const FBWEBAPIVERSION = '$FBWEBAPI_VERSION'/" docs/fb-webworker.js



