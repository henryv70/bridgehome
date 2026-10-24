import { useCallback, useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, Share, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewNavigation, type WebViewProps } from 'react-native-webview';

// The package's class typing collapses its props to `never` under TypeScript 6; this alias restores them.
type WebViewHandle = { goBack(): void; reload(): void };
const WebView = RNWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

// The BridgeHome web app runs on the same computer as Expo (npm run dev, port 5173).
// Its dev server proxies SpacetimeDB, so this one address is all the phone needs.
function webUrl() {
  if (process.env.EXPO_PUBLIC_WEB_URL) return process.env.EXPO_PUBLIC_WEB_URL.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:5173`;
}

const COLORS = {
  light: { bg: '#fcfcfb', text: '#141413', muted: '#6b6b66', button: '#141413', buttonText: '#fcfcfb' },
  dark: { bg: '#141413', text: '#f0efec', muted: '#a3a29b', button: '#f0efec', buttonText: '#141413' },
};

function BridgeHome() {
  const url = webUrl();
  const web = useRef<WebViewHandle>(null);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = COLORS[scheme];
  const [canGoBack, setCanGoBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Android back button walks back through the web app's history first.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) { web.current?.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const onMessage = useCallback(async (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'share') await Share.share({ title: msg.title, message: `${msg.title}\n${msg.url}`, url: msg.url });
    } catch { /* ignore malformed messages */ }
  }, []);

  // Keep BridgeHome inside the app; open anything else in the system browser.
  const onShouldStart = useCallback((req: WebViewNavigation) => {
    if (req.url.startsWith(url) || req.url.startsWith('about:') || req.url.startsWith('blob:') || req.url.startsWith('data:')) return true;
    Linking.openURL(req.url);
    return false;
  }, [url]);

  return (
    <View style={[styles.fill, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {error ? (
        <View style={styles.center}>
          <Text style={[styles.title, { color: c.text }]}>Can't reach BridgeHome</Text>
          <Text style={[styles.body, { color: c.muted }]}>
            Make sure the web app is running on your computer and that your phone is on the same Wi-Fi.{'\n\n'}
            In the bridgehome folder run:{'\n'}npm run dev{'\n\n'}Trying: {url}
          </Text>
          <Pressable style={[styles.button, { backgroundColor: c.button }]} onPress={() => { setError(null); web.current?.reload(); }}>
            <Text style={[styles.buttonText, { color: c.buttonText }]}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
      <WebView
        ref={web}
        source={{ uri: url }}
        style={[styles.fill, { backgroundColor: c.bg }, error ? styles.hidden : null]}
        originWhitelist={['*']}
        onMessage={onMessage}
        onNavigationStateChange={nav => setCanGoBack(nav.canGoBack)}
        onShouldStartLoadWithRequest={onShouldStart}
        onError={e => setError(e.nativeEvent.description)}
        onHttpError={e => e.nativeEvent.statusCode >= 500 && setError(`HTTP ${e.nativeEvent.statusCode}`)}
        onContentProcessDidTerminate={() => web.current?.reload()}
        onRenderProcessGone={() => web.current?.reload()}
        startInLoadingState
        renderLoading={() => <View style={[styles.loading, { backgroundColor: c.bg }]}><ActivityIndicator color={c.text} /></View>}
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        allowsInlineMediaPlayback
        mediaCapturePermissionGrantType="grant"
        setSupportMultipleWindows={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        webviewDebuggingEnabled={__DEV__}
        bounces={false}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <BridgeHome />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { display: 'none' },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  title: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  buttonText: { fontSize: 15, fontWeight: '600' },
});
