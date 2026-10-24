// Applique les réglages natifs de Wild Kart après « npx cap add android / ios ». Sans risque si lancé plusieurs fois.
const fs = require('fs'), path = require('path');
const ok = (m) => console.log('  ✓ ' + m), skip = (m) => console.log('  - ' + m);
function edit(file, fn, label) { if (!fs.existsSync(file)) return skip(label + ' : fichier absent (plateforme pas encore ajoutée)'); const a = fs.readFileSync(file, 'utf8'), b = fn(a); if (a !== b) { fs.writeFileSync(file, b); ok(label); } else skip(label + ' : déjà fait'); }
// ----- Android -----
const man = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
edit(man, (s) => {
  if (!s.includes('android.permission.VIBRATE')) s = s.replace('<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.VIBRATE" />');
  if (!s.includes('screenOrientation')) s = s.replace(/<activity\b/, '<activity\n            android:screenOrientation="sensorLandscape"');
  return s;
}, 'Android : paysage + vibration');
function findMain(dir) { if (!fs.existsSync(dir)) return null; for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) { const r = findMain(p); if (r) return r; } else if (f === 'MainActivity.java') return p; } return null; }
const mainAct = findMain(path.join('android', 'app', 'src', 'main', 'java'));
if (mainAct) edit(mainAct, (s) => {
  if (s.includes('FLAG_KEEP_SCREEN_ON')) return s;
  const pkg = (s.match(/^package\s+[\w.]+;/m) || ['package fr.wildkart.jeu;'])[0];
  return pkg + `

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        pleinEcran();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) pleinEcran();
    }

    private void pleinEcran() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
`;
}, 'Android : plein écran + écran toujours allumé');
else skip('Android : MainActivity introuvable (plateforme pas encore ajoutée)');
const gradle = path.join('android', 'app', 'build.gradle');
edit(gradle, (s) => s.includes('androidx.core:core:') ? s : s.replace('implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"', 'implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"\n    implementation "androidx.core:core:$androidxCoreVersion"'), 'Android : dépendance androidx.core');
// ----- iPhone -----
const plist = path.join('ios', 'App', 'App', 'Info.plist');
edit(plist, (s) => {
  const land = '<array>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>';
  s = s.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*)<array>[\s\S]*?<\/array>/, '$1' + land);
  s = s.replace(/(<key>UISupportedInterfaceOrientations~ipad<\/key>\s*)<array>[\s\S]*?<\/array>/, '$1' + land);
  const add = (k, v) => { if (!s.includes('<key>' + k + '</key>')) s = s.replace(/<\/dict>\s*<\/plist>\s*$/, '\t<key>' + k + '</key>\n\t' + v + '\n</dict>\n</plist>\n'); };
  add('UIStatusBarHidden', '<true/>'); add('UIRequiresFullScreen', '<true/>'); add('ITSAppUsesNonExemptEncryption', '<false/>');
  s = s.replace(/(<key>UIViewControllerBasedStatusBarAppearance<\/key>\s*)<true\/>/, '$1<false/>');
  return s;
}, 'iPhone : paysage + plein écran');
const appDel = path.join('ios', 'App', 'App', 'AppDelegate.swift');
edit(appDel, (s) => s.includes('isIdleTimerDisabled') ? s : s.replace(/(didFinishLaunchingWithOptions[^{]*\{)/, '$1\n        UIApplication.shared.isIdleTimerDisabled = true'), 'iPhone : écran toujours allumé');
console.log('Réglages natifs appliqués.');
