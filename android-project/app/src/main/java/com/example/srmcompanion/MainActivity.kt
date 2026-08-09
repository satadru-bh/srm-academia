package com.example.srmcompanion

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.fragment.app.FragmentActivity
import androidx.biometric.BiometricPrompt
import androidx.biometric.BiometricManager

class MainActivity : FragmentActivity() {
    private lateinit var webView: WebView
    private val CHANNEL_ID = "srm_companion_notifications"

    class AndroidWidgetBridge(private val context: Context) {
        @JavascriptInterface
        fun updateWidgetData(
            attendanceJson: String,
            timetableJson: String,
            marksJson: String,
            activeTheme: String,
            todayDayOrder: String,
            tomorrowDayOrder: String,
            plannerJson: String
        ) {
            val prefs = context.getSharedPreferences("srm_widget_prefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("attendance_data", attendanceJson)
                .putString("timetable_data", timetableJson)
                .putString("marks_data", marksJson)
                .putString("active_theme", activeTheme)
                .putString("today_day_order", todayDayOrder)
                .putString("tomorrow_day_order", tomorrowDayOrder)
                .putString("planner_data", plannerJson)
                .apply()
        }
    }

    class AndroidNotificationBridge(private val activity: MainActivity) {
        @JavascriptInterface
        fun sendNativeNotification(title: String, message: String, tag: String) {
            activity.runOnUiThread {
                activity.postNativeNotification(title, message, tag)
            }
        }

        @JavascriptInterface
        fun requestPermission() {
            activity.runOnUiThread {
                activity.requestNotificationPermission()
            }
        }

        @JavascriptInterface
        fun isPermissionGranted(): Boolean {
            return activity.isNotificationPermissionGranted()
        }
    }

    class AndroidBiometricBridge(private val activity: MainActivity) {
        @JavascriptInterface
        fun isBiometricAvailable(): Boolean {
            val biometricManager = BiometricManager.from(activity)
            return biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK or BiometricManager.Authenticators.DEVICE_CREDENTIAL) == BiometricManager.BIOMETRIC_SUCCESS
        }

        @JavascriptInterface
        fun promptBiometric(requestId: String, title: String) {
            activity.runOnUiThread {
                activity.showBiometricPrompt(requestId, title)
            }
        }
    }


    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        createNotificationChannel()
        requestNotificationPermission()

        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        window.decorView.setBackgroundColor(Color.TRANSPARENT)

        webView = WebView(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            layoutParams = ViewGroup.MarginLayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        setContentView(webView)

        ViewCompat.setOnApplyWindowInsetsListener(webView) { v, insets ->
            val params = v.layoutParams as ViewGroup.MarginLayoutParams
            params.leftMargin = 0
            params.rightMargin = 0
            params.topMargin = 0
            params.bottomMargin = 0
            v.layoutParams = params
            insets
        }

        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = false
            displayZoomControls = false
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.addJavascriptInterface(AndroidNotificationBridge(this), "AndroidNotificationBridge")
        webView.addJavascriptInterface(AndroidWidgetBridge(this), "AndroidWidgetBridge")
        webView.addJavascriptInterface(AndroidBiometricBridge(this), "AndroidBiometricBridge")

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }

        webView.loadUrl("file:///android_asset/www/index.html")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (::webView.isInitialized && webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "SRM Academia+ Notifications"
            val descriptionText = "Upcoming class alerts, attendance warnings and schedule reminders"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                enableVibration(true)
                enableLights(true)
                lightColor = Color.GREEN
            }
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun isNotificationPermissionGranted(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                this,
                android.Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!isNotificationPermissionGranted()) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                    1001
                )
            }
        }
    }

    fun postNativeNotification(title: String, message: String, tag: String) {
        if (!isNotificationPermissionGranted()) {
            requestNotificationPermission()
        }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            intent, 
            PendingIntent.FLAG_IMMUTABLE
        )
        builder.setContentIntent(pendingIntent)

        try {
            with(NotificationManagerCompat.from(this)) {
                notify(tag.hashCode(), builder.build())
            }
        } catch (e: SecurityException) {
            e.printStackTrace()
        }
    }

    fun showBiometricPrompt(requestId: String, title: String) {
        val executor = ContextCompat.getMainExecutor(this)
        val biometricPrompt = BiometricPrompt(this, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    webView.evaluateJavascript("window.onBiometricError('$requestId', '${errString}')", null)
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    webView.evaluateJavascript("window.onBiometricSuccess('$requestId')", null)
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    // Prompt handles failure UI automatically. 
                    // Do not reject immediately so user can try again.
                }
            })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle("Confirm your identity to log in")
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK or BiometricManager.Authenticators.DEVICE_CREDENTIAL)
            .build()

        biometricPrompt.authenticate(promptInfo)
    }
}
