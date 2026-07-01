package com.example.arwayfinder

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import com.example.arwayfinder.theme.ARWayfinderTheme

class MainActivity : ComponentActivity() {

  // Launcher to request camera permissions at runtime
  private val requestPermissionLauncher = registerForActivityResult(
    ActivityResultContracts.RequestPermission()
  ) { isGranted: Boolean ->
    if (!isGranted) {
      Toast.makeText(this, "Camera permission is required for AR Navigation scanning", Toast.LENGTH_LONG).show()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    enableEdgeToEdge()

    // Request camera permission on startup if not already granted
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      requestPermissionLauncher.launch(Manifest.permission.CAMERA)
    }

    setContent {
      ARWayfinderTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
          WebViewContainer()
        }
      }
    }
  }
}

@Composable
fun WebViewContainer() {
  val context = LocalContext.current
  AndroidView(
    factory = { ctx ->
      WebView(ctx).apply {
        layoutParams = ViewGroup.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT
        )

        settings.apply {
          javaScriptEnabled = true
          domStorageEnabled = true
          allowFileAccess = false
          allowContentAccess = false
          mediaPlaybackRequiresUserGesture = false
        }

        // WebViewAssetLoader secures assets by mapping local files to https schema
        val assetLoader = WebViewAssetLoader.Builder()
          .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(ctx))
          .build()

        webViewClient = object : WebViewClient() {
          override fun shouldInterceptRequest(
            view: WebView?,
            request: WebResourceRequest
          ): WebResourceResponse? {
            // Intercept appassets domain URLs and serve local assets instead
            return assetLoader.shouldInterceptRequest(request.url)
          }
        }

        webChromeClient = object : WebChromeClient() {
          override fun onPermissionRequest(request: PermissionRequest) {
            // Grant permissions requested by Web APIs (such as getUserMedia camera streams)
            request.grant(request.resources)
          }
        }

        // Load entry file from local assets path
        loadUrl("https://appassets.androidplatform.net/assets/index.html")
      }
    },
    modifier = Modifier.fillMaxSize()
  )
}
