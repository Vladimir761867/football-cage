package io.github.vladimir761867.footballcage;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedDispatcher;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

public final class GameActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/index.html";
    private static final Pattern LOCAL_PATH = Pattern.compile(
        "/(?:(?:index|privacy)\\.html|(?:assets|css|js)/[A-Za-z0-9_.-]+)");
    private static final Map<String,String> DOCUMENT_HEADERS;
    static {
        Map<String,String> headers = new HashMap<>();
        headers.put("Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                + "img-src 'self' data:; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'");
        headers.put("X-Content-Type-Options", "nosniff");
        DOCUMENT_HEADERS = Collections.unmodifiableMap(headers);
    }
    private WebView game;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(27, 31, 39));
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        game = new WebView(this);
        game.setBackgroundColor(Color.rgb(27, 31, 39));
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setBlockNetworkLoads(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        game.setWebViewClient(new LocalClient());
        root.addView(game, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.requestApplyInsets();
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::back);
        }
        game.loadUrl(START);
    }

    private static boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
            && uri.getPort() == -1 && uri.getUserInfo() == null
            && uri.getPath() != null && LOCAL_PATH.matcher(uri.getPath()).matches();
    }

    private final class LocalClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!"GET".equals(request.getMethod()) || !isLocal(uri)) return denied();
            String path = uri.getPath();
            try {
                InputStream data = getAssets().open("web" + path);
                String mime = mimeType(path);
                boolean text = mime.startsWith("text/");
                return new WebResourceResponse(mime, text ? "UTF-8" : null, 200, "OK",
                    DOCUMENT_HEADERS, data);
            } catch (IOException e) {
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), null);
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isLocal(uri) && "GET".equals(request.getMethod())) return false;
            if (request.isForMainFrame() && request.hasGesture()
                && "https".equals(uri.getScheme()) && "github.com".equals(uri.getHost())
                && "/Vladimir761867/football-cage/issues".equals(uri.getPath())) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                catch (ActivityNotFoundException ignored) { /* no external browser */ }
            }
            return true;
        }
    }

    private static WebResourceResponse denied() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", Collections.emptyMap(), null);
    }

    private static String mimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".webp")) return "image/webp";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    private void back() {
        if (game.canGoBack() && game.getUrl() != null && game.getUrl().endsWith("/privacy.html")) {
            game.goBack();
        } else {
            game.evaluateJavascript("typeof window.footballBack === 'function' && window.footballBack()",
                handled -> { if (!"true".equals(handled)) finish(); });
        }
    }

    @Override
    public void onBackPressed() { back(); }

    @Override
    protected void onPause() {
        if (game != null) {
            game.evaluateJavascript("window.footballPause && window.footballPause()", null);
            game.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (game != null) game.onResume();
    }

    @Override
    protected void onDestroy() {
        if (game != null) {
            ((FrameLayout) game.getParent()).removeView(game);
            game.destroy();
        }
        super.onDestroy();
    }
}
