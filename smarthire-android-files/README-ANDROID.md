# Add SmartHire to your Android Studio project (WebView)

1. Open your project in Android Studio (Project view -> "Android").
2. **Assets folder**: right-click `app` -> New -> Folder -> Assets Folder -> Finish.
   Copy `smarthire.html` (and `courses-frontend.js`, `courses-seed.json` if you want them) into `app/src/main/assets/`.
3. **Dependency**: in `app/build.gradle(.kts)` inside `dependencies { }` add
   - Kotlin DSL (.kts):  implementation("androidx.webkit:webkit:1.12.1")
   - Groovy (.gradle):   implementation 'androidx.webkit:webkit:1.12.1'
   then click **Sync Now**.
4. **Layout**: replace `res/layout/activity_main.xml` with the file in this zip.
5. **MainActivity.kt**: replace its contents with the file in this zip and change the first line (`package ...`) back to YOUR package name.
6. **Manifest**: add `<uses-permission android:name="android.permission.INTERNET" />` above `<application>`.
7. Run on an emulator or phone (Run ▶).

Backend (courses-backend.js) CANNOT run inside the app. Run it on a PC/server:
 - Emulator reaches your PC at http://10.0.2.2:3000 (needs usesCleartextTraffic while testing)
 - A real phone needs the server hosted online with https.
