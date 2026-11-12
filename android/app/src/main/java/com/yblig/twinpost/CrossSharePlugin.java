package com.yblig.twinpost;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Picks videos (with a persistable read grant so drafts survive restarts) and hands
 * them to a specific app (YouTube, TikTok…) through ACTION_SEND.
 */
@CapacitorPlugin(name = "CrossShare")
public class CrossSharePlugin extends Plugin {

    @PluginMethod
    public void pickVideo(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("video/*");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try {
            startActivityForResult(call, intent, "onPicked");
        } catch (ActivityNotFoundException e) {
            call.reject("No file picker available");
        }
    }

    @ActivityCallback
    private void onPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject r = new JSObject();
            r.put("cancelled", true);
            call.resolve(r);
            return;
        }
        Uri uri = result.getData().getData();
        try {
            getContext().getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) { /* some providers don't support persistable grants */ }

        // Metadata off the UI thread: thumbnails can take a moment for big files.
        new Thread(() -> {
            try {
                call.resolve(describe(uri));
            } catch (Exception e) {
                call.reject("Could not read the video: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void describe(PluginCall call) {
        String s = call.getString("uri");
        if (s == null) { call.reject("uri required"); return; }
        new Thread(() -> {
            try { call.resolve(describe(Uri.parse(s))); }
            catch (Exception e) { call.reject("Video not accessible"); }
        }).start();
    }

    private JSObject describe(Uri uri) throws Exception {
        ContentResolver cr = getContext().getContentResolver();
        JSObject r = new JSObject();
        r.put("uri", uri.toString());
        r.put("mime", cr.getType(uri));

        try (Cursor c = cr.query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int n = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int z = c.getColumnIndex(OpenableColumns.SIZE);
                if (n >= 0) r.put("name", c.getString(n));
                if (z >= 0 && !c.isNull(z)) r.put("size", c.getLong(z));
            }
        }

        MediaMetadataRetriever mmr = new MediaMetadataRetriever();
        try {
            mmr.setDataSource(getContext(), uri);
            long dur = parseLong(mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION));
            int w = (int) parseLong(mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH));
            int h = (int) parseLong(mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));
            int rot = (int) parseLong(mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION));
            if (rot == 90 || rot == 270) { int t = w; w = h; h = t; }
            r.put("durationMs", dur);
            r.put("width", w);
            r.put("height", h);

            Bitmap frame = mmr.getFrameAtTime(Math.min(1_000_000L, dur * 500L), MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
            if (frame != null) {
                int target = 360;
                float scale = Math.min(1f, target / (float) Math.max(frame.getWidth(), frame.getHeight()));
                Bitmap small = Bitmap.createScaledBitmap(frame, Math.max(1, Math.round(frame.getWidth() * scale)),
                        Math.max(1, Math.round(frame.getHeight() * scale)), true);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                small.compress(Bitmap.CompressFormat.JPEG, 78, out);
                r.put("thumbnail", "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
            }
        } finally {
            try { mmr.release(); } catch (Exception ignored) { }
        }
        return r;
    }

    private static long parseLong(String s) {
        try { return s == null ? 0 : Long.parseLong(s.trim()); } catch (Exception e) { return 0; }
    }

    @PluginMethod
    public void uriOk(PluginCall call) {
        String s = call.getString("uri");
        JSObject r = new JSObject();
        boolean ok = false;
        if (s != null) {
            try (InputStream in = getContext().getContentResolver().openInputStream(Uri.parse(s))) {
                ok = in != null;
            } catch (Exception ignored) { }
        }
        r.put("ok", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void installed(PluginCall call) {
        JSArray pkgs = call.getArray("packages");
        JSObject r = new JSObject();
        PackageManager pm = getContext().getPackageManager();
        try {
            for (int i = 0; i < pkgs.length(); i++) {
                String p = pkgs.getString(i);
                boolean has;
                try {
                    if (Build.VERSION.SDK_INT >= 33) pm.getPackageInfo(p, PackageManager.PackageInfoFlags.of(0));
                    else pm.getPackageInfo(p, 0);
                    has = true;
                } catch (PackageManager.NameNotFoundException e) {
                    has = false;
                }
                r.put(p, has);
            }
        } catch (Exception e) {
            call.reject("bad packages");
            return;
        }
        call.resolve(r);
    }

    @PluginMethod
    public void shareVideo(PluginCall call) {
        String s = call.getString("uri");
        String pkg = call.getString("package");
        String text = call.getString("text", "");
        String subject = call.getString("subject", "");
        String chooserTitle = call.getString("chooserTitle", "Share video");
        if (s == null) { call.reject("uri required"); return; }
        Uri uri = Uri.parse(s);

        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("video/*");
        send.putExtra(Intent.EXTRA_STREAM, uri);
        if (text != null && !text.isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);
        if (subject != null && !subject.isEmpty()) send.putExtra(Intent.EXTRA_TITLE, subject);
        if (subject != null && !subject.isEmpty()) send.putExtra(Intent.EXTRA_SUBJECT, subject);
        send.setClipData(ClipData.newRawUri("video", uri));
        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        JSObject r = new JSObject();
        try {
            if (pkg != null && !pkg.isEmpty()) {
                send.setPackage(pkg);
                getActivity().startActivity(send);
                r.put("via", "app");
            } else {
                Intent chooser = Intent.createChooser(send, chooserTitle);
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(chooser);
                r.put("via", "chooser");
            }
            call.resolve(r);
        } catch (ActivityNotFoundException e) {
            // App not installed or doesn't accept video shares: fall back to the chooser.
            try {
                send.setPackage(null);
                Intent chooser = Intent.createChooser(send, chooserTitle);
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(chooser);
                r.put("via", "chooser");
                call.resolve(r);
            } catch (Exception e2) {
                call.reject("Could not open any app to share this video");
            }
        } catch (SecurityException e) {
            call.reject("Lost access to this video — pick it again");
        }
    }

    @PluginMethod
    public void openApp(PluginCall call) {
        String pkg = call.getString("package");
        Intent i = pkg == null ? null : getContext().getPackageManager().getLaunchIntentForPackage(pkg);
        if (i == null) { call.reject("not installed"); return; }
        getActivity().startActivity(i);
        call.resolve();
    }
}
