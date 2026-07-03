# AFIN Collect — WebView container, no reflection-sensitive code.
-keepattributes JavascriptInterface
-keep class * extends android.webkit.WebChromeClient { *; }
