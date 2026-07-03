package com.afin.collect;

import android.Manifest;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.webkit.ServiceWorkerClientCompat;
import androidx.webkit.ServiceWorkerControllerCompat;
import androidx.webkit.WebViewFeature;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final String PREFS = "afin";
    private static final String KEY_URL = "server_url";

    private WebView web;
    private ProgressBar progress;
    private View errorView;
    private SharedPreferences prefs;

    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraOutputUri;
    private PermissionRequest pendingWebPermission;

    private ActivityResultLauncher<Intent> fileChooserLauncher;
    private ActivityResultLauncher<String[]> permissionLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        web = findViewById(R.id.web);
        progress = findViewById(R.id.progress);
        errorView = findViewById(R.id.errorView);
        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        findViewById(R.id.retry).setOnClickListener(v -> {
            hideError();
            web.reload();
        });
        findViewById(R.id.changeServer).setOnClickListener(v -> promptForServer(false));

        registerLaunchers();
        configureWebView();

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
            return;
        }

        String url = prefs.getString(KEY_URL, null);
        if (url == null || url.isEmpty()) {
            promptForServer(true);
        } else {
            ensureAppPermissions();
            web.loadUrl(url);
        }
    }

    private void registerLaunchers() {
        fileChooserLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (filePathCallback == null) return;
                    Uri[] uris = null;
                    if (result.getResultCode() == RESULT_OK) {
                        Intent data = result.getData();
                        if (data != null && data.getClipData() != null) {
                            int n = data.getClipData().getItemCount();
                            uris = new Uri[n];
                            for (int i = 0; i < n; i++) {
                                uris[i] = data.getClipData().getItemAt(i).getUri();
                            }
                        } else if (data != null && data.getData() != null) {
                            uris = new Uri[]{data.getData()};
                        } else if (cameraOutputUri != null) {
                            uris = new Uri[]{cameraOutputUri};
                        }
                    }
                    filePathCallback.onReceiveValue(uris);
                    filePathCallback = null;
                    cameraOutputUri = null;
                });

        permissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                result -> {
                    if (pendingWebPermission != null) {
                        PermissionRequest r = pendingWebPermission;
                        pendingWebPermission = null;
                        r.grant(r.getResources());
                    }
                });
    }

    @SuppressWarnings("deprecation")
    private void configureWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setGeolocationEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setUserAgentString(s.getUserAgentString() + " AFIN-Android");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, true);

        if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)) {
            ServiceWorkerControllerCompat.getInstance()
                    .setServiceWorkerClient(new ServiceWorkerClientCompat() {
                        @Override
                        public android.webkit.WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                            return null;
                        }
                    });
        }

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if (scheme == null || scheme.equals("http") || scheme.equals("https")) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) {
                    showError();
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progress.setProgress(newProgress);
                progress.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                try {
                    launchFileChooser(params);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                boolean granted = hasPermission(Manifest.permission.ACCESS_FINE_LOCATION);
                if (!granted) {
                    ensureAppPermissions();
                }
                callback.invoke(origin, granted, false);
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    ArrayList<String> needed = new ArrayList<>();
                    for (String res : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)
                                && !hasPermission(Manifest.permission.CAMERA)) {
                            needed.add(Manifest.permission.CAMERA);
                        }
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)
                                && !hasPermission(Manifest.permission.RECORD_AUDIO)) {
                            needed.add(Manifest.permission.RECORD_AUDIO);
                        }
                    }
                    if (needed.isEmpty()) {
                        request.grant(request.getResources());
                    } else {
                        pendingWebPermission = request;
                        permissionLauncher.launch(needed.toArray(new String[0]));
                    }
                });
            }
        });

        web.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            if (!url.startsWith("http")) {
                Toast.makeText(this, R.string.download_failed, Toast.LENGTH_SHORT).show();
                return;
            }
            try {
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                req.setMimeType(mimetype);
                String cookie = CookieManager.getInstance().getCookie(url);
                if (cookie != null) req.addRequestHeader("cookie", cookie);
                req.addRequestHeader("User-Agent", userAgent);
                String name = URLUtil.guessFileName(url, contentDisposition, mimetype);
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                dm.enqueue(req);
                Toast.makeText(this, R.string.downloading, Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, R.string.download_failed, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void launchFileChooser(WebChromeClient.FileChooserParams params) {
        boolean wantsImage = false;
        boolean wantsVideo = false;
        for (String type : params.getAcceptTypes()) {
            if (type == null) continue;
            String t = type.toLowerCase(Locale.ROOT);
            if (t.contains("image")) wantsImage = true;
            if (t.contains("video")) wantsVideo = true;
        }

        ArrayList<Intent> captureIntents = new ArrayList<>();
        if (wantsImage && hasPermission(Manifest.permission.CAMERA)) {
            Intent capture = imageCaptureIntent();
            if (capture != null) captureIntents.add(capture);
        }
        if (wantsVideo && hasPermission(Manifest.permission.CAMERA)) {
            captureIntents.add(new Intent(MediaStore.ACTION_VIDEO_CAPTURE));
        }

        Intent content = params.createIntent();
        Intent chooser = Intent.createChooser(content, getString(R.string.choose_file));
        if (!captureIntents.isEmpty()) {
            chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, captureIntents.toArray(new Intent[0]));
        }
        fileChooserLauncher.launch(chooser);
    }

    private Intent imageCaptureIntent() {
        try {
            File dir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
            String stamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.ROOT).format(new java.util.Date());
            File photo = File.createTempFile("afin_" + stamp, ".jpg", dir);
            cameraOutputUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", photo);
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraOutputUri);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            return intent;
        } catch (Exception e) {
            cameraOutputUri = null;
            return null;
        }
    }

    private void ensureAppPermissions() {
        ArrayList<String> ask = new ArrayList<>();
        if (!hasPermission(Manifest.permission.CAMERA)) ask.add(Manifest.permission.CAMERA);
        if (!hasPermission(Manifest.permission.RECORD_AUDIO)) ask.add(Manifest.permission.RECORD_AUDIO);
        if (!hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) ask.add(Manifest.permission.ACCESS_FINE_LOCATION);
        if (!ask.isEmpty()) {
            permissionLauncher.launch(ask.toArray(new String[0]));
        }
    }

    private boolean hasPermission(String permission) {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED;
    }

    private void promptForServer(boolean firstRun) {
        final EditText input = new EditText(this);
        input.setInputType(android.text.InputType.TYPE_TEXT_VARIATION_URI);
        input.setHint(R.string.server_hint);
        String current = prefs.getString(KEY_URL, "https://");
        input.setText(current);
        input.setSelection(input.getText().length());

        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        input.setPadding(pad, pad, pad, pad);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle(R.string.server_title)
                .setMessage(R.string.server_message)
                .setView(input)
                .setCancelable(!firstRun)
                .setPositiveButton(R.string.save, null)
                .setNegativeButton(firstRun ? null : getString(R.string.cancel), null)
                .create();

        dialog.setOnShowListener(d ->
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
                    String url = normalizeUrl(input.getText().toString());
                    if (url == null) {
                        Toast.makeText(this, R.string.invalid_url, Toast.LENGTH_SHORT).show();
                        return;
                    }
                    prefs.edit().putString(KEY_URL, url).apply();
                    dialog.dismiss();
                    hideError();
                    ensureAppPermissions();
                    web.loadUrl(url);
                }));
        dialog.show();
    }

    private String normalizeUrl(String raw) {
        String url = raw.trim();
        if (url.isEmpty()) return null;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        return URLUtil.isValidUrl(url) ? url : null;
    }

    private void showError() {
        errorView.setVisibility(View.VISIBLE);
        web.setVisibility(View.GONE);
        progress.setVisibility(View.GONE);
    }

    private void hideError() {
        errorView.setVisibility(View.GONE);
        web.setVisibility(View.VISIBLE);
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.main, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.action_refresh) {
            hideError();
            web.reload();
            return true;
        }
        if (id == R.id.action_server) {
            promptForServer(false);
            return true;
        }
        if (id == R.id.action_about) {
            new AlertDialog.Builder(this)
                    .setTitle(R.string.app_name)
                    .setMessage(R.string.about_message)
                    .setPositiveButton(android.R.string.ok, null)
                    .show();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    public void onBackPressed() {
        if (errorView.getVisibility() != View.VISIBLE && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }
}
