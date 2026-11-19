package com.grip.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
                int statusBarHeight = windowInsets.getInsets(
                    WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
                ).top;
                v.setPadding(0, statusBarHeight, 0, 0);
                return windowInsets;
            });
        }
    }
}
