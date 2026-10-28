package com.tcs.lms;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.media.AudioManager;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "TCS_LMS_WEBVIEW";
    private static final int RECORD_AUDIO_REQUEST_CODE = 1001;

    private PermissionRequest pendingPermissionRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        AudioManager audioManager =
        (AudioManager) getSystemService(AUDIO_SERVICE);

        if (audioManager != null) {
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            audioManager.setSpeakerphoneOn(true);

            Log.d(
                TAG,
                "Audio mode configured: MODE_IN_COMMUNICATION"
            );
        }
        if (bridge == null || bridge.getWebView() == null) {
            Log.e(TAG, "Capacitor WebView is not available.");
            return;
        }

        bridge.getWebView().setWebChromeClient(new WebChromeClient() {

            @Override
            public void onPermissionRequest(
                    final PermissionRequest request) {

                Log.d(
                    TAG,
                    "WebView permission request: origin="
                        + request.getOrigin()
                        + " resources="
                        + java.util.Arrays.toString(
                            request.getResources()
                        )
                );

                runOnUiThread(() -> {

                    boolean audioRequested = false;

                    for (String resource : request.getResources()) {

                        if (
                            PermissionRequest.RESOURCE_AUDIO_CAPTURE
                                .equals(resource)
                        ) {
                            audioRequested = true;
                            break;
                        }
                    }

                    if (!audioRequested) {
                        Log.d(
                            TAG,
                            "No audio capture requested. Denying."
                        );

                        request.deny();
                        return;
                    }

                    if (
                        ContextCompat.checkSelfPermission(
                            MainActivity.this,
                            Manifest.permission.RECORD_AUDIO
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {

                        Log.d(
                            TAG,
                            "Android RECORD_AUDIO already granted."
                        );

                        request.grant(
                            new String[] {
                                PermissionRequest
                                    .RESOURCE_AUDIO_CAPTURE
                            }
                        );

                    } else {

                        Log.d(
                            TAG,
                            "Requesting Android RECORD_AUDIO permission."
                        );

                        pendingPermissionRequest = request;

                        ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[] {
                                Manifest.permission.RECORD_AUDIO
                            },
                            RECORD_AUDIO_REQUEST_CODE
                        );
                    }
                });
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults) {

        super.onRequestPermissionsResult(
            requestCode,
            permissions,
            grantResults
        );

        if (requestCode != RECORD_AUDIO_REQUEST_CODE) {
            return;
        }

        if (
            grantResults.length > 0 &&
            grantResults[0] == PackageManager.PERMISSION_GRANTED
        ) {

            Log.d(
                TAG,
                "Android RECORD_AUDIO permission granted."
            );

            if (pendingPermissionRequest != null) {

                pendingPermissionRequest.grant(
                    new String[] {
                        PermissionRequest
                            .RESOURCE_AUDIO_CAPTURE
                    }
                );

                pendingPermissionRequest = null;

                Log.d(
                    TAG,
                    "WebView audio capture permission granted."
                );
            }

        } else {

            Log.d(
                TAG,
                "Android RECORD_AUDIO permission denied."
            );

            if (pendingPermissionRequest != null) {

                pendingPermissionRequest.deny();
                pendingPermissionRequest = null;
            }
        }
    }
}