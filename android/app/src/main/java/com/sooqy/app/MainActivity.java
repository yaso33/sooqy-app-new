package com.sooqy.app;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "SooQy";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // تعطيل Autofill على WebView:
        // خدمة Autofill في بعض أجهزة Android (Realme/Oppo/Xiaomi...) تستخرج بنية العرض
        // عند التركيز على حقل إدخال وتشلّ خيط WebView بالكامل (تجمّد + ANR + إعادة تشغيل).
        // هذا الإصلاح يمنع ذلك دون التأثير على إدخال المستخدم.
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);
            Log.i(TAG, "Autofill disabled on WebView");
        }

        Log.i(TAG, "MainActivity onCreate (instanceId=" + System.identityHashCode(this) + ")");
    }
}