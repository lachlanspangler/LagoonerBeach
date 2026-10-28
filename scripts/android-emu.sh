#!/bin/sh
# Build the debug APK, boot (or reuse) the lagooner_p6 emulator headless, install, launch, screenshot.
# Needs the Android command-line SDK at $ANDROID_HOME (default ~/Library/Android/sdk) and JDK 21.
set -e
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 21)}"
# our own emulator on our own console port: the laptop is shared, never reuse or touch another
# project's device (stop it afterwards with `adb -s emulator-5594 emu kill`)
SERIAL=emulator-5594
ADB="$ANDROID_HOME/platform-tools/adb -s $SERIAL"
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
npx cap sync android
(cd android && ./gradlew assembleDebug -q)
if ! "$ANDROID_HOME/platform-tools/adb" devices | grep -q "^$SERIAL"; then
  "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" list avd | grep -q lagooner_p6 || \
    echo no | "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd -n lagooner_p6 \
      -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_6
  nohup "$ANDROID_HOME/emulator/emulator" -avd lagooner_p6 -no-window -no-audio -no-boot-anim \
    -gpu swiftshader_indirect -no-snapshot -port 5594 >/tmp/lagooner-emu.log 2>&1 &
  $ADB wait-for-device
  until [ "$($ADB shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 2; done
fi
$ADB install -r android/app/build/outputs/apk/debug/app-debug.apk >/dev/null
$ADB shell am start -n com.example.atoll/.MainActivity >/dev/null
sleep 6
mkdir -p artifacts/shots
$ADB exec-out screencap -p > artifacts/shots/android-emu.png
echo "screenshot: artifacts/shots/android-emu.png"
